import { basename } from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import { runCli } from './cli';
import type { PromptAdapter } from './prompts';

const cancelled = Symbol('cancelled');
const createPrompts = (textValues: Array<string | symbol>, confirmValues: Array<boolean | symbol>) =>
  ({
    text: vi.fn<PromptAdapter['text']>(async () => textValues.shift() ?? ''),
    confirm: vi.fn<PromptAdapter['confirm']>(async () => confirmValues.shift() ?? false),
    isCancel: (value) => value === cancelled,
  }) satisfies PromptAdapter;

describe('CLI argument parsing', () => {
  test('prints help without prompting', async () => {
    const prompts = createPrompts([], []);
    const result = await runCli(['--help'], '0.3.0-alpha.0', { interactive: true, prompts });
    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "output": "Usage: create-forge [options] [destination]

      Create a content-driven Forge website

      Arguments:
        destination                      directory where the project will be created

      Options:
        --repository-root <path>         repository root (defaults to the project
                                         directory)
        --ci-prefix <name>               workflow filename prefix (defaults to the
                                         relative project directory)
        --ci-providers <providers>       comma-separated CI providers: github,gitlab
                                         (default: github)
        --primary-ci <provider>          primary CI provider (defaults to github when
                                         enabled)
        --node-version <major>           Node.js major for generated CI: 22,24,26
                                         (default: 26)
        --name <name>                    npm package name (defaults to the directory
                                         basename)
        --site-name <name>               site name
        --description <text>             site description
        --author <name>                  site author
        --url <url>                      absolute canonical HTTP(S) URL
        --repository <owner/repository>  GitHub repository or an empty value
        --install                        install dependencies
        --no-install                     do not install dependencies
        --git                            initialize a Git repository
        --no-git                         do not initialize a Git repository
        -y, --yes                        use documented defaults without prompting
                                         (default: false)
        -v, --version                    show the installed package version
        -h, --help                       show this help message
      ",
      }
    `);
    expect(prompts.text).not.toHaveBeenCalled();
  });

  test('accepts a workflow prefix without another prompt', async () => {
    const result = await runCli(['website', '--yes', '--ci-prefix', 'docs-site'], '1.0.3', { interactive: false });
    expect(result).toMatchObject({ exitCode: 0, options: { ciPrefix: 'docs-site' } });
  });

  test.each(['../outside', 'site.yml', 'Site', '', 'a'.repeat(81)])(
    'rejects unsafe workflow prefix %s',
    async (prefix) => {
      const result = await runCli(['website', '--yes', '--ci-prefix', prefix], '1.0.3', { interactive: false });
      expect(result).toMatchObject({ exitCode: 1, output: expect.stringContaining('CI prefix') });
    },
  );

  test('selects either or both CI providers independently of repository metadata', async () => {
    expect(await runCli(['site', '--yes', '--ci-providers', 'gitlab'], '1.0.3')).toMatchObject({
      exitCode: 0,
      options: { ciProviders: ['gitlab'] },
    });
    expect(
      await runCli(['site', '--yes', '--ci-providers', 'github,gitlab', '--primary-ci', 'gitlab'], '1.0.3'),
    ).toMatchObject({ exitCode: 0, options: { ciProviders: ['github', 'gitlab'], primaryCi: 'gitlab' } });
  });
  test.each([
    ['--ci-providers', ''],
    ['--ci-providers', 'other'],
    ['--ci-providers', 'github,github'],
    ['--ci-providers', 'gitlab', '--primary-ci', 'github'],
  ])('rejects invalid CI selection %s', async (...args) => {
    expect(await runCli(['site', '--yes', ...args], '1.0.3')).toMatchObject({ exitCode: 1 });
  });

  test('accepts a hidden CI fixture directory with an explicit valid package name', async () => {
    expect(
      await runCli(
        [
          '.ci-review-fixture',
          '--name',
          'ci-review-fixture',
          '--yes',
          '--no-install',
          '--no-git',
          '--ci-providers',
          'github,gitlab',
        ],
        '1.0.3',
      ),
    ).toMatchObject({ exitCode: 0, options: { packageName: 'ci-review-fixture' } });
  });
  test('selects one supported runtime for generated CI', async () => {
    expect(await runCli(['site', '--yes', '--node-version', '24'], '1.0.3')).toMatchObject({
      exitCode: 0,
      options: { nodeVersion: '24' },
    });
    expect((await runCli(['site', '--yes', '--node-version', '20'], '1.0.3')).output).toContain('22,24,26');
  });
  test('prints the installed package version', async () => {
    await expect(runCli(['--version'], '0.3.0-alpha.0')).resolves.toEqual({ output: '0.3.0-alpha.0\n', exitCode: 0 });
  });

  test('uses documented defaults in --yes mode without prompting', async () => {
    const prompts = createPrompts([], []);
    const result = await runCli(['my-forge-site', '--yes'], '0.3.0-alpha.0', { interactive: false, prompts });
    expect(result).toEqual({
      output: '',
      exitCode: 0,
      options: {
        destination: 'my-forge-site',
        repositoryRoot: 'my-forge-site',
        packageName: 'my-forge-site',
        siteName: 'My Forge Site',
        description: 'A content-driven website built with Forge',
        author: '',
        url: 'https://example.com/',
        repository: '',
        install: true,
        git: true,
      },
    });
    expect(prompts.text).not.toHaveBeenCalled();
    expect(prompts.confirm).not.toHaveBeenCalled();
  });

  test('uses the current directory when --yes omits a destination', async () => {
    const result = await runCli(['--yes'], '0.3.0-alpha.0', { interactive: false });
    expect(result).toMatchObject({
      exitCode: 0,
      options: { destination: '.', packageName: basename(process.cwd()) },
    });
  });

  test('accepts a fully specified non-interactive invocation', async () => {
    const result = await runCli(
      [
        'site-directory',
        '--repository-root',
        '.',
        '--name',
        '@example/site',
        '--site-name',
        'Example Site',
        '--description',
        'An example',
        '--author',
        'Example Author',
        '--url',
        'https://example.test',
        '--repository',
        'example/site',
        '--no-install',
        '--no-git',
      ],
      '0.3.0-alpha.0',
      { interactive: false },
    );
    expect(result).toMatchObject({
      exitCode: 0,
      options: {
        destination: 'site-directory',
        repositoryRoot: '.',
        packageName: '@example/site',
        siteName: 'Example Site',
        install: false,
        git: false,
      },
    });
  });

  test('rejects unknown options with an actionable error', async () => {
    const result = await runCli(['--unknown'], '0.3.0-alpha.0');
    expect(result).toMatchObject({ output: expect.stringContaining("unknown option '--unknown'"), exitCode: 1 });
  });

  test('names invalid option values', async () => {
    await expect(runCli(['site', '--yes', '--url', 'ftp://example.com'], '0.3.0-alpha.0')).resolves.toEqual({
      output: 'error: Invalid --url value "ftp://example.com": provide an absolute HTTP(S) URL\n',
      exitCode: 1,
    });
  });

  test('never waits for input in a non-interactive environment', async () => {
    const result = await runCli(['site'], '0.3.0-alpha.0', { interactive: false });
    expect(result).toMatchObject({
      output: expect.stringContaining('Non-interactive use requires --yes'),
      exitCode: 1,
    });
  });
});

describe('interactive prompts', () => {
  test('collects missing project values', async () => {
    const prompts = createPrompts(
      [
        'sample-site',
        'sample-site',
        'Sample Site',
        'A sample site',
        'Sample Author',
        'https://sample.test',
        'sample/site',
      ],
      [false, true],
    );
    const result = await runCli([], '0.3.0-alpha.0', { interactive: true, prompts });
    expect(result).toMatchObject({
      exitCode: 0,
      options: { destination: 'sample-site', siteName: 'Sample Site', install: false, git: true },
    });
    expect(prompts.text).toHaveBeenCalledTimes(7);
    expect(prompts.confirm).toHaveBeenCalledTimes(2);
  });

  test('stops cleanly when a prompt is cancelled', async () => {
    const prompts = createPrompts([cancelled], []);
    await expect(runCli([], '0.3.0-alpha.0', { interactive: true, prompts })).resolves.toEqual({
      output: 'Project creation cancelled.\n',
      exitCode: 1,
    });
  });
});
