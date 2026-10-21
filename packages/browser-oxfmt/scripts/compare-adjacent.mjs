import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { format } from '../../../node_modules/oxfmt/dist/index.js';
import { createCases } from '../test/fixtures/cases.mjs';
const cases = await createCases(format);
const rows = [];
for (const [index, version] of ['0.71.0', '0.73.0'].entries()) {
  const entry = resolve(process.argv[index + 2]);
  const pkg = JSON.parse(await readFile(resolve(dirname(entry), '../package.json'), 'utf8'));
  assert.equal(pkg.version, version);
  const { format: adjacent } = await import(pathToFileURL(entry).href);
  const changed = [];
  for (const sample of cases) {
    const output = await adjacent('article.md', sample.source, sample.options);
    assert.deepEqual(output.errors, []);
    assert.equal((await adjacent('article.md', output.code, sample.options)).code, output.code);
    if (output.code !== sample.expected)
      changed.push({
        id: sample.id,
        config: sample.configName,
        sha256: createHash('sha256').update(output.code).digest('hex'),
      });
  }
  rows.push({ version, cases: cases.length, idempotent: cases.length, changed });
}
console.log(JSON.stringify(rows, null, 2));
if (!process.argv.includes('--record'))
  assert.deepEqual(
    rows,
    JSON.parse(await readFile(new URL('../adjacent-results.json', import.meta.url), 'utf8')),
    'Adjacent release behavior changed; review the differences before updating the engine',
  );
