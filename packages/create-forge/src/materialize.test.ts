import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { MaterializationError, materializeProject } from './materialize';
import type { GeneratorOptions } from './options';
import { templateTokens } from './template-tokens';

const fixtures: string[] = [];
const binaryFixture = Uint8Array.from([0, 255, 12, 128, 64]);
const options: GeneratorOptions = {
  destination: 'generated-site',
  packageName: '@example/generated-site',
  siteName: 'Generated Site',
  description: 'A generated site',
  author: 'Example Author',
  url: 'https://generated.example',
  repository: 'example/generated-site',
  install: false,
  git: false,
};

const createTemplate = async (fixture: string) => {
  const template = join(fixture, 'template');
  await mkdir(join(template, 'src', 'config'), { recursive: true });
  await mkdir(join(template, 'public'));
  await writeFile(join(template, '.editorconfig'), 'root = true\n');
  await writeFile(join(template, '.gitignore.template'), 'node_modules\n');
  await writeFile(join(template, 'public', 'asset.bin'), binaryFixture);
  await writeFile(
    join(template, 'package.json'),
    `${JSON.stringify({ name: templateTokens.packageName, version: '9.9.9', private: false }, undefined, 2)}\n`,
  );
  await writeFile(
    join(template, 'package-lock.json'),
    `${JSON.stringify({ name: templateTokens.packageName, version: '9.9.9', packages: { '': { name: templateTokens.packageName, version: '9.9.9' } } }, undefined, 2)}\n`,
  );
  await writeFile(
    join(template, 'src', 'config', 'site.ts'),
    `export const site = {\n  name: '${templateTokens.siteName}',\n  description: '${templateTokens.description}',\n  author: '${templateTokens.author}',\n  url: '${templateTokens.url}',\n  repository: '${templateTokens.repository}',\n};\n`,
  );
  return template;
};

const createFixture = async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'create-forge-materialize-'));
  fixtures.push(fixture);
  return { fixture, template: await createTemplate(fixture) };
};

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })));
});

describe('template materialization', () => {
  test.each(['generated site', 'サイト-站点', join('nested', 'generated-site')])(
    'creates missing destination %s with customized metadata',
    async (destination) => {
      const { fixture, template } = await createFixture();
      const result = await materializeProject(
        { ...options, destination },
        { templateDirectory: template, cwd: fixture },
      );
      const generated = join(fixture, destination);
      const metadata = JSON.parse(await readFile(join(generated, 'package.json'), 'utf8')) as Record<string, unknown>;
      const site = await readFile(join(generated, 'src', 'config', 'site.ts'), 'utf8');

      expect(result.destination).toBe(generated);
      expect(metadata).toMatchObject({ name: options.packageName, version: '0.0.0', private: true });
      expect(site).toContain("name: 'Generated Site'");
      expect(site).toContain("repository: 'example/generated-site'");
      await expect(access(join(generated, '.editorconfig'))).resolves.toBeUndefined();
      await expect(readFile(join(generated, '.gitignore'), 'utf8')).resolves.toBe('node_modules\n');
      await expect(access(join(generated, '.gitignore.template'))).rejects.toMatchObject({ code: 'ENOENT' });
      expect(await readFile(join(generated, 'public', 'asset.bin'))).toEqual(Buffer.from(binaryFixture));
    },
  );

  test('escapes generated TypeScript strings while preserving template formatting', async () => {
    const { fixture, template } = await createFixture();
    await materializeProject(
      { ...options, author: "O'Reilly \\ Studio" },
      { templateDirectory: template, cwd: fixture },
    );

    const site = await readFile(join(fixture, options.destination, 'src', 'config', 'site.ts'), 'utf8');
    expect(site).toContain("author: 'O\\'Reilly \\\\ Studio'");
  });

  test('uses an existing empty destination', async () => {
    const { fixture, template } = await createFixture();
    const destination = join(fixture, options.destination);
    await mkdir(destination);
    await expect(materializeProject(options, { templateDirectory: template, cwd: fixture })).resolves.toMatchObject({
      destination,
    });
  });

  test('does not touch a non-empty destination without confirmation', async () => {
    const { fixture, template } = await createFixture();
    const destination = join(fixture, options.destination);
    await mkdir(destination);
    await writeFile(join(destination, 'existing.txt'), 'keep me');

    await expect(materializeProject(options, { templateDirectory: template, cwd: fixture })).rejects.toThrow(
      /is not empty\. No files were changed/,
    );
    await expect(readFile(join(destination, 'existing.txt'), 'utf8')).resolves.toBe('keep me');
  });

  test('preserves unrelated files after explicit conflict confirmation', async () => {
    const { fixture, template } = await createFixture();
    const destination = join(fixture, options.destination);
    await mkdir(destination);
    await writeFile(join(destination, 'existing.txt'), 'keep me');

    await materializeProject(options, {
      templateDirectory: template,
      cwd: fixture,
      confirmOverwrite: async () => true,
    });
    await expect(readFile(join(destination, 'existing.txt'), 'utf8')).resolves.toBe('keep me');
  });

  test('rejects a symbolic-link collision without changing its target', async () => {
    const { fixture, template } = await createFixture();
    const destination = join(fixture, options.destination);
    const external = join(fixture, 'external');
    await mkdir(destination);
    await mkdir(external);
    await writeFile(join(external, 'site.ts'), 'external contents');
    await symlink(external, join(destination, 'src'));

    await expect(
      materializeProject(options, { templateDirectory: template, cwd: fixture, confirmOverwrite: async () => true }),
    ).rejects.toThrow(/Unsafe destination entry/);
    await expect(readFile(join(external, 'site.ts'), 'utf8')).resolves.toBe('external contents');
  });

  test.each(['../outside', 'nested/../outside'])('rejects traversal destination %s', async (destination) => {
    const { fixture, template } = await createFixture();
    await expect(
      materializeProject({ ...options, destination }, { templateDirectory: template, cwd: fixture }),
    ).rejects.toThrow(MaterializationError);
    await expect(access(join(fixture, 'outside'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('rolls back created files and reports recovery after interruption', async () => {
    const { fixture, template } = await createFixture();
    const controller = new AbortController();
    await expect(
      materializeProject(options, {
        templateDirectory: template,
        cwd: fixture,
        signal: controller.signal,
        onFileCopied: () => controller.abort(),
      }),
    ).rejects.toThrow(/interrupted.*Recovery: changes from this invocation were rolled back/is);
    await expect(access(join(fixture, options.destination))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('restores overwritten files when customization fails', async () => {
    const { fixture, template } = await createFixture();
    const destination = join(fixture, options.destination);
    await mkdir(destination);
    await writeFile(join(destination, 'package.json'), 'original contents');
    await writeFile(join(template, 'src', 'config', 'site.ts'), 'missing required tokens');

    await expect(
      materializeProject(options, { templateDirectory: template, cwd: fixture, confirmOverwrite: async () => true }),
    ).rejects.toThrow(/Recovery:/);
    await expect(readFile(join(destination, 'package.json'), 'utf8')).resolves.toBe('original contents');
  });
});
