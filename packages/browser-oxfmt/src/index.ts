import { BrowserOxfmtError, type ErrorCode } from './errors.js';
import { validateResolvedOptions, type ResolvedOptions } from './options.js';
export { BrowserOxfmtError } from './errors.js';
export type { ErrorCode } from './errors.js';
export { engine } from './options.js';
export type { FormatterOptions, ResolvedOptions } from './options.js';
type Response = { id: number; code?: string; error?: { code: ErrorCode; message: string } };
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (code: string) => void; reject: (error: BrowserOxfmtError) => void }>();
function reset(error: BrowserOxfmtError) {
  worker?.terminate();
  worker = undefined;
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}
function getWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  } catch (error) {
    throw new BrowserOxfmtError('worker', `Unable to start formatter worker: ${String(error)}`);
  }
  worker.onmessage = ({ data }: MessageEvent<Response>) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) {
      const error = new BrowserOxfmtError(data.error.code, data.error.message);
      request.reject(error);
      if (['worker', 'runtime', 'load'].includes(error.code)) reset(error);
    } else if (typeof data.code === 'string') request.resolve(data.code);
    else reset(new BrowserOxfmtError('worker', 'Invalid formatter worker response'));
  };
  worker.onerror = (event) => {
    event.preventDefault();
    reset(new BrowserOxfmtError('worker', event.message || 'Formatter worker failed'));
  };
  worker.onmessageerror = () => reset(new BrowserOxfmtError('worker', 'Unable to read formatter worker response'));
  return worker;
}
export async function format(source: string, filename: string, resolved: ResolvedOptions): Promise<string> {
  if (
    typeof source !== 'string' ||
    typeof filename !== 'string' ||
    !filename.endsWith('.md') ||
    filename.includes('\0')
  )
    throw new BrowserOxfmtError('input', 'Provide source text and a Markdown (.md) filename');
  validateResolvedOptions(resolved);
  const active = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      active.postMessage({ id, source, options: resolved.options });
    } catch (error) {
      reset(new BrowserOxfmtError('worker', `Unable to send formatter request: ${String(error)}`));
    }
  });
}
