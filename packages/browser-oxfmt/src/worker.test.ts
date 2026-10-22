import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  format: vi.fn<(source: string, options: string) => string>().mockReturnValue('formatted'),
}));
vi.mock('./generated/engine.js', () => ({ default: native.init, format: native.format }));
const options = {
  printWidth: 80,
  tabWidth: 2,
  singleQuote: false,
  useTabs: false,
  proseWrap: 'preserve',
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
};
describe('dedicated worker request boundary', () => {
  let scope: { onmessage: (event: { data: unknown }) => Promise<void>; postMessage: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    scope = { onmessage: async () => {}, postMessage: vi.fn<(message: unknown) => void>() };
    vi.stubGlobal('self', scope);
    await import('./worker.js');
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([null, [], {}, { id: -1, source: 'text', options }, { id: 1, source: {}, options }])(
    'ignores malformed requests before loading native code: %j',
    async (data) => {
      await scope.onmessage({ data });
      expect(native.init).not.toHaveBeenCalled();
      expect(scope.postMessage).not.toHaveBeenCalled();
    },
  );
  it('rejects unsupported options before loading native code', async () => {
    await scope.onmessage({ data: { id: 1, source: 'text', options: { ...options, unknown: true } } });
    expect(native.init).not.toHaveBeenCalled();
    expect(scope.postMessage).toHaveBeenCalledWith({
      id: 1,
      error: { code: 'configuration', message: 'Invalid formatter worker options' },
    });
  });
  it('accepts valid owner messages without a Window origin', async () => {
    await scope.onmessage({ data: { id: 1, source: 'text', options } });
    expect(native.format).toHaveBeenCalledWith('text', JSON.stringify(options));
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 1, code: 'formatted' });
  });
});
