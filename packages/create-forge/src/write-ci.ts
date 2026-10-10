import { createRequire } from 'node:module';
import { join } from 'node:path';

import { executeCommand } from './process';

/** Zuke writes into staging; materialization applies the same collision/rollback rules as other files. */
export async function writeProjectCi(projectRoot: string, outputRoot: string, signal?: AbortSignal) {
  const require = createRequire(import.meta.url);
  await executeCommand({
    executable: process.execPath,
    arguments: [
      require.resolve('deno/bin.cjs'),
      'run',
      '--frozen',
      '--no-config',
      `--lock=${join(projectRoot, 'scripts/ci/deno.lock')}`,
      `--import-map=${join(projectRoot, 'scripts/ci/imports.json')}`,
      '--node-modules-dir=none',
      '--allow-read',
      '--allow-env',
      `--allow-write=${outputRoot}`,
      join(projectRoot, 'scripts/ci/generate.ts'),
      '--output-root',
      outputRoot,
    ],
    cwd: projectRoot,
    ...(signal ? { signal } : {}),
  });
}
