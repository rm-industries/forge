import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type BrowserContext, expect, test as base } from '@playwright/test';

import { resolvePreviewPath as sitePath } from './preview';

const test = base.extend({
  page: async ({ playwright, browserName, baseURL }, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'cms-formatting-'));
    let context: BrowserContext | undefined;
    try {
      context = await playwright[browserName].launchPersistentContext(profile, { baseURL });
      await use(await context.newPage());
    } finally {
      await context?.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});

// WebKit persistent storage is process-shared.
test.describe.configure({ mode: 'serial' });

const cliVersion: string = JSON.parse(readFileSync('node_modules/oxfmt/package.json', 'utf8')).version;
const articleFolder = 'src/content/articles';
const articles = readdirSync(articleFolder, { recursive: true })
  .filter((filename): filename is string => typeof filename === 'string' && filename.endsWith('.md'))
  .map((filename) => ({ filename, source: readFileSync(join(articleFolder, filename), 'utf8') }));
const synthetic = {
  filename: 'formatting-probe.md',
  source: `---\ntitle:   "Formatting probe"\ndraft: false\ntags: [test,formatting]\n---\n\n${'Deliberately unwrapped prose with enough words to require the configured line width. '.repeat(6)}\n\n\`\`\`js\nconst greeting={hello:"world",values:[1,2,3]};\n\`\`\`\n\n\`\`\`yaml\nitems: [one,two,three]\n\`\`\`\n`,
};

function cli(source: string): string {
  return execFileSync('node_modules/.bin/oxfmt', ['--stdin-filepath', 'src/content/articles/formatting-probe.md'], {
    input: source,
    encoding: 'utf8',
  });
}

test('production formatter matches the CLI for articles and supported embeds, without eager workers', async ({
  page,
}) => {
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.goto(sitePath('/admin/'));
  expect(workers).toHaveLength(0);
  const sources = [...articles, synthetic];
  const expected = sources.map(({ source }) => cli(source));
  const result = await page.evaluate(
    async ({ root, sources }) => {
      const formatter = await import(`${root}/index.js`);
      const policy = await fetch(`${root}/policy.json`).then((response) => response.json());
      const output: string[] = [];
      for (const { source, filename } of sources) {
        const formatted = await formatter.format(source, filename, policy);
        if ((await formatter.format(formatted, filename, policy)) !== formatted) throw new Error('Not idempotent');
        output.push(formatted);
      }
      return output;
    },
    { root: sitePath('/admin/formatter').replace(/\/$/, ''), sources },
  );
  expect(result).toEqual(expected);
  expect(workers).toHaveLength(1);
});

test('the deployed worker uses scoped WebAssembly CSP, correct MIME types, and rejects unsafe policy', async ({
  page,
  request,
}) => {
  const root = sitePath('/admin/formatter').replace(/\/$/, '');
  for (const [filename, contentType] of [
    ['index.js', /javascript/],
    ['worker.js', /javascript/],
    ['generated/engine.js', /javascript/],
    ['generated/engine_bg.wasm', /application\/wasm/],
  ] as const) {
    const response = await request.get(`${root}/${filename}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(contentType);
  }
  await page.route(`**${sitePath('/admin/')}*`, async (route) => {
    if (new URL(route.request().url()).pathname !== sitePath('/admin/')) return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy':
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:",
      },
    });
  });
  await page.goto(sitePath('/admin/'));
  const result = await page.evaluate(async (root) => {
    const { format, engine } = await import(`${root}/index.js`);
    const policy = await fetch(`${root}/policy.json`).then((response) => response.json());
    const source = '```html\n<div class="p-4 flex bg-red-500">hello</div>\n```\n';
    const formatted = await format(source, 'probe.md', policy);
    const errors: string[] = [];
    for (const invalid of [
      { ...policy, upstreamVersion: '0.0.0' },
      { ...policy, options: { ...policy.options, unknownOption: true } },
    ]) {
      try {
        await format(source, 'probe.md', invalid);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    return {
      formatted,
      errors,
      tailwind: engine.capabilities.tailwindClassSorting,
      upstreamVersion: engine.upstreamVersion,
    };
  }, root);
  expect(result.formatted).toContain('class="p-4 flex bg-red-500"');
  expect(result.tailwind).toBe(false);
  expect(result.errors).toHaveLength(2);
  expect(result.upstreamVersion).toBe(cliVersion);
  expect(result.errors[0]).toContain(`Oxfmt ${cliVersion} resolved options are required`);
  expect(result.errors[1]).toMatch(/unsupported|unknown/i);
});

const initial = `---
title: Formatting regression
description: Original description
publishedAt: 2026-01-01
tags:
  - preserved
draft: true
customMetadata:
  nested:
    - keep-unknown
---

Original **body**.
`;

for (const mode of [
  'metadata',
  'raw',
  'rich',
  'policy-download',
  'policy-version',
  'policy-config',
  'module',
  'worker',
  'wasm',
  'trap',
]) {
  test(`real CMS ${mode} save retains metadata, edits, and retry`, async ({ page }) => {
    test.setTimeout(90000);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        value: async () => (await navigator.storage.getDirectory()).getDirectoryHandle('cms-test', { create: true }),
      });
    });
    await page.route('https://*.github.com/**', (route) => route.abort());
    const workers: string[] = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    await page.goto(sitePath('/admin/'));
    expect(workers).toHaveLength(0);
    const expectedDraft = mode !== 'metadata' && mode !== 'rich';
    await page.evaluate(
      async (source) => {
        const storage = await navigator.storage.getDirectory();
        await storage.removeEntry('cms-test', { recursive: true }).catch(() => {});
        const root = await storage.getDirectoryHandle('cms-test', { create: true });
        await root.getDirectoryHandle('.git', { create: true });
        let directory = root;
        for (const part of ['src', 'content', 'articles'])
          directory = await directory.getDirectoryHandle(part, { create: true });
        const writer = await (
          await directory.getFileHandle('formatting-regression.md', { create: true })
        ).createWritable();
        await writer.write(source);
        await writer.close();
      },
      mode === 'metadata' ? initial.replace('draft: true', 'draft: false') : initial,
    );
    const open = async () => {
      await page.getByRole('button', { name: 'Work with Local Repository' }).click();
      await page.getByRole('treeitem', { name: /^Articles\b/ }).click();
      await page.getByRole('row', { name: /Formatting regression/ }).click();
    };
    const read = () =>
      page.evaluate(async () => {
        let directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('cms-test');
        for (const part of ['src', 'content', 'articles']) directory = await directory.getDirectoryHandle(part);
        return (await (await directory.getFileHandle('formatting-regression.md')).getFile()).text();
      });
    await open();
    const editor = page.getByRole('group', { name: 'Content Editor' });
    const description = editor.getByRole('textbox', { name: 'Description', exact: true });
    await description.fill('Saved description');
    if (mode === 'rich') await editor.getByRole('switch', { name: 'Draft', exact: true }).click();
    let rawBody: string | undefined;
    if (mode === 'raw') {
      await editor.getByRole('button', { name: 'Edit in Markdown', exact: true }).click();
      rawBody = `${'Long article prose retains meaningful words. '.repeat(1000)}\n\n---\n\nAfter delimiter.\n\n\`\`\`js\nconst value={hello:"world"};\n\`\`\`\n\n\`\`\`js\nconst = ;\n\`\`\`\n\n\`\`\`yaml\nitems: [\n\`\`\`\n`;
      await editor.getByRole('textbox', { name: 'Body', exact: true }).fill(rawBody);
    } else if (mode === 'rich') {
      await editor.getByRole('textbox', { name: 'Body', exact: true }).fill('Rich text edit retained.');
    }
    const failure = !['metadata', 'raw', 'rich'].includes(mode);
    const asset = mode.startsWith('policy')
      ? 'policy.json'
      : mode === 'module'
        ? 'index.js*'
        : mode === 'wasm'
          ? 'generated/engine_bg.wasm'
          : mode === 'trap'
            ? 'generated/engine.js'
            : 'worker.js';
    const failurePath = `**/admin/formatter/${asset}`;
    if (failure) {
      await editor.getByRole('button', { name: 'Edit in Markdown', exact: true }).click();
      rawBody = 'Original **body**.\n\nUnsaved body edit retained.\n';
      await editor.getByRole('textbox', { name: 'Body', exact: true }).fill(rawBody);
      await page.route(failurePath, async (route) => {
        if (mode === 'policy-config') {
          const response = await route.fetch();
          const policy = await response.json();
          return route.fulfill({ json: { ...policy, options: { ...policy.options, unknownOption: true } } });
        }
        if (mode === 'policy-version') return route.fulfill({ json: { upstreamVersion: '0.0.0', options: {} } });
        if (mode === 'trap') {
          const response = await route.fetch();
          const body = await response.text();
          const entry = 'export function format(source, options) {';
          expect(body).toContain(entry);
          // Inject an actual unreachable WASM call inside format, after the published worker loads its engine.
          const trap =
            'new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,5,1,1,102,0,0,10,5,1,3,0,0,11]))).exports.f();';
          return route.fulfill({ response, body: body.replace(entry, `${entry}\n${trap}`) });
        }
        return route.abort();
      });
      await editor.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByRole('alertdialog')).toContainText('Article formatting failed');
      if (mode === 'trap') await expect(page.getByRole('alertdialog')).toContainText(/unreachable/i);
      expect(await read()).toBe(initial);
      await page.getByRole('alertdialog').getByRole('button', { name: 'OK', exact: true }).press('Enter');
      await expect(description).toHaveValue('Saved description');
      await expect(editor.getByRole('textbox', { name: 'Body', exact: true })).toHaveValue(rawBody);
      await page.unroute(failurePath);
    }
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).not.toBeVisible();
    const saved = await read();
    expect(saved).toBe(cli(saved));
    expect(saved).toContain('description: Saved description');
    expect(saved).toContain(`draft: ${expectedDraft}`);
    expect(saved).toContain('publishedAt: 2026-01-01');
    expect(saved).toContain('  - preserved');
    expect(saved).toContain('customMetadata:\n  nested:\n    - keep-unknown');
    if (mode === 'raw') {
      expect(saved.match(/Long\s+article\s+prose/g)).toHaveLength(1000);
      expect(saved).toContain('After delimiter.');
      expect(saved).toContain("const value = { hello: 'world' };");
      expect(saved).toContain('```js\nconst = ;\n```');
      expect(saved).toContain('```yaml\nitems: [\n```');
    } else expect(saved).toContain(mode === 'rich' ? 'Rich text edit retained.' : 'Original **body**.');
    if (failure) expect(saved).toContain('Unsaved body edit retained.');
    else expect(workers).toHaveLength(1);
    await page.getByRole('button', { name: 'Show Account Menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Work with Local Repository' })).toBeVisible();
    await page.reload();
    await open();
    await expect(editor.getByRole('switch', { name: 'Draft', exact: true })).toBeChecked({ checked: expectedDraft });
    await description.fill('Second saved description');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).not.toBeVisible();
    expect(await read()).toBe(saved.replace('description: Saved description', 'description: Second saved description'));
  });
}
