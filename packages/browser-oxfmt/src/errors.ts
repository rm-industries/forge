export type ErrorCode = 'input' | 'configuration' | 'parse' | 'load' | 'runtime' | 'worker';
export class BrowserOxfmtError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BrowserOxfmtError';
  }
}
