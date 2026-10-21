import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, matchesGlob, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parse, parseBuffer } from 'editorconfig';

import { BrowserOxfmtError } from './errors.js';
import { engine, validateResolvedOptions, type ResolvedOptions } from './options.js';

export interface BrowserOptionsInput {
  cwd: string;
  filename: string;
  configFile?: string;
  requireUniformPolicy?: boolean;
}
export interface ConfigurationDiagnostic {
  code: 'tailwind-class-order-preserved';
  message: string;
}
export interface BrowserOptionsResult {
  resolvedOptions: ResolvedOptions;
  diagnostics: ConfigurationDiagnostic[];
}
const configNames = [
  'oxfmt.config.ts',
  'oxfmt.config.mts',
  'oxfmt.config.cts',
  'oxfmt.config.js',
  'oxfmt.config.mjs',
  'oxfmt.config.cjs',
  '.oxfmtrc.json',
  '.oxfmtrc.jsonc',
];
const defaults = {
  printWidth: 100,
  tabWidth: 2,
  singleQuote: false,
  proseWrap: 'preserve',
  endOfLine: 'lf',
  useTabs: false,
  embeddedLanguageFormatting: 'auto',
};
function fail(message: string): never {
  throw new BrowserOxfmtError('configuration', message);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    fail(`${label} must be a plain configuration object`);
  return value as Record<string, unknown>;
}
function ancestors(directory: string) {
  const result = [directory];
  while (dirname(directory) !== directory) {
    directory = dirname(directory);
    result.push(directory);
  }
  return result;
}
function findConfig(directory: string) {
  const files = configNames.map((name) => resolve(directory, name)).filter(existsSync);
  if (files.length > 1) fail('Multiple Oxfmt configuration files found; select configFile explicitly');
  return files[0];
}
async function assertUniformTree(directory: string, root: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      entry.name === '.git' ||
      entry.name === 'node_modules' ||
      (directory === root &&
        [
          'dist',
          'build',
          '.astro',
          '.cache',
          'coverage',
          'playwright-report',
          'test-results',
          '.lighthouseci',
        ].includes(entry.name))
    )
      continue;
    if (entry.isSymbolicLink())
      fail('Uniform policy cannot verify symbolic links outside excluded build/dependency directories');
    if (entry.isDirectory()) {
      await assertUniformTree(resolve(directory, entry.name), root);
    } else if (directory !== root && (entry.name === '.editorconfig' || configNames.includes(entry.name)))
      fail('Uniform policy requires no nested Oxfmt or EditorConfig files beneath cwd');
  }
}
function patterns(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a nonempty pattern array`);
  return value.map((pattern) => {
    if (typeof pattern !== 'string' || !pattern || /[\\[\]{}()!+@]/.test(pattern) || isAbsolute(pattern))
      fail(`${label} supports only relative literals, *, ?, and whole ** segments`);
    const normalized = pattern.replace(/^\.\//, '');
    if (
      normalized
        .split('/')
        .some((part) => !part || part === '.' || part === '..' || (part.includes('**') && part !== '**'))
    )
      fail(`Unsupported ${label} pattern: ${pattern}`);
    return !pattern.includes('/') ? `**/${normalized}` : normalized;
  });
}
function normalizedOptions(values: Record<string, unknown>): ResolvedOptions {
  const options = { ...values };
  if (options.sortTailwindcss !== undefined && typeof options.sortTailwindcss !== 'boolean')
    fail('Only boolean sortTailwindcss is supported by the approved class-order limitation');
  delete options.sortTailwindcss;
  if (options.insertFinalNewline !== undefined && options.insertFinalNewline !== true)
    fail('insertFinalNewline must be true for native Markdown');
  delete options.insertFinalNewline;
  const result = { upstreamVersion: engine.upstreamVersion, options: { ...defaults, ...options } };
  validateResolvedOptions(result);
  return result;
}
// This helper deliberately covers a measured subset, not the full Oxfmt config resolver.
export async function resolveBrowserOptions(input: BrowserOptionsInput): Promise<BrowserOptionsResult> {
  const cwd = resolve(input.cwd);
  const filename = resolve(cwd, input.filename);
  if (!/\.md$/i.test(filename) || input.filename.includes('\0'))
    fail('A physical Markdown filename ending in .md is required');
  let version: string;
  try {
    version = JSON.parse(
      await readFile(createRequire(resolve(cwd, 'package.json')).resolve('oxfmt/package.json'), 'utf8'),
    ).version;
  } catch {
    return fail('Install the consumer project Oxfmt package before resolving browser options');
  }
  if (version !== engine.upstreamVersion)
    fail(`Installed Oxfmt ${version} does not match browser engine ${engine.upstreamVersion}`);
  let configFile = input.configFile ? resolve(cwd, input.configFile) : undefined;
  if (!configFile)
    for (const directory of ancestors(cwd)) {
      configFile = findConfig(directory);
      if (configFile) break;
    }
  if (!configFile) fail('No Oxfmt configuration found; provide configFile explicitly');
  const configDirectory = dirname(configFile);
  if (input.requireUniformPolicy) await assertUniformTree(cwd, cwd);
  const hostPath = relative(configDirectory, filename).split(sep).join('/');
  if (hostPath.startsWith('../') || isAbsolute(hostPath))
    fail('Markdown filename must be within the authoritative configuration directory');
  if (!/\.(?:[cm]?[jt]s|json|jsonc)$/.test(configFile)) fail('Use an explicit JS/TS or JSON Oxfmt configuration');
  if (configFile.endsWith('.jsonc'))
    fail('JSONC configuration is outside the supported build contract; use JS/TS or JSON');
  const exported: unknown = configFile.endsWith('.json')
    ? JSON.parse(await readFile(configFile, 'utf8'))
    : (await import(/* @vite-ignore */ `${pathToFileURL(configFile).href}?browser-oxfmt=${importGeneration++}`))
        .default;
  const config = object(exported, 'Oxfmt default export');
  const effective = { ...config };
  delete effective.overrides;
  delete effective.ignorePatterns;
  delete effective.$schema;
  if (config.ignorePatterns !== undefined) {
    if (!Array.isArray(config.ignorePatterns)) fail('ignorePatterns must be an array');
    for (const pattern of config.ignorePatterns) {
      if (typeof pattern !== 'string' || !/^\/?(?:[\w.-]+\/)+(?:\*\*|[\w.-]+)$/.test(pattern))
        fail('ignorePatterns supports only literal paths and directory/** exclusions');
      const directory = pattern.replace(/^\//, '').replace(/\/\*\*$/, '');
      if (directory.split('/').some((part) => part === '.' || part === '..'))
        fail('ignorePatterns cannot traverse parent directories');
      if (hostPath === directory || hostPath.startsWith(`${directory}/`))
        fail('Markdown filename is excluded by authoritative ignorePatterns');
    }
  }
  const diagnostics: ConfigurationDiagnostic[] = [];
  const editorconfigFile = ancestors(cwd)
    .map((directory) => resolve(directory, '.editorconfig'))
    .find(existsSync);
  for (const directory of ancestors(dirname(filename))) {
    if (
      directory === configDirectory ||
      !relative(configDirectory, directory) ||
      relative(configDirectory, directory).startsWith('..')
    )
      break;
    if (findConfig(directory)) fail('Nested Oxfmt configuration is unsupported; resolve from its project directory');
  }
  normalizedOptions(effective);
  if (config.overrides !== undefined) {
    if (!Array.isArray(config.overrides)) fail('Oxfmt overrides must be an array');
    if (config.overrides.length && hostPath.split('/').some((part) => part.startsWith('.')))
      fail('Hidden Markdown paths with overrides are outside the verified glob matching contract');
    if (input.requireUniformPolicy && config.overrides.length)
      fail('Uniform policy cannot select filename-specific Oxfmt overrides');
    for (const item of config.overrides) {
      const override = object(item, 'Override');
      if (Object.keys(override).some((key) => !['files', 'excludeFiles', 'options'].includes(key)))
        fail('Unsupported override structure');
      const includes = patterns(override.files, 'Override files');
      const excludes =
        override.excludeFiles === undefined ? [] : patterns(override.excludeFiles, 'Override excludeFiles');
      const values = object(override.options, 'Override options');
      normalizedOptions(values);
      if (
        includes.some((pattern) => matchesGlob(hostPath, pattern)) &&
        !excludes.some((pattern) => matchesGlob(hostPath, pattern))
      )
        Object.assign(effective, values);
    }
  }
  if (editorconfigFile) {
    const contents = await readFile(editorconfigFile);
    // The upstream parser truncates malformed input, so reject unsupported line syntax first.
    for (const line of contents.toString('utf8').split(/\r?\n/)) {
      const text = line.trim();
      if (text && !/^[#;]/.test(text) && !/^\[[^\]\r\n]+\]$/.test(text) && !/^[A-Za-z_][A-Za-z0-9_-]*\s*=/.test(text))
        fail('Invalid EditorConfig syntax: use section headings and property assignments');
    }
    const raw = parseBuffer(contents);
    if (
      raw.some(([section]) => section !== null && section !== '*') &&
      hostPath.split('/').some((part) => part.startsWith('.'))
    )
      fail('Hidden Markdown paths with EditorConfig selectors are outside the verified matching contract');
    if (input.requireUniformPolicy && raw.some(([section]) => section !== null && section !== '*'))
      fail('Uniform policy requires only [*] EditorConfig sections');
    for (const [section, properties] of raw) {
      if (section !== null) patterns([section], 'EditorConfig section');
      if (section !== null)
        for (const [key, value] of Object.entries(properties)) {
          if (['max_line_length', 'indent_size', 'tab_width'].includes(key) && !/^\d+$/.test(value))
            fail(`Unsupported EditorConfig ${key}: use a numeric value`);
          if (key === 'indent_style' && value !== 'space')
            fail('Unsupported EditorConfig indent_style: only space has verified parity');
          if (key === 'insert_final_newline' && value !== 'true')
            fail('Unsupported EditorConfig insert_final_newline: native Markdown requires true');
          if (key === 'end_of_line' && !['lf', 'crlf', 'cr'].includes(value))
            fail('Unsupported EditorConfig end_of_line');
          if (key === 'quote_type' && !['single', 'double'].includes(value))
            fail('Unsupported EditorConfig quote_type');
        }
    }
    for (const directory of ancestors(dirname(filename))) {
      if (directory === dirname(editorconfigFile)) break;
      if (existsSync(resolve(directory, '.editorconfig')))
        fail('Descendant EditorConfig is unsupported: Oxfmt selects one nearest file from cwd');
    }
    if (relative(dirname(editorconfigFile), filename).startsWith('..'))
      fail('Markdown filename must be within the selected EditorConfig directory');
    if (effective.useTabs === true && effective.tabWidth === undefined)
      fail('Set tabWidth explicitly when useTabs overrides a space-based EditorConfig');
    const ec = await parse(filename, { root: dirname(editorconfigFile), unset: true });
    const fallback: Record<string, unknown> = {};
    if (ec.max_line_length !== undefined) fallback.printWidth = ec.max_line_length;
    if (ec.end_of_line !== undefined) fallback.endOfLine = ec.end_of_line;
    if (ec.indent_style !== undefined) fallback.useTabs = false;
    if (ec.indent_size !== undefined && ec.indent_style === undefined && effective.useTabs === undefined)
      fail('EditorConfig indent_size requires indent_style=space or explicit useTabs:false');
    if (ec.indent_size !== undefined || ec.tab_width !== undefined) fallback.tabWidth = ec.indent_size ?? ec.tab_width;
    if (ec.quote_type !== undefined) fallback.singleQuote = ec.quote_type === 'single';
    for (const [key, value] of Object.entries(fallback)) if (effective[key] === undefined) effective[key] = value;
  }
  if (effective.sortTailwindcss === true)
    diagnostics.push({
      code: 'tailwind-class-order-preserved',
      message:
        'Browser formatting preserves Tailwind class order; repository Oxfmt may reorder it. Native CSS formatting remains enabled.',
    });
  const resolvedOptions = normalizedOptions(effective);
  return { resolvedOptions, diagnostics };
}
let importGeneration = 0;
