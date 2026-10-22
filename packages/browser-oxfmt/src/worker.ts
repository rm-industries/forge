import type { ErrorCode } from './errors.js';
import init, { format as nativeFormat } from './generated/engine.js';
import { engine as metadata, validateResolvedOptions } from './options.js';
let engine: Promise<unknown> | undefined;
async function load() {
  engine ??= init();
  try {
    await engine;
  } catch (error) {
    engine = undefined;
    throw error;
  }
}
// Dedicated worker messages arrive through the owner's private channel; Window origin checks do not apply.
self.onmessage = async ({ data }: MessageEvent<unknown>) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  const request = data as Record<string, unknown>;
  if (!Number.isSafeInteger(request.id) || Number(request.id) < 0 || typeof request.source !== 'string') return;
  const { id, source, options } = request;
  try {
    validateResolvedOptions({ upstreamVersion: metadata.upstreamVersion, options });
  } catch {
    self.postMessage({ id, error: { code: 'configuration', message: 'Invalid formatter worker options' } });
    return;
  }
  let phase: ErrorCode = 'load';
  try {
    await load();
    phase = 'parse';
    const code = nativeFormat(source, JSON.stringify(options));
    self.postMessage({ id, code });
  } catch (error) {
    self.postMessage({
      id,
      error: {
        code: error instanceof WebAssembly.RuntimeError ? 'runtime' : phase,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
