import type { ErrorCode } from './errors.js';
import type { FormatterOptions } from './options.js';
import init, { format as nativeFormat } from './wasm/engine.js';
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
self.onmessage = async ({ data }: MessageEvent<{ id: number; source: string; options: FormatterOptions }>) => {
  let phase: ErrorCode = 'load';
  try {
    await load();
    phase = 'parse';
    const code = nativeFormat(data.source, JSON.stringify(data.options));
    self.postMessage({ id: data.id, code });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: {
        code: error instanceof WebAssembly.RuntimeError ? 'runtime' : phase,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
};
