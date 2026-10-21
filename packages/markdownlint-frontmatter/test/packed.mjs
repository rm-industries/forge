import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumer = mkdtempSync(join(tmpdir(), 'forge-frontmatter-consumer-'));
try {
  execFileSync('npm', ['run', 'build'], { cwd: packageRoot, stdio: 'inherit' });
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], {
      cwd: packageRoot,
      encoding: 'utf8',
    }),
  );
  assert.equal(packed[0].name, '@rm-industries/markdownlint-frontmatter');
  assert.deepEqual(packed[0].files.map(({ path }) => path).sort(), [
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'dist/index.d.ts',
    'dist/index.js',
    'dist/index.js.map',
    'package.json',
  ]);
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.dependencies), ['yaml']);
  assert.equal(manifest.exports['.'].types, './dist/index.d.ts');
  assert.equal(manifest.publishConfig.access, 'public');
  const modelRoot = resolve(packageRoot, '../content-model');
  execFileSync('npm', ['run', 'build'], { cwd: modelRoot, stdio: 'inherit' });
  const modelPacked = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], {
      cwd: modelRoot,
      encoding: 'utf8',
    }),
  );
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(consumer, packed[0].filename),
      join(consumer, modelPacked[0].filename),
      'markdownlint@0.42.0',
      'typescript@7.0.2',
      'markdown-it@15.0.3',
    ],
    { cwd: consumer, stdio: 'inherit' },
  );
  writeFileSync(
    join(consumer, 'consumer.ts'),
    `
import rule, { frontmatterOrderFromModel, type FrontmatterOrderConfiguration } from '@rm-industries/markdownlint-frontmatter';
import type { Rule } from 'markdownlint';
const publicRule: Rule = rule;
const config: FrontmatterOrderConfiguration = frontmatterOrderFromModel({ fields: { title: {} } });
void publicRule; void config;
`,
  );
  execFileSync(
    join(consumer, 'node_modules/.bin/tsc'),
    [
      '--noEmit',
      '--strict',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--target',
      'ES2022',
      'consumer.ts',
    ],
    { cwd: consumer, stdio: 'inherit' },
  );
  console.log('Packed allowlist, dependency boundary, and public declarations passed.');
  copyFileSync(join(packageRoot, 'test/consumer.mjs'), join(consumer, 'consumer.mjs'));
  execFileSync(process.execPath, ['consumer.mjs'], { cwd: consumer, stdio: 'inherit' });
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
