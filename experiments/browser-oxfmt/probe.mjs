import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

// Explicit local modules keep this experiment outside the production dependency graph.
const { format } = await import(pathToFileURL(process.env.OXFMT_MODULE));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const root = new URL('./', import.meta.url);
const baseline = JSON.parse(await readFile(new URL('baseline.json', root), 'utf8'));
const fence = (language, source) => `\n\`\`\`${language}\n${source}\n\`\`\`\n`;
const extras = [
  { id: 'frontmatter', source: '---\ntitle: "Example"\ntags: [one,two]\n---\n\n# Title\n' },
  { id: 'yaml-fence', source: fence('yaml', 'items: [one,two]\nname: "Example"') },
  { id: 'ts-fence', source: fence('ts', 'const x: string="hello";') },
  { id: 'css-fence', source: fence('css', 'a{color:red;margin:0 1px}') },
  {
    id: 'nested-markdown',
    source: '1. Nested\n\n   ~~~md\n   #  Nested title\n\n   ```ts\n   const x=1\n   ```\n   ~~~\n',
  },
  { id: 'ignore', source: '<!-- prettier-ignore -->\n' + fence('ts', 'const x=   1') },
  { id: 'malformed-yaml', source: '---\na: [\n---\n\nText\n' },
  { id: 'malformed-ts', source: fence('ts', 'const = ;') },
  { id: 'unclosed-fence', source: '```ts\nconst x=1\n' },
  { id: 'unicode-crlf', source: '#  Café 👩🏽‍💻\r\n\r\n中文\r\n' },
  { id: 'bom', source: '\ufeff#  Heading\n' },
  ...['sh', 'bash', 'python', 'text', 'plain', 'mermaid', 'astro', 'unknown-language'].map((language) => ({
    id: `preserve-${language}`,
    source: fence(language, '  untouched   = "👩🏽‍💻"  '),
    preserve: '  untouched   = "👩🏽‍💻"',
  })),
  {
    id: 'policy-imports',
    source: fence('ts', "import {z} from 'z';\nimport {a} from 'a';\nconsole.log(z,a);"),
    policy: true,
  },
  { id: 'policy-tailwind', source: fence('css', '.example { @apply text-white flex p-4; }'), policy: true },
];
const configurations = {
  ...baseline.configs,
  forgePolicy: {
    ...baseline.configs.twoSpacesWrapped,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
    trailingComma: 'all',
  },
};
const cases = [];
for (const sample of [...baseline.samples, ...extras]) {
  for (const [configName, options] of Object.entries(configurations)) {
    const referenceOptions = sample.policy
      ? { ...options, sortImports: true, sortTailwindcss: true, sortPackageJson: true, trailingComma: 'all' }
      : options;
    const expected = await format('article.md', sample.source, referenceOptions);
    cases.push({
      ...sample,
      configName,
      options: referenceOptions,
      expected: expected.code,
      expectedErrors: expected.errors.map((e) => e.message),
    });
  }
}
const wasm = await readFile(new URL('formatter.wasm', root));
const client = await readFile(new URL('client.mjs', root), 'utf8');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let observed;
try {
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:4348/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(
      path === '/formatter.wasm'
        ? { contentType: 'application/wasm', body: wasm }
        : path === '/client.mjs'
          ? { contentType: 'text/javascript', body: client }
          : { contentType: 'text/html', body: '<!doctype html><title>Controlled native Oxfmt probe</title>' },
    );
  });
  await page.goto('http://127.0.0.1:4348/');
  observed = await page.evaluate(async (cases) => {
    const { createFormatter } = await import('/client.mjs');
    const formatter = await createFormatter(await fetch('/formatter.wasm'));
    const rows = [];
    for (const test of cases) {
      const start = performance.now();
      try {
        const actual = formatter.format(test.source, test.options);
        rows.push({
          id: test.id,
          configName: test.configName,
          match: test.expectedErrors.length === 0 && actual === test.expected,
          stable: formatter.format(actual, test.options) === actual,
          preserved: test.preserve === undefined ? null : actual.includes(test.preserve),
          changed: actual !== test.source,
          durationMs: performance.now() - start,
          ...(actual !== test.expected || test.expectedErrors.length
            ? { expected: test.expected, actual, expectedErrors: test.expectedErrors }
            : {}),
        });
      } catch (error) {
        rows.push({
          id: test.id,
          configName: test.configName,
          match: test.expectedErrors.length > 0,
          stable: null,
          error: error.message,
          expectedErrors: test.expectedErrors,
        });
      }
    }
    const memoryBeforeStress = formatter.memoryBytes();
    for (let i = 0; i < 1000; i++) formatter.format(cases[i % cases.length].source, cases[i % cases.length].options);
    return {
      initializationMs: formatter.initializationMs,
      memoryBeforeStress,
      memoryAfterStress: formatter.memoryBytes(),
      stressCalls: 1000,
      rows,
    };
  }, cases);
  observed.browser = await browser.version();
} finally {
  await browser.close();
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const mismatches = observed.rows.filter((row) => !row.match);
assert.ok(
  mismatches.every((row) => row.id === 'policy-tailwind'),
  'Unexpected parity mismatch',
);
const output = {
  upstream: '2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609',
  oxfmt: '0.72.0',
  embeddedLanguageFormatting: 'auto',
  baselineInputs: baseline.samples.length,
  baselineConfigurations: Object.keys(baseline.configs).length,
  configurations: Object.keys(configurations).length,
  cases: cases.length,
  matches: cases.length - mismatches.length,
  mismatches: mismatches.length,
  stable: observed.rows.filter((row) => row.stable).length,
  wasmBytes: wasm.length,
  gzipBytes: gzipSync(wasm).length,
  wasmSha256: sha256(wasm),
  ...observed,
  verdict: 'GO under the maintainer-approved Tailwind sorting limitation',
};
await writeFile(new URL('results.json', root), JSON.stringify(output, null, 2) + '\n');
// Positive controls prove that a dispatcher is active; preservation alone cannot pass.
for (const id of ['frontmatter', 'yaml-fence', 'ts-fence', 'css-fence']) {
  const row = observed.rows.find((row) => row.id === id && row.configName === 'twoSpacesWrapped');
  assert.equal(row.match, true, id);
  assert.equal(row.changed, true, id);
}
assert.ok(
  observed.rows.filter((row) => row.preserved !== null && row.preserved !== undefined).every((row) => row.preserved),
);
assert.ok(observed.rows.every((row) => row.stable !== false));
console.log(
  JSON.stringify(
    {
      cases: output.cases,
      matches: output.matches,
      mismatches: output.mismatches,
      stable: output.stable,
      wasmBytes: output.wasmBytes,
      verdict: output.verdict,
    },
    null,
    2,
  ),
);
