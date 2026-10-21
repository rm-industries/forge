import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(consumer, packed[0].filename),
      'markdownlint@0.42.0',
    ],
    { cwd: consumer, stdio: 'inherit' },
  );
  copyFileSync(join(packageRoot, 'test/consumer.mjs'), join(consumer, 'consumer.mjs'));
  execFileSync(process.execPath, ['consumer.mjs'], { cwd: consumer, stdio: 'inherit' });
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
