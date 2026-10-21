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
  const packOutput: unknown = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], {
      cwd: packageRoot,
      encoding: 'utf8',
    }),
  );
  assert.ok(Array.isArray(packOutput) && packOutput.length === 1);
  const packed: unknown = packOutput[0];
  assert.ok(typeof packed === 'object' && packed !== null);
  assert.ok('name' in packed && 'filename' in packed && typeof packed.filename === 'string');
  assert.ok('files' in packed && Array.isArray(packed.files));
  const files: unknown[] = packed.files;
  const paths = files.map((file) => {
    assert.ok(typeof file === 'object' && file !== null && 'path' in file && typeof file.path === 'string');
    return file.path;
  });
  assert.equal(packed.name, '@rm-industries/markdownlint-frontmatter');
  assert.deepEqual(paths.sort(), [
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'dist/index.d.ts',
    'dist/index.js',
    'dist/index.js.map',
    'package.json',
  ]);
  const manifest: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.ok(typeof manifest === 'object' && manifest !== null);
  assert.ok('dependencies' in manifest && typeof manifest.dependencies === 'object' && manifest.dependencies !== null);
  assert.ok('exports' in manifest && 'publishConfig' in manifest);
  assert.deepEqual(Object.keys(manifest.dependencies), ['yaml']);
  assert.deepEqual(manifest.exports, { '.': { types: './dist/index.d.ts', default: './dist/index.js' } });
  assert.deepEqual(manifest.publishConfig, { access: 'public', tag: 'latest' });
  const modelRoot = resolve(packageRoot, '../content-model');
  execFileSync('npm', ['run', 'build'], { cwd: modelRoot, stdio: 'inherit' });
  const modelPackOutput: unknown = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], {
      cwd: modelRoot,
      encoding: 'utf8',
    }),
  );
  assert.ok(Array.isArray(modelPackOutput) && modelPackOutput.length === 1);
  const modelPacked: unknown = modelPackOutput[0];
  assert.ok(typeof modelPacked === 'object' && modelPacked !== null);
  assert.ok('filename' in modelPacked && typeof modelPacked.filename === 'string');
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(consumer, packed.filename),
      join(consumer, modelPacked.filename),
      'markdownlint@0.42.0',
      'typescript@7.0.2',
      'markdown-it@15.0.3',
    ],
    { cwd: consumer, stdio: 'inherit' },
  );
  writeFileSync(
    join(consumer, 'declarations.ts'),
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
      'declarations.ts',
    ],
    { cwd: consumer, stdio: 'inherit' },
  );
  console.log('Packed allowlist, dependency boundary, and public declarations passed.');
  copyFileSync(join(packageRoot, 'test/consumer.ts'), join(consumer, 'consumer.ts'));
  execFileSync(process.execPath, ['consumer.ts'], { cwd: consumer, stdio: 'inherit' });
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
