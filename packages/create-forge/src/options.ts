export type GeneratorOptions = {
  destination: string;
  packageName: string;
  siteName: string;
  description: string;
  author: string;
  url: string;
  repository: string;
  install: boolean;
  git: boolean;
};

export type ProvidedOptions = {
  [Key in keyof GeneratorOptions]?: GeneratorOptions[Key] | undefined;
} & { yes: boolean };

export const defaultDescription = 'A content-driven website built with Forge';
export const defaultUrl = 'https://example.com';

export const derivePackageName = (destination: string) => {
  return basename(resolve(destination)) || 'forge-site';
};

export const humanizePackageName = (packageName: string) => {
  const unscopedName = packageName.split('/').at(-1) ?? packageName;
  return unscopedName
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};
import { basename, resolve } from 'node:path';
