import validateNpmPackageName from 'validate-npm-package-name';

export class InputError extends Error {}

const invalid = (option: string, value: string, reason: string): never => {
  throw new InputError(`Invalid ${option} value ${JSON.stringify(value)}: ${reason}`);
};

export const validateDestination = (value: string) => {
  const destination = value.trim();
  if (!destination) invalid('destination', value, 'provide a non-empty path');
  if (destination.includes('\0')) invalid('destination', value, 'paths cannot contain null bytes');
  return destination;
};

export const validatePackageName = (value: string) => {
  const packageName = value.trim();
  const result = validateNpmPackageName(packageName);
  if (!result.validForNewPackages) {
    const reason = [...(result.errors ?? []), ...(result.warnings ?? [])].join('; ');
    invalid('--name', value, reason || 'provide a valid npm package name');
  }
  return packageName;
};

export const validatePlainText = (option: string, value: string, required = false) => {
  const text = value.trim();
  if (required && !text) invalid(option, value, 'provide non-empty text');
  if (/\p{Cc}/u.test(text)) invalid(option, value, 'control characters are not allowed');
  return text;
};

export const validateUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid('--url', value, 'provide an absolute HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    invalid('--url', value, 'provide an absolute HTTP(S) URL');
  }
  return url.toString();
};

export const validateRepository = (value: string) => {
  const repository = value.trim();
  if (!repository) return repository;
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository)) {
    invalid('--repository', value, 'use the GitHub owner/repository format or leave it empty');
  }
  return repository;
};
