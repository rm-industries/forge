import { BrowserOxfmtError } from './errors.js';
import identity from './generated/identity.json' with { type: 'json' };
export interface FormatterOptions {
  printWidth: number;
  tabWidth: number;
  singleQuote: boolean;
  proseWrap: 'always' | 'never' | 'preserve';
  endOfLine: 'lf' | 'crlf' | 'cr';
  useTabs: boolean;
  embeddedLanguageFormatting: 'auto';
  sortImports?: boolean;
  sortPackageJson?: boolean;
  trailingComma?: 'all';
}
export interface ResolvedOptions {
  upstreamVersion: string;
  options: FormatterOptions;
}
export const engine = Object.freeze({
  upstreamVersion: '0.72.0',
  sourceSha: '2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609',
  rustVersion: '1.97.0',
  bindingsVersion: identity.bindingsVersion,
  artifactSha256: identity.assets['engine_bg.wasm'],
  capabilities: Object.freeze({
    markdown: true,
    yaml: true,
    typescript: true,
    javascript: true,
    css: true,
    nestedMarkdown: true,
    tailwindClassSorting: false,
  }),
});
export function validateResolvedOptions(resolved: unknown): asserts resolved is ResolvedOptions {
  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved))
    throw new BrowserOxfmtError('configuration', 'Resolved formatter options are required');
  const config = resolved as Record<string, unknown>;
  if (
    Object.keys(config).some((key) => !['upstreamVersion', 'options'].includes(key)) ||
    config.upstreamVersion !== engine.upstreamVersion
  )
    throw new BrowserOxfmtError('configuration', `Oxfmt ${engine.upstreamVersion} resolved options are required`);
  const options = config.options;
  if (!options || typeof options !== 'object' || Array.isArray(options))
    throw new BrowserOxfmtError('configuration', 'Formatter options must be an object');
  const rules: Record<string, (value: unknown) => boolean> = {
    printWidth: (value) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 320,
    tabWidth: (value) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 24,
    singleQuote: (value) => typeof value === 'boolean',
    useTabs: (value) => typeof value === 'boolean',
    proseWrap: (value) => typeof value === 'string' && ['always', 'never', 'preserve'].includes(value),
    endOfLine: (value) => typeof value === 'string' && ['lf', 'crlf', 'cr'].includes(value),
    embeddedLanguageFormatting: (value) => value === 'auto',
    sortImports: (value) => typeof value === 'boolean',
    sortPackageJson: (value) => typeof value === 'boolean',
    trailingComma: (value) => value === 'all',
  };
  const values = options as Record<string, unknown>;
  for (const key of [
    'printWidth',
    'tabWidth',
    'singleQuote',
    'useTabs',
    'proseWrap',
    'endOfLine',
    'embeddedLanguageFormatting',
  ])
    if (!Object.hasOwn(values, key)) throw new BrowserOxfmtError('configuration', `Missing formatter option: ${key}`);
  for (const [key, value] of Object.entries(values))
    if (!rules[key]?.(value))
      throw new BrowserOxfmtError('configuration', `Unsupported formatter option or value: ${key}`);
}
