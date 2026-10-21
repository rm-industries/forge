import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
declare global {
  interface Window {
    CMS_MANUAL_INIT: boolean;
    probeMode: string;
    probeConfig: unknown;
    callbackCalled: boolean;
    unchanged: boolean;
  }
}
const require = createRequire(import.meta.url);
const { chromium } = (await import(
  pathToFileURL(resolve(process.argv[2] ?? 'templates/default/node_modules/playwright/index.mjs')).href
)) as typeof import('playwright-core');
import { defineModel } from '../../content-model/dist/index.js';
import { createSveltiaCollection } from '../../content-model/dist/sveltia.js';
const collection = createSveltiaCollection(
  defineModel({
    name: 'articles',
    label: 'Articles',
    labelSingular: 'Article',
    slug: '{{slug}}',
    folder: 'content/articles',
    extensions: ['md'],
    fields: {
      title: { kind: 'string', required: true, label: 'Title' },
      description: { kind: 'string', required: true, label: 'Description' },
      tags: { kind: 'list', label: 'Tags', items: { kind: 'string', label: 'Tag' }, default: [] },
      draft: { kind: 'boolean', label: 'Draft', default: false },
    },
    body: { name: 'body', label: 'Body', required: true },
  }),
);
const config = {
  load_config_file: false,
  backend: { name: 'github', repo: 'example/example', branch: 'main' },
  media_folder: 'public/assets',
  collections: [collection],
};
const initial =
  '---\ntitle: Compatibility probe\ndescription: Before\ntags:\n  - preserved\ndraft: true\n---\n\n## Body retained\n\nOriginal **body**.\n';
const root = resolve(dirname(require.resolve('@sveltia/cms')), '../dist');
assert.equal(JSON.parse(await readFile(resolve(root, '../package.json'), 'utf8')).version, '0.250.0');
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { channel: process.argv[3] } : {}) });
const server = createServer(async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(await readFile(root + new URL(req.url ?? '/', 'http://localhost').pathname));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const results = [];
try {
  for (const mode of ['metadata', 'raw', 'rich', 'delimiters', 'reject', 'throw', 'native-error']) {
    const input = mode === 'delimiters' ? initial.replace('draft: true\n---', 'draft: true\n...') : initial;
    const scenarioConfig =
      mode === 'delimiters'
        ? { ...config, collections: [{ ...collection, frontmatter_delimiter: ['---', '...'] }] }
        : config;
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(
      ({ mode, config }) => {
        window.CMS_MANUAL_INIT = true;
        window.probeMode = mode;
        window.probeConfig = config;
        Object.defineProperty(window, 'showDirectoryPicker', {
          value: async () => (await navigator.storage.getDirectory()).getDirectoryHandle('probe', { create: true }),
        });
      },
      { mode, config: scenarioConfig },
    );
    await page.route('**/probe', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: `<html><script type="module">import{init,registerCustomFormat}from'/sveltia-cms.mjs';registerCustomFormat('frontmatter','md',{toFile:(data,{serialize})=>{window.callbackData=structuredClone(data);window.callbackCalled=true;if(window.probeMode==='throw')throw Error('Probe callback exception');if(window.probeMode==='reject')return Promise.reject(Error('Probe callback rejection'));if(window.probeMode==='native-error'){return serialize({...data,unsupported:()=>{}});}return serialize(data).then(output=>{window.nativeOutput=output;window.unchanged=JSON.stringify(data)===JSON.stringify(window.callbackData);return output;});}});init({config:window.probeConfig});</script></html>`,
      }),
    );
    await page.goto(origin + '/probe');
    await page.getByRole('button', { name: 'Work with Local Repository' }).waitFor();
    await page.evaluate(async (text) => {
      let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('probe', { create: true });
      await d.getDirectoryHandle('.git', { create: true });
      for (const p of ['content', 'articles']) d = await d.getDirectoryHandle(p, { create: true });
      let w = await (await d.getFileHandle('probe.md', { create: true })).createWritable();
      await w.write(text);
      await w.close();
    }, input);
    await page.getByRole('button', { name: 'Work with Local Repository' }).click();
    await page.getByRole('treeitem', { name: /^Articles\b/ }).click();
    await page.getByRole('row', { name: /Compatibility probe/ }).click();
    const editor = page.getByRole('group', { name: 'Content Editor' });
    await editor.getByRole('textbox', { name: 'Description', exact: true }).fill('After');
    if (mode === 'raw') {
      await editor.getByRole('button', { name: 'Edit in Markdown', exact: true }).click();
      let raw = editor.locator('textarea[id$="-plain-text"]');
      await raw.fill((await raw.inputValue()) + '\nRaw edit retained.\n');
    }
    if (mode === 'rich') {
      const rich = editor.getByRole('textbox', { name: 'Body', exact: true });
      await rich.click();
      await rich.evaluate((el) => {
        let r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        let s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      });
      await page.keyboard.press('Enter');
      await page.keyboard.insertText('Rich edit retained.');
    }
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    const failed = ['reject', 'throw', 'native-error'].includes(mode);
    if (failed) {
      await page
        .getByText(
          mode === 'throw'
            ? 'Probe callback exception'
            : mode === 'reject'
              ? 'Probe callback rejection'
              : 'could not be formatted',
          { exact: false },
        )
        .first()
        .waitFor();
      assert.equal(await editor.getByRole('textbox', { name: 'Description', exact: true }).inputValue(), 'After');
    } else await editor.waitFor({ state: 'hidden' });
    const saved = await page.evaluate(async () => {
      let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('probe');
      for (const p of ['content', 'articles']) d = await d.getDirectoryHandle(p);
      return (await (await d.getFileHandle('probe.md')).getFile()).text();
    });
    assert.equal(await page.evaluate(() => window.callbackCalled), true);
    if (failed) assert.equal(saved, initial);
    else {
      assert.match(saved, /description: After/);
      assert.match(saved, /draft: true/);
      assert.match(saved, /- preserved/);
      assert.match(saved, /Original \*\*body\*\*\./);
      assert.equal(await page.evaluate(() => window.unchanged), true);
      if (mode === 'delimiters') assert.match(saved, /\n\.\.\.\n/);
      if (mode === 'raw' || mode === 'rich')
        assert.match(saved, new RegExp(mode === 'rich' ? 'Rich edit retained' : 'Raw edit retained'));
    }
    if (failed) {
      await page.evaluate(() => {
        window.probeMode = 'metadata';
      });
      await page.getByRole('alertdialog').getByRole('button').last().click();
      await editor.getByRole('button', { name: 'Save', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
    }
    results.push({ mode, passed: true, savedUnchangedOnFailure: failed });
    await page.close();
  }
  console.log(results);
} finally {
  await browser.close();
  server.close();
}
