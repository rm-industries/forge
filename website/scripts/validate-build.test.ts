import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { documentation } from '../src/config/documentation.ts';
import { validateBuild } from './validate-build';

const requiredPaths = [
  '404.html',
  'docs/index.html',
  'docs/getting-started/index.html',
  'index.html',
  'packages/index.html',
  'project/index.html',
  'robots.txt',
  'site.webmanifest',
  'sitemap-index.xml',
] as const;

const fixtures: string[] = [];

const createFixture = async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'forge-build-output-'));
  fixtures.push(fixture);
  for (const path of [...requiredPaths, ...documentation.map(({ id }) => `docs/${id}/index.html`)]) {
    const output = join(fixture, path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, path.endsWith('.html') ? '<!doctype html><main>Forge</main>' : 'Forge\n');
  }
  return fixture;
};

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

describe('generated build validation', () => {
  test('accepts the complete neutral output fixture', async () => {
    await expect(validateBuild(await createFixture())).resolves.toBeUndefined();
  });

  test('reports a missing required output path', async () => {
    const fixture = await createFixture();
    await rm(join(fixture, 'site.webmanifest'));
    await expect(validateBuild(fixture)).rejects.toThrow('site.webmanifest');
  });

  test('rejects documentation outside the publication registry', async () => {
    const fixture = await createFixture();
    const path = join(fixture, 'docs/unregistered/index.html');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, '<h1>Unregistered document</h1>');
    await expect(validateBuild(fixture)).rejects.toThrow('docs/unregistered/index.html');
  });

  test.each(['admin/index.html', 'articles/example/index.html', 'rss.xml', 'feed.xml'])(
    'rejects CMS and blog output: %s',
    async (path) => {
      const fixture = await createFixture();
      const output = join(fixture, path);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, 'Unexpected application output');
      await expect(validateBuild(fixture)).rejects.toThrow(path);
    },
  );

  test.each(['about/index.html', 'features/index.html', 'unexpected/index.html', 'docs/readme/index.html'])(
    'rejects unexpected public HTML: %s',
    async (path) => {
      const fixture = await createFixture();
      const output = join(fixture, path);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, '<h1>Unexpected publication</h1>');
      await expect(validateBuild(fixture)).rejects.toThrow(path);
    },
  );

  test('rejects unresolved generator tokens', async () => {
    const fixture = await createFixture();
    const unresolvedToken = '__FORGE_' + 'SITE_NAME__';
    await writeFile(join(fixture, 'index.html'), `<p>${unresolvedToken}</p>`);
    await expect(validateBuild(fixture)).rejects.toThrow(unresolvedToken);
  });
});
