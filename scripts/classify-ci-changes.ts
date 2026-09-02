import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface CiSelection {
  audit: boolean;
  code: boolean;
  compatibility: boolean;
  documentation: boolean;
  generator: boolean;
  packages: boolean;
  template: boolean;
}

const documentationFiles = new Set(['CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'LICENSE', 'README.md', 'SECURITY.md']);

const isDocumentation = (path: string): boolean =>
  path.endsWith('.md') || path.startsWith('docs/') || documentationFiles.has(path);

const isLightweightDocumentation = (path: string): boolean =>
  isDocumentation(path) && !path.startsWith('.github/') && !path.startsWith('templates/default/');

const selectEverything = (): CiSelection => ({
  audit: true,
  code: true,
  compatibility: true,
  documentation: true,
  generator: true,
  packages: true,
  template: true,
});

export const classifyCiChanges = (paths: readonly string[]): CiSelection => {
  if (paths.length === 0) return selectEverything();

  const documentation = paths.some(isDocumentation);
  if (paths.every(isLightweightDocumentation)) {
    return {
      audit: false,
      code: false,
      compatibility: false,
      documentation: true,
      generator: false,
      packages: false,
      template: false,
    };
  }

  let contentModel = false;
  let createForge = false;
  let template = false;
  let full = false;

  for (const path of paths) {
    if (path.startsWith('.github/')) full = true;
    else if (path.startsWith('templates/default/')) template = true;
    else if (isDocumentation(path)) continue;
    else if (path.startsWith('packages/content-model/')) contentModel = true;
    else if (path.startsWith('packages/create-forge/')) createForge = true;
    else full = true;
  }

  if (full) return selectEverything();

  const packages = contentModel || createForge || template;

  return {
    audit: paths.some((path) => /(^|\/)package-lock\.json$/u.test(path) || /(^|\/)package\.json$/u.test(path)),
    code: packages,
    compatibility: contentModel || createForge,
    documentation,
    generator: createForge || template,
    packages,
    template,
  };
};

export const serializeCiSelection = (selection: CiSelection): string =>
  `${Object.entries(selection)
    .map(([name, selected]) => `${name}=${String(selected)}`)
    .join('\n')}\n`;

const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  const inputPath = process.argv[2];
  if (!inputPath) throw new TypeError('Usage: node scripts/classify-ci-changes.ts <NUL-delimited-path-file>');

  const changedPaths = (await readFile(inputPath, 'utf8')).split('\0').filter(Boolean);
  process.stdout.write(serializeCiSelection(classifyCiChanges(changedPaths)));
}
