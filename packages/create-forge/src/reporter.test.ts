import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { GeneratorOptions } from './options';
import { formatCompletion, supportsColor } from './reporter';

const options: GeneratorOptions = {
  destination: 'generated-site',
  packageName: 'generated-site',
  siteName: 'Generated Site',
  description: 'A generated site',
  author: '',
  url: 'https://example.com',
  repository: '',
  install: true,
  git: true,
};

describe('completion output', () => {
  test('reports completed setup and path-aware commands without color', () => {
    expect(
      formatCompletion(options, {
        destination: join('/workspace', 'generated-site'),
        cwd: '/workspace',
        color: false,
      }),
    ).toMatchInlineSnapshot(`
      "✓ Created Generated Site in generated-site

      Setup
        Dependencies: installed
        Git repository: initialized

      Next steps
        cd generated-site
        npm run dev
      "
    `);
  });

  test('prints only commands still needed for skipped setup', () => {
    expect(
      formatCompletion(
        { ...options, install: false, git: false },
        { destination: '/workspace/site with spaces', cwd: '/workspace', color: false },
      ),
    ).toMatchInlineSnapshot(`
      "✓ Created Generated Site in site with spaces

      Setup
        Dependencies: skipped
        Git repository: skipped

      Next steps
        cd "site with spaces"
        npm install
        npm run dev
      "
    `);
  });

  test('omits cd when the project was created in the current directory', () => {
    expect(formatCompletion(options, { destination: '/workspace', cwd: '/workspace', color: false }))
      .toMatchInlineSnapshot(`
      "✓ Created Generated Site in .

      Setup
        Dependencies: installed
        Git repository: initialized

      Next steps
        npm run dev
      "
    `);
  });

  test('uses ANSI decoration without changing the wording', () => {
    expect(
      formatCompletion(options, {
        destination: '/workspace/generated-site',
        cwd: '/workspace',
        color: true,
      }),
    ).toMatchInlineSnapshot(`
      "\u001B[32m✓\u001B[39m Created Generated Site in generated-site

      \u001B[1mSetup\u001B[22m
        Dependencies: installed
        Git repository: initialized

      \u001B[1mNext steps\u001B[22m
        cd generated-site
        npm run dev
      "
    `);
  });
});

test('honors NO_COLOR even for a terminal', () => {
  expect(supportsColor({ NO_COLOR: '' }, true)).toBe(false);
  expect(supportsColor({}, true)).toBe(true);
  expect(supportsColor({}, false)).toBe(false);
});
