export interface CriticalCommand {
  command: string;
  documentation: string;
  manifest?: string;
}

export interface ExternalLinkException {
  expires: string;
  reason: string;
  url: string;
}

export const criticalCommands: CriticalCommand[] = [
  {
    command: 'npm create @rm-industries/forge@next',
    documentation: 'README.md',
  },
  {
    command: 'npm run quality',
    documentation: 'docs/releasing.md',
    manifest: 'package.json',
  },
  {
    command: 'npm run audit',
    documentation: 'docs/releasing.md',
    manifest: 'package.json',
  },
  {
    command: 'npm run verify:package --workspace @rm-industries/create-forge',
    documentation: 'docs/releasing.md',
    manifest: 'packages/create-forge/package.json',
  },
  {
    command: 'npm run test:generator:e2e',
    documentation: 'docs/releasing.md',
    manifest: 'package.json',
  },
];

export const externalLinkExceptions: ExternalLinkException[] = [];

export const externalLinkPolicy = {
  attempts: 3,
  retryDelayMilliseconds: 1_000,
  timeoutMilliseconds: 15_000,
};
