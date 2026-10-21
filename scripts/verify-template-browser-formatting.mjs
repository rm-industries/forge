import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'forge-cms-candidate-'));
const site = join(temporary, 'site');
const evidence = resolve(process.env.FORGE_CMS_ARTIFACT_DIR ?? join(temporary, 'evidence'));
await mkdir(evidence, { recursive: true });
const results = [];
const failures = [];
function run(command, args, cwd = site, expectedFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
    env: {
      ...process.env,
      PUBLIC_SITE_URL: args.includes('test:coverage') ? undefined : 'https://example.com/project/',
    },
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if ((result.status !== 0) !== expectedFailure) throw new Error(`${command} ${args.join(' ')} failed: ${output}`);
  return output;
}
const initial = `---\ntitle: Formatting probe\ndescription: Before\npublishedAt: 2026-10-21\ntags:\n  - preserved\ndraft: true\n---\n\n## Body retained\n\nOriginal **body**. A deliberately long paragraph containing ordinary prose to demonstrate wrapping according to the consuming project's actual configuration rather than a formatter-specific policy.\n\n| Name | Value |\n| --- | --- |\n| One | 1 |\n\n\`\`\`ts\nconst x: string="hello";\n\`\`\`\n\n\`\`\`css\na{color:red;margin:0 1px}\n\`\`\`\n`;
const contentPath = ['src', 'content', 'articles'];
const readSaved = async (parts) => {
  let directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('candidate');
  for (const part of parts) directory = await directory.getDirectoryHandle(part);
  return (await (await directory.getFileHandle('probe.md')).getFile()).text();
};
// Replace only the exported formatter's body with unreachable, keeping a valid real module.
function trapFormatter(bytes) {
  const read = (at) => {
    let value = 0,
      shift = 0,
      byte;
    do {
      byte = bytes[at++];
      value |= (byte & 127) << shift;
      shift += 7;
    } while (byte & 128);
    return { value, at };
  };
  const encode = (value) => {
    const output = [];
    do {
      let byte = value & 127;
      value >>>= 7;
      if (value) byte |= 128;
      output.push(byte);
    } while (value);
    return Buffer.from(output);
  };
  const module = new WebAssembly.Module(bytes);
  const importedFunctions = WebAssembly.Module.imports(module).filter((entry) => entry.kind === 'function').length;
  let functionIndex, codeStart, codeEnd, codeBody;
  for (let at = 8; at < bytes.length;) {
    const start = at;
    const id = bytes[at++];
    const length = read(at);
    at = length.at;
    const end = at + length.value;
    if (id === 7) {
      const count = read(at);
      let cursor = count.at;
      for (let n = 0; n < count.value; n++) {
        const size = read(cursor);
        const name = bytes.subarray(size.at, size.at + size.value).toString();
        cursor = size.at + size.value;
        const kind = bytes[cursor++];
        const index = read(cursor);
        cursor = index.at;
        if (kind === 0 && name === 'format') functionIndex = index.value;
      }
    }
    if (id === 10) {
      codeStart = start;
      codeEnd = end;
      const count = read(at);
      let cursor = count.at;
      const chunks = [encode(count.value)];
      for (let n = 0; n < count.value; n++) {
        const size = read(cursor);
        const body =
          n === functionIndex - importedFunctions
            ? Buffer.from([0, 0, 11])
            : bytes.subarray(size.at, size.at + size.value);
        chunks.push(encode(body.length), body);
        cursor = size.at + size.value;
      }
      codeBody = Buffer.concat(chunks);
    }
    at = end;
  }
  assert.ok(Number.isInteger(functionIndex) && codeBody, 'The pinned native formatter export must exist');
  const patched = Buffer.concat([
    bytes.subarray(0, codeStart),
    Buffer.from([10]),
    encode(codeBody.length),
    codeBody,
    bytes.subarray(codeEnd),
  ]);
  assert.doesNotThrow(() => new WebAssembly.Module(patched));
  return patched;
}
let server;
try {
  await cp(join(root, 'templates/default'), site, {
    recursive: true,
    filter: (path) =>
      !['node_modules', 'dist', '.astro', 'coverage', 'test-results', 'playwright-report', '.lighthouseci'].includes(
        path.split('/').at(-1),
      ),
  });
  run('git', ['apply', '--check', join(root, 'experiments/browser-oxfmt/template-candidate.patch')]);
  run('git', ['apply', join(root, 'experiments/browser-oxfmt/template-candidate.patch')]);
  const tarballs = [];
  for (const workspace of ['@rm-industries/content-model', '@rm-industries/browser-oxfmt']) {
    run('npm', ['run', 'build', '--workspace', workspace], root);
    const [pack] = JSON.parse(
      run(
        'npm',
        ['pack', '--json', '--ignore-scripts', '--workspace', workspace, '--pack-destination', temporary],
        root,
      ),
    );
    tarballs.push(join(temporary, pack.filename));
  }
  await writeFile(
    join(evidence, 'install.log'),
    run('npm', ['install', '--ignore-scripts', ...tarballs, '@sveltia/cms@0.250.0']),
  );
  const require = createRequire(join(site, 'package.json'));
  const { resolveBrowserOptions } = await import(
    pathToFileURL(require.resolve('@rm-industries/browser-oxfmt/build')).href
  );
  const { format: reference } = await import(pathToFileURL(require.resolve('oxfmt')).href);
  const policy = await resolveBrowserOptions({
    cwd: site,
    filename: 'src/content/articles/_cms.md',
    requireUniformPolicy: true,
  });
  assert.equal(policy.resolvedOptions.upstreamVersion, '0.72.0');
  const configPath = join(site, 'oxfmt.config.ts');
  const config = await readFile(configPath, 'utf8');
  await writeFile(
    configPath,
    config.replace('defineConfig({', "defineConfig({ overrides: [{files: ['*.md'], options: {printWidth: 80}}],"),
  );
  const rejected = run('npm', ['run', 'build'], site, true);
  assert.match(rejected, /uniform|override/i);
  await writeFile(configPath, config);
  for (const script of ['typecheck', 'test:coverage'])
    await writeFile(join(evidence, `${script.replace(':', '-')}.log`), run('npm', ['run', script]));
  // Capture the real native serialization and simulate a stale deployed policy only in this temporary build.
  const formattingPath = join(site, 'src/integrations/sveltia/formatting.ts');
  await writeFile(
    formattingPath,
    (await readFile(formattingPath, 'utf8')).replace(
      'const native = await serialize(data);',
      'const native = await serialize(data); (globalThis as any).__forgeNative = native;',
    ),
  );
  const astroConfigPath = join(site, 'astro.config.ts');
  await writeFile(
    astroConfigPath,
    (await readFile(astroConfigPath, 'utf8')).replace(
      'JSON.stringify(formatting.resolvedOptions)',
      "'(globalThis.__forgeTestOptions ?? ' + JSON.stringify(formatting.resolvedOptions) + ')'",
    ),
  );
  const cmsConfigPath = join(site, 'src/integrations/sveltia/config.ts');
  await writeFile(
    cmsConfigPath,
    (await readFile(cmsConfigPath, 'utf8')) +
      "\nsveltiaConfig.collections.push({...sveltiaConfig.collections[0]!, name:'delimiter-probes', label:'Delimiter probes', folder:'src/content/delimiter-probes', frontmatter_delimiter:['---','...']});\n",
  );
  await writeFile(join(evidence, 'build.log'), run('npm', ['run', 'build']));
  await writeFile(join(evidence, 'validate-build.log'), run('npm', ['run', 'validate:build']));
  const mime = {
    '.js': 'text/javascript',
    '.wasm': 'application/wasm',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
  };
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      assert.ok(path.startsWith('/project/'));
      const file = resolve(site, 'dist', '.' + path.slice('/project'.length), path.endsWith('/') ? 'index.html' : '');
      assert.ok(file.startsWith(join(site, 'dist') + '/'));
      res.setHeader('Content-Type', mime[extname(file)] ?? 'text/html');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; base-uri 'none'",
      );
      res.end(await readFile(file));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browsers = await import(
    pathToFileURL(process.env.PLAYWRIGHT_MODULE ?? join(site, 'node_modules/playwright/index.mjs')).href
  );
  for (const name of ['chromium', 'webkit', 'firefox']) {
    let browser;
    let activePage;
    let activeContext;
    const browserErrors = [];
    try {
      if (name !== 'webkit')
        browser = await browsers[name].launch({
          headless: true,
          ...(name === 'chromium' && process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {}),
        });
      for (const scenario of [
        'metadata',
        'raw',
        'rich',
        'delimiters',
        'large',
        'missing',
        'worker',
        'trap',
        'version',
        'configuration',
      ]) {
        // WebKit's ephemeral profiles cannot provide the local repository's browser file storage.
        const context =
          name === 'webkit'
            ? await browsers.webkit.launchPersistentContext(await mkdtemp(join(temporary, 'webkit-profile-')), {
                headless: true,
              })
            : await browser.newContext();
        activeContext = context;
        const version = context.browser()?.version();
        assert.ok(version, 'Record the actual browser engine version');
        const page = await context.newPage();
        activePage = page;
        page.on('console', (message) => {
          if (message.type() === 'error') browserErrors.push(message.text());
        });
        page.setDefaultTimeout(25000);
        const parts = scenario === 'delimiters' ? ['src', 'content', 'delimiter-probes'] : contentPath;
        let input = scenario === 'delimiters' ? initial.replace('draft: true\n---', 'draft: true\n...') : initial;
        if (scenario === 'large')
          input += '\nA large paragraph with ordinary prose and **retained content**.\n'.repeat(2000);
        const failure = ['missing', 'worker', 'trap', 'version', 'configuration'].includes(scenario);
        await page.addInitScript(
          ({ policy, scenario }) => {
            Object.defineProperty(window, 'showDirectoryPicker', {
              value: async () =>
                (await navigator.storage.getDirectory()).getDirectoryHandle('candidate', { create: true }),
            });
            if (scenario === 'version') window.__forgeTestOptions = { ...policy, upstreamVersion: '0.71.0' };
            if (scenario === 'configuration')
              window.__forgeTestOptions = { ...policy, options: { ...policy.options, printWidth: 9999 } };
          },
          { policy: policy.resolvedOptions, scenario },
        );
        let wasmMime = false;
        page.on('response', (response) => {
          if (
            /\/engine_bg[^/]*\.wasm$/.test(response.url()) &&
            response.headers()['content-type'] === 'application/wasm'
          )
            wasmMime = true;
        });
        if (scenario === 'missing')
          await page.route('**/engine_bg*.wasm', (route) => route.fulfill({ status: 404, body: 'missing' }));
        if (scenario === 'worker')
          await page.route('**/worker-*.js', (route) =>
            route.fulfill({
              contentType: 'text/javascript',
              body: 'throw new Error("Intentional worker deployment failure");',
            }),
          );
        if (scenario === 'trap')
          await page.route('**/engine_bg*.wasm', async (route) => {
            const response = await route.fetch();
            await route.fulfill({ contentType: 'application/wasm', body: trapFormatter(await response.body()) });
          });
        await page.goto(origin + '/project/admin/');
        await page.getByRole('button', { name: 'Work with Local Repository' }).waitFor();
        await page.evaluate(
          async ({ text, parts }) => {
            let directory = await (
              await navigator.storage.getDirectory()
            ).getDirectoryHandle('candidate', { create: true });
            await directory.getDirectoryHandle('.git', { create: true });
            for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
            const writer = await (await directory.getFileHandle('probe.md', { create: true })).createWritable();
            await writer.write(text);
            await writer.close();
          },
          { text: input, parts },
        );
        await page.getByRole('button', { name: 'Work with Local Repository' }).click();
        await page
          .getByRole('treeitem', { name: scenario === 'delimiters' ? /^Delimiter probes\b/ : /^Articles\b/ })
          .click();
        await page.getByRole('row', { name: /Formatting probe/ }).click();
        const editor = page.getByRole('group', { name: 'Content Editor' });
        await editor.getByRole('textbox', { name: 'Description', exact: true }).fill('After');
        if (scenario === 'raw' || failure) {
          await editor.getByRole('button', { name: 'Edit in Markdown', exact: true }).click();
          const raw = editor.locator('textarea[id$="-plain-text"]');
          await raw.fill(
            (await raw.inputValue()) + (failure ? '\nUnsaved failure body retained.\n' : '\nRaw edit retained.\n'),
          );
        }
        if (scenario === 'rich') {
          const rich = editor.getByRole('textbox', { name: 'Body', exact: true });
          await rich.click();
          await rich.evaluate((element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          });
          await page.keyboard.press('Enter');
          await page.keyboard.insertText('Rich edit retained.');
        }
        if (scenario === 'large')
          await page.evaluate(() => {
            window.__forgeTicks = 0;
            window.__forgeTimer = setInterval(() => window.__forgeTicks++, 0);
          });
        await editor.getByRole('button', { name: 'Save', exact: true }).click();
        if (failure) {
          await page
            .getByRole('alertdialog')
            .getByText(/Formatting failed/)
            .waitFor();
          assert.equal(await page.evaluate(readSaved, parts), input);
          assert.equal(await editor.getByRole('textbox', { name: 'Description', exact: true }).inputValue(), 'After');
          assert.match(
            await editor.locator('textarea[id$="-plain-text"]').inputValue(),
            /Unsaved failure body retained/,
          );
          await page.unrouteAll();
          await page.evaluate(() => {
            delete window.__forgeTestOptions;
          });
          await page.getByRole('alertdialog').getByRole('button').last().click();
          await editor.getByRole('button', { name: 'Save', exact: true }).click();
        }
        await editor.waitFor({ state: 'hidden' });
        const saved = await page.evaluate(readSaved, parts);
        const native = await page.evaluate(() => window.__forgeNative);
        const expected = await reference('article.md', native, policy.resolvedOptions.options);
        assert.deepEqual(expected.errors, []);
        assert.equal(saved, expected.code);
        assert.match(saved, /Original \*\*body\*\*\./);
        assert.match(saved, /description: After/);
        if (failure) assert.match(saved, /Unsaved failure body retained/);
        const head = saved.slice(4, saved.indexOf(scenario === 'delimiters' ? '\n...\n' : '\n---\n'));
        assert.deepEqual(parse(head), {
          title: 'Formatting probe',
          description: 'After',
          publishedAt: '2026-10-21',
          tags: ['preserved'],
          draft: true,
        });
        if (scenario === 'raw' || scenario === 'rich')
          assert.match(saved, new RegExp(scenario === 'raw' ? 'Raw edit retained' : 'Rich edit retained'));
        if (scenario === 'large') {
          assert.ok((await page.evaluate(() => window.__forgeTicks)) > 0);
          await page.evaluate(() => clearInterval(window.__forgeTimer));
          assert.match(saved, /retained content/);
        }
        if (['metadata', 'raw', 'rich'].includes(scenario)) {
          for (const description of ['Again', 'After']) {
            await page.getByRole('row', { name: /Formatting probe/ }).click();
            await editor.getByRole('textbox', { name: 'Description', exact: true }).fill(description);
            await editor.getByRole('button', { name: 'Save', exact: true }).click();
            await editor.waitFor({ state: 'hidden' });
          }
          assert.equal(await page.evaluate(readSaved, parts), saved);
        }
        assert.ok(wasmMime, 'The actual self-hosted WASM response must have its supported MIME type');
        const result = { browser: name, version, scenario, passed: true, recovered: failure };
        results.push(result);
        console.log(JSON.stringify(result));
        await context.close();
        activeContext = undefined;
      }
    } catch (error) {
      await activePage?.screenshot({ path: join(evidence, `${name}-failure.png`), fullPage: true }).catch(() => {});
      failures.push({ browser: name, message: String(error) });
      console.error(`${name}: ${String(error)}`);
    } finally {
      await writeFile(join(evidence, `${name}-console.log`), browserErrors.join('\n'));
      await activeContext?.close();
      await browser?.close();
    }
  }
  await writeFile(join(evidence, 'results.json'), JSON.stringify({ results, failures }, null, 2));
  assert.deepEqual(failures, [], `Candidate browser failures; evidence retained at ${evidence}`);
  console.log(`Gated candidate passed ${results.length} actual CMS save scenarios`);
  await rm(temporary, { recursive: true, force: true });
} catch (error) {
  await writeFile(join(evidence, 'failure.log'), String(error));
  console.error(`Candidate evidence retained at ${evidence}`);
  throw error;
} finally {
  server?.close();
}
