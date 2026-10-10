/** A filename namespace, never a path or provider expression. */
export function validateCiPrefix(value: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) {
    throw new TypeError(
      'CI prefix must contain lowercase letters, numbers, and single hyphens (maximum 80 characters)',
    );
  }
  return value;
}

export function workflowPath(name: string, prefix?: string) {
  validateCiPrefix(name);
  return `.github/workflows/${prefix === undefined ? '' : `${validateCiPrefix(prefix)}-`}${name}.yml`;
}

export function deriveCiPrefix(relativeProjectDirectory: string) {
  if (relativeProjectDirectory === '' || relativeProjectDirectory === '.') return undefined;
  const prefix = relativeProjectDirectory
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!prefix || prefix.length > 80) {
    throw new TypeError('Project directory cannot provide a CI prefix; specify --ci-prefix');
  }
  return validateCiPrefix(prefix);
}
