import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findHeadingAnchors, validateCriticalCommands, validateInternalLinks } from './validate-documentation.ts';

const temporaryDirectories: string[] = [];

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-documentation-'));
  temporaryDirectories.push(root);
  await mkdir(join(root, 'docs'));
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { force: true, recursive: true })));
});

describe('documentation validation', () => {
  it('accepts existing files and heading fragments', async () => {
    const root = await fixture();
    await writeFile(join(root, 'README.md'), '[Guide](docs/guide.md#getting-started)\n');
    await writeFile(join(root, 'docs/guide.md'), '# Getting started\n');

    await expect(validateInternalLinks(root)).resolves.toEqual([]);
  });

  it('reports a controlled broken-link fixture', async () => {
    const root = await fixture();
    await writeFile(join(root, 'README.md'), '[Missing](docs/missing.md)\n');

    await expect(validateInternalLinks(root)).resolves.toEqual([
      { file: 'README.md', line: 1, message: 'file not found: docs/missing.md' },
    ]);
  });

  it('reports missing heading fragments', async () => {
    const root = await fixture();
    await writeFile(join(root, 'README.md'), '[Guide](docs/guide.md#missing)\n');
    await writeFile(join(root, 'docs/guide.md'), '# Existing\n');

    await expect(validateInternalLinks(root)).resolves.toEqual([
      { file: 'README.md', line: 1, message: 'heading not found: docs/guide.md#missing' },
    ]);
  });

  it('matches duplicate GitHub-style heading anchors', () => {
    expect(findHeadingAnchors('# Release notes\n## Release notes\n')).toEqual(
      new Set(['release-notes', 'release-notes-1']),
    );
  });

  it('reports stale critical commands', async () => {
    const root = await fixture();
    await writeFile(join(root, 'README.md'), 'npm run old-command\n');
    await writeFile(join(root, 'package.json'), '{"scripts":{"quality":"echo ok"}}\n');

    await expect(
      validateCriticalCommands(root, [
        { command: 'npm run quality', documentation: 'README.md', manifest: 'package.json' },
      ]),
    ).resolves.toEqual([
      {
        file: 'README.md',
        line: 1,
        message: 'critical command is missing or stale: npm run quality',
      },
    ]);
  });
});
