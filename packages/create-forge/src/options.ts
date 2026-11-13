import type { SecurityConfig } from '../../../templates/default/src/integrations/security-txt/render.ts';
import type { DeploymentEnvironment } from './ci/deployment.ts';
export type GeneratorOptions = {
  destination: string;
  repositoryRoot: string;
  ciPrefix?: string;
  ciProviders?: Array<'github' | 'gitlab'>;
  nodeVersion?: string;
  deployments?: DeploymentEnvironment[];
  primaryCi?: 'github' | 'gitlab';
  packageName: string;
  siteName: string;
  description: string;
  author: string;
  url: string;
  repository: string;
  security?: SecurityConfig;
  install: boolean;
  git: boolean;
};

export type ProvidedOptions = {
  [Key in keyof Omit<GeneratorOptions, 'deployments' | 'security'>]?: GeneratorOptions[Key] | undefined;
} & {
  yes: boolean;
  deployments?: unknown[];
  securityTxt?: boolean;
  securityContacts?: string[];
  securityExpires?: string;
};

export const defaultDescription = 'A content-driven website built with Forge';
export const defaultUrl = 'https://example.com';

export const derivePackageName = (destination: string) => {
  return basename(resolve(destination)) || 'forge-site';
};

export const humanizePackageName = (packageName: string) => {
  const unscopedName = packageName.split('/').at(-1) ?? packageName;
  return unscopedName
    .split(packageNameWordSeparatorPattern)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
};
import { basename, resolve } from 'node:path';

const packageNameWordSeparatorPattern = /[-_\s]+/u;
