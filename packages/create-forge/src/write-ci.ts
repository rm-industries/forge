import { readFile } from 'node:fs/promises';

import type { CiGenerationOptions } from './ci/generation-options.ts';
import { writeCi } from './ci/write.ts';

/** Generate in staging; materialization owns conflict handling and rollback. */
export async function writeProjectCi(config: CiGenerationOptions, outputRoot: string, signal?: AbortSignal) {
  const defaults = JSON.parse(await readFile(new URL('./ci-actions.json', import.meta.url), 'utf8')) as Record<
    string,
    { ref: string; version?: string }
  >;
  await writeCi(
    config,
    outputRoot,
    (action) => {
      const pin = defaults[action];
      if (!pin || !pin.ref.startsWith(`${action}@`)) throw new TypeError(`Missing or invalid bootstrap pin: ${action}`);
      return pin;
    },
    signal,
  );
}
