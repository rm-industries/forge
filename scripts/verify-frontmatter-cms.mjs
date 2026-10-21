import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, expect } from '@playwright/test';
import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';
import { parse } from 'yaml';

import { createSveltiaCollection } from '../packages/content-model/dist/sveltia.js';
import rule, { frontmatterOrderFromModel } from '../packages/markdownlint-frontmatter/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'fixtures/frontmatter-adoption');
const model = {
  name: 'articles',
  label: 'Articles',
  labelSingular: 'Article',
  slug: '{{slug}}',
  folder: 'content/articles',
  fields: {
    title: { kind: 'string', label: 'Title', required: true },
    description: { kind: 'string', label: 'Description' },
    draft: { kind: 'boolean', label: 'Draft' },
  },
  body: { name: 'body', label: 'Body', required: true },
};
const check = (source) =>
  lint({
    strings: { 'article.md': source },
    customRules: [rule],
    config: { default: false, 'forge/frontmatter-order': frontmatterOrderFromModel(model) },
  })['article.md'];
const split = (source) => {
  const [, yaml, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/u);
  return { values: parse(yaml), body };
};

// The reviewed fixture records the whole migration diff, independently of native serialization.
const before = await readFile(join(fixture, 'normalization.before.md'), 'utf8');
const expected = await readFile(join(fixture, 'normalization.after.md'), 'utf8');
assert.ok(check(before).length, 'The fixture must exercise an actual ordering violation');
const fixed = applyFixes(before, check(before));
assert.deepEqual(split(fixed), split(before), 'Ordering must preserve values and exact body bytes');
const temporary = await mkdtemp(join(tmpdir(), 'forge-cms-order-'));
const file = join(temporary, 'article.md');
const format = async (source) => {
  await writeFile(file, source);
  const result = spawnSync(
    process.execPath,
    [join(root, 'node_modules/oxfmt/bin/oxfmt'), '--config', join(root, 'templates/default/oxfmt.config.ts'), file],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return readFile(file, 'utf8');
};
try {
  const normalized = await format(fixed);
  assert.equal(normalized, expected, 'Review the normalization fixture diff before accepting changes');
  assert.deepEqual(split(normalized).values, split(before).values);
  assert.equal(await format(applyFixes(normalized, check(normalized))), normalized);
  assert.deepEqual(check(normalized), []);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const original = '---\ndraft: true\nunknown: keep\ntitle: Native probe\n---\n\nHello **world**.\n';
const config = {
  load_config_file: false,
  output: { omit_empty_optional_fields: true },
  backend: { name: 'test-repo' },
  media_folder: 'media',
  collections: [createSveltiaCollection(model)],
};
const server = http.createServer(async (req, res) => {
  try {
    let data;
    let type = 'text/plain';
    if (req.url === '/') {
      data = `<!doctype html><html><head><link rel="cms-seed-url" href="/seed/manifest.json"></head><body><script>window.CMS_MANUAL_INIT=true;</script><script src="/cms/sveltia-cms.js"></script><script>CMS.init({config:${JSON.stringify(config)}})</script></body></html>`;
      type = 'text/html';
    } else if (req.url === '/seed/manifest.json') {
      data = JSON.stringify({ files: ['content/articles/probe.md'] });
      type = 'application/json';
    } else if (req.url === '/seed/content/articles/probe.md') data = original;
    else if (req.url.startsWith('/cms/') && !req.url.includes('..')) {
      data = await readFile(join(root, 'node_modules/@sveltia/cms/dist', req.url.slice(5)));
      type = 'text/javascript';
    } else {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Content-Type', `${type}; charset=utf-8`);
    res.end(data);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  console.log(`Native CMS browser: Chromium ${browser.version()}`);
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'Start Demo' }).click();
  const readSaved = () =>
    page.evaluate(async () => {
      let directory = await navigator.storage.getDirectory();
      for (const name of ['sveltia-cms-test', 'content', 'articles'])
        directory = await directory.getDirectoryHandle(name);
      return (await (await directory.getFileHandle('probe.md')).getFile()).text();
    });
  const open = async (title) => {
    await page.getByText(title, { exact: true }).click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).waitFor();
  };
  const save = async (fragment) => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(readSaved).toContain(fragment);
    const saved = await readSaved();
    assert.deepEqual(check(saved), []);
    assert.deepEqual(split(saved).values, { title: 'Native metadata saved', draft: true, unknown: 'keep' });
    return saved;
  };
  await open('Native probe');
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Native metadata saved');
  assert.equal(split(await save('Native metadata saved')).body.trim(), 'Hello **world**.');
  await open('Native metadata saved');
  await page.getByRole('button', { name: 'Edit in Markdown', exact: true }).click();
  await page.getByRole('textbox', { name: 'Body', exact: true }).fill('Raw **bold** and [link](https://example.com).');
  assert.equal(split(await save('Raw **bold**')).body.trim(), 'Raw **bold** and [link](https://example.com).');
  await open('Native metadata saved');
  const rich = page.getByRole('textbox', { name: 'Body', exact: true });
  await rich.fill('Rich editor native body.');
  await rich.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  assert.equal(split(await save('**Rich editor native body.**')).body.trim(), '**Rich editor native body.**');
  console.log('Native CMS metadata, raw and rich-text saves pass model-derived ordering; Oxfmt convergence passed.');
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
