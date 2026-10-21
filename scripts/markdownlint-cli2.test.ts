import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('Markdownlint runner contract', () => {
  it.each(['.', 'templates/default', 'website'])(
    '%s keeps check/fix commands and a scoped frontmatter-capable engine',
    async (directory) => {
      const manifest = JSON.parse(await readFile(`${directory}/package.json`, 'utf8'));
      expect(manifest.scripts['lint:markdown']).toBe('markdownlint-cli2 "**/*.md"');
      expect(manifest.scripts['lint:markdown:fix']).toBe('markdownlint-cli2 --fix "**/*.md"');
      expect(manifest.devDependencies['markdownlint-cli']).toBeUndefined();
      expect(manifest.overrides).toEqual({ 'markdownlint-cli2': { markdownlint: '0.42.0' } });
      expect(await readFile(`${directory}/.markdownlint-cli2.jsonc`, 'utf8')).toMatch(/"gitignore": "\.gitignore"/u);
    },
  );
});
