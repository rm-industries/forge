// Throwaway browser adapter. The wrapper's raw ABI is not a production API.
export async function createFormatter(bytesOrResponse) {
  const start = performance.now();
  let api;
  const imports = {
    env: {
      report_panic(ptr, len) {
        console.error('Rust panic:', new TextDecoder().decode(new Uint8Array(api.memory.buffer, ptr, len)));
      },
    },
  };
  const result =
    bytesOrResponse instanceof Response
      ? await WebAssembly.instantiateStreaming(bytesOrResponse, imports)
      : await WebAssembly.instantiate(bytesOrResponse, imports);
  api = result.instance.exports;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return {
    initializationMs: performance.now() - start,
    memoryBytes: () => api.memory.buffer.byteLength,
    format(source, options) {
      const input = encoder.encode(source);
      const config = encoder.encode(JSON.stringify(options));
      const inputPtr = api.alloc(input.length);
      const configPtr = api.alloc(config.length);
      try {
        new Uint8Array(api.memory.buffer, inputPtr, input.length).set(input);
        new Uint8Array(api.memory.buffer, configPtr, config.length).set(config);
        const output = api.format(inputPtr, input.length, configPtr, config.length);
        const ptr = Number(output & 0xffffffffn);
        const length = Number(output >> 32n);
        let decoded;
        try {
          decoded = JSON.parse(decoder.decode(new Uint8Array(api.memory.buffer, ptr, length)));
        } finally {
          api.release(ptr, length);
        }
        if (typeof decoded.error === 'string') throw new Error(decoded.error);
        if (typeof decoded.code !== 'string') throw new Error('Invalid formatter result');
        return decoded.code;
      } finally {
        api.release(inputPtr, input.length);
        api.release(configPtr, config.length);
      }
    },
  };
}
