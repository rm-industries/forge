import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

declare global {
  interface Window {
    formatter: typeof import('../src/index.ts');
  }
}

import { createCases } from './markdown-cases.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { format: reference } = await import(
  pathToFileURL(process.env.OXFMT_MODULE ?? join(root, 'node_modules/oxfmt/dist/index.js')).href
);
const browsers = await import(
  pathToFileURL(process.env.PLAYWRIGHT_MODULE ?? join(root, 'templates/default/node_modules/playwright/index.mjs')).href
);
const cases = await createCases(reference);
const { build: viteBuild } = await import(
  pathToFileURL(process.env.VITE_MODULE ?? join(root, 'node_modules/vite/dist/node/index.js')).href
);
const consumer = await mkdtemp(join(tmpdir(), 'forge-oxfmt-consumer-'));
function run(
  command: string,
  args: string[],
  options: import('node:child_process').SpawnSyncOptionsWithStringEncoding = { encoding: 'utf8' },
) {
  const result = spawnSync(command, args, options);
  if (result.status !== 0) throw Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
const rows = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'",
    );
    if (path.endsWith('/isolated')) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    if (path.endsWith('/page') || path.endsWith('/isolated')) {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><title>Isolated package consumer</title>');
      return;
    }
    const file = path.startsWith('/bundled/')
      ? resolve(consumer, 'bundled-dist', path.slice('/bundled/'.length) || 'index.html')
      : resolve(consumer, '.' + path.replace(/^\/project/, ''));
    if (!file.startsWith(consumer + '/')) throw Error('Invalid path');
    res.setHeader(
      'Content-Type',
      extname(file) === '.wasm' ? 'application/wasm' : extname(file) === '.html' ? 'text/html' : 'text/javascript',
    );
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
try {
  const packed = JSON.parse(
    run(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--workspace',
        '@rm-industries/browser-oxfmt',
        '--pack-destination',
        consumer,
      ],
      { cwd: root, encoding: 'utf8' },
    ),
  )[0];
  assert.ok(packed.files.some((file: { path: string }) => file.path === 'dist/generated/engine_bg.wasm'));
  assert.ok(packed.files.some((file: { path: string }) => file.path === 'NOTICE.md'));
  assert.ok(packed.files.some((file: { path: string }) => file.path === 'dist/build.js'));
  assert.ok(packed.files.some((file: { path: string }) => file.path === 'dist/build.d.ts'));
  assert.ok(!packed.files.some((file: { path: string }) => file.path.includes('/src/') || file.path.endsWith('.rs')));
  run('npm', [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--prefix',
    consumer,
    join(consumer, packed.filename),
    'oxfmt@0.72.0',
    '--cache',
    join(consumer, 'npm-cache'),
  ]);
  // Resolve the installed package against a standalone consumer's actual policy.
  await writeFile(join(consumer, 'oxfmt.config.ts'), await readFile(join(root, 'templates/default/oxfmt.config.ts')));
  await writeFile(join(consumer, '.editorconfig'), await readFile(join(root, 'templates/default/.editorconfig')));
  const consumerRequire = createRequire(join(consumer, 'package.json'));
  const { resolveBrowserOptions } = await import(
    pathToFileURL(consumerRequire.resolve('@rm-industries/browser-oxfmt/build')).href
  );
  const derived = await resolveBrowserOptions({ cwd: consumer, filename: 'article.md', requireUniformPolicy: true });
  assert.equal(derived.resolvedOptions.options.printWidth, 120);
  assert.equal(derived.diagnostics[0].code, 'tailwind-class-order-preserved');
  const derivedSource =
    '---\ntags: [one,two]\n---\n\n' +
    'A paragraph with enough words to demonstrate the authoritative EditorConfig width and policy. '.repeat(4) +
    '\n\n```ts\nimport {z} from "z";\nimport {a} from "a";\nconsole.log(z,a);\n```\n';
  const derivedExpected = run(
    process.execPath,
    [
      join(consumer, 'node_modules/oxfmt/bin/oxfmt'),
      '--config',
      join(consumer, 'oxfmt.config.ts'),
      '--stdin-filepath',
      join(consumer, 'article.md'),
    ],
    { cwd: consumer, input: derivedSource, encoding: 'utf8' },
  );
  await writeFile(join(consumer, 'index.html'), '<!doctype html><script type="module" src="/main.js"></script>');
  await writeFile(
    join(consumer, 'main.js'),
    "import {format,engine} from '@rm-industries/browser-oxfmt'; window.formatter={format,engine};",
  );
  await viteBuild({
    root: consumer,
    base: '/bundled/',
    logLevel: 'warn',
    build: { outDir: 'bundled-dist' },
    worker: { format: 'es' },
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const engineNames = process.env.BROWSER_OXFMT_ENGINES?.split(',') ?? ['chromium', 'webkit', 'firefox'];
  assert.ok(engineNames.length && engineNames.every((name) => ['chromium', 'webkit', 'firefox'].includes(name)));
  for (const name of engineNames) {
    const browser = await browsers[name].launch({
      headless: true,
      ...(name === 'chromium' && process.env.CHROMIUM_CHANNEL ? { channel: process.env.CHROMIUM_CHANNEL } : {}),
    });
    try {
      const page = await browser.newPage();
      let workers = 0;
      page.on('worker', () => workers++);
      await page.goto(origin + '/project/page');
      const outcome = await page.evaluate(async (cases: Awaited<ReturnType<typeof createCases>>) => {
        const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
        const { format, engine } = (await import(browserEntry)) as typeof import('../src/index.ts');
        const failures = [];
        let matches = 0;
        let stable = 0;
        let expectedDifferences = 0;
        for (const sample of cases) {
          const { sortTailwindcss: _sortTailwindcss, ...options } = sample.options;
          const resolved = { upstreamVersion: engine.upstreamVersion, options };
          const actual = await format(sample.source, 'article.md', resolved);
          if (actual === sample.expected && sample.expectedErrors.length === 0) matches++;
          else if (sample.id === 'policy-tailwind') {
            expectedDifferences++;
            if (!actual.includes('text-white flex p-4')) failures.push('Tailwind class order changed');
          } else failures.push(`${sample.id}/${sample.configName}: parity`);
          if ((await format(actual, 'article.md', resolved)) === actual) stable++;
          else failures.push(`${sample.id}/${sample.configName}: idempotence`);
          if (sample.preserve && !actual.includes(sample.preserve)) failures.push(`${sample.id}: preservation`);
          if (
            ['frontmatter', 'yaml-fence', 'ts-fence', 'css-fence'].includes(sample.id) &&
            sample.configName === 'twoSpacesWrapped' &&
            actual === sample.source
          )
            failures.push(`${sample.id}: native positive control`);
        }
        const sample = cases[0];
        if (!sample) throw Error('No parity cases');
        const { sortTailwindcss: _sortTailwindcss, ...options } = sample.options;
        const resolved = { upstreamVersion: engine.upstreamVersion, options };
        for (const version of ['0.71.0', '0.73.0']) {
          try {
            await format('text', 'article.md', { ...resolved, upstreamVersion: version });
            failures.push(`accepted version ${version}`);
          } catch (error) {
            if ((error as { code?: string }).code !== 'configuration') failures.push('version error shape');
          }
        }
        let ticks = 0;
        const interval = setInterval(() => ticks++, 0);
        await format(
          '# Heading\n\nA paragraph with **content** and a [link](https://example.com).\n\n'.repeat(5000),
          'large.md',
          resolved,
        );
        clearInterval(interval);
        return { matches, stable, expectedDifferences, failures, ticks, engine };
      }, cases);
      const derivedOutput = await page.evaluate(
        async ({
          source,
          resolvedOptions,
        }: {
          source: string;
          resolvedOptions: import('../src/index.ts').ResolvedOptions;
        }) => {
          const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
          const { format } = (await import(browserEntry)) as typeof import('../src/index.ts');
          return format(source, 'article.md', resolvedOptions);
        },
        { source: derivedSource, resolvedOptions: derived.resolvedOptions },
      );
      assert.equal(derivedOutput, derivedExpected, 'Installed consumer config must match its matching CLI');
      assert.deepEqual(outcome.failures, []);
      assert.equal(outcome.stable, cases.length);
      assert.equal(outcome.matches, cases.length - 5);
      assert.equal(outcome.expectedDifferences, 5);
      assert.ok(outcome.ticks > 0, 'Worker formatting must leave the UI event loop responsive');
      assert.equal(workers, 1, 'Requests reuse one lazy worker');
      // Missing self-hosted assets must reject, then recover after deployment repair.
      const failed = await browser.newPage();
      failed.on('console', (msg: { text(): string }) => console.log(name, msg.text()));
      await failed.goto(origin + '/project/isolated');
      await failed.route(
        '**/engine_bg.wasm',
        (route: { fulfill(options: { status?: number; body: string; contentType?: string }): Promise<void> }) =>
          route.fulfill({ status: 404, body: 'missing' }),
      );
      const firstCase = cases[0];
      assert.ok(firstCase);
      const options = firstCase.options;
      delete options.sortTailwindcss;
      const failure = await failed.evaluate(async (options: import('../src/index.ts').FormatterOptions) => {
        const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
        const module = (await import(browserEntry)) as typeof import('../src/index.ts');
        try {
          await module.format('#  Test', 'article.md', { upstreamVersion: module.engine.upstreamVersion, options });
          return 'saved';
        } catch (error) {
          return (error as { code?: string }).code;
        }
      }, options);
      assert.equal(failure, 'load');
      await failed.unroute('**/engine_bg.wasm');
      const retry = await failed.evaluate(async (options: import('../src/index.ts').FormatterOptions) => {
        const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
        const module = (await import(browserEntry)) as typeof import('../src/index.ts');
        return module.format('#  Test', 'article.md', { upstreamVersion: module.engine.upstreamVersion, options });
      }, options);
      assert.equal(retry, '# Test\n');
      const crashed = await browser.newPage();
      await crashed.goto(origin + '/project/page');
      await crashed.route(
        '**/worker.js',
        (route: { fulfill(options: { status?: number; body: string; contentType?: string }): Promise<void> }) =>
          route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Broken worker deployment");' }),
      );
      const crash = await crashed.evaluate(async (options: import('../src/index.ts').FormatterOptions) => {
        const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
        const module = (await import(browserEntry)) as typeof import('../src/index.ts');
        try {
          await module.format('text', 'article.md', { upstreamVersion: module.engine.upstreamVersion, options });
          return 'saved';
        } catch (error) {
          return (error as { code?: string }).code;
        }
      }, options);
      assert.equal(crash, 'worker');
      await crashed.unroute('**/worker.js');
      assert.equal(
        await crashed.evaluate(async (options: import('../src/index.ts').FormatterOptions) => {
          const browserEntry = '/project/node_modules/@rm-industries/browser-oxfmt/dist/index.js';
          const module = (await import(browserEntry)) as typeof import('../src/index.ts');
          return module.format('#  Recovered', 'article.md', {
            upstreamVersion: module.engine.upstreamVersion,
            options,
          });
        }, options),
        '# Recovered\n',
      );
      const bundled = await browser.newPage();
      await bundled.goto(origin + '/bundled/');
      await bundled.waitForFunction(() => Boolean(window.formatter));
      const bundledOutput = await bundled.evaluate(
        async (options: import('../src/index.ts').FormatterOptions) =>
          window.formatter.format('#  Bundled', 'article.md', {
            upstreamVersion: window.formatter.engine.upstreamVersion,
            options,
          }),
        options,
      );
      assert.equal(bundledOutput, '# Bundled\n');
      const result = {
        browser: name,
        version: browser.version(),
        cases: cases.length,
        matches: outcome.matches,
        idempotent: outcome.stable,
        approvedTailwindDifferences: outcome.expectedDifferences,
        uiTicks: outcome.ticks,
        workerReuse: true,
        assetFailureRecovery: true,
        workerFailureRecovery: true,
        projectPath: true,
        isolatedHeaders: true,
        viteProductionBuild: true,
        installedConsumerConfigurationParity: true,
      };
      rows.push(result);
      console.log(JSON.stringify(result));
    } finally {
      await browser.close();
    }
  }
  console.log(JSON.stringify({ tarball: packed.filename, integrity: packed.integrity, rows }, null, 2));
} finally {
  server.close();
  await rm(consumer, { recursive: true, force: true });
}
