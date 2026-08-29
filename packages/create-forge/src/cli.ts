import { Command, CommanderError, Option } from 'commander';

import type { GeneratorOptions, ProvidedOptions } from './options';
import { clackPrompts, type PromptAdapter } from './prompts';
import { CancellationError, resolveOptions } from './resolve-options';

export type CliResult = { output: string; exitCode: number; options?: GeneratorOptions };
export type CliContext = { interactive?: boolean; prompts?: PromptAdapter };

const hasBoth = (args: readonly string[], positive: string, negative: string) =>
  args.includes(positive) && args.includes(negative);

const parseArguments = (args: readonly string[], version: string) => {
  let output = '';
  const program = new Command()
    .name('create-forge')
    .description('Create a content-driven Forge website')
    .argument('[destination]', 'directory where the project will be created')
    .option('--name <name>', 'npm package name (defaults to the directory basename)')
    .option('--site-name <name>', 'site name')
    .option('--description <text>', 'site description')
    .option('--author <name>', 'site author')
    .option('--url <url>', 'absolute canonical HTTP(S) URL')
    .option('--repository <owner/repository>', 'GitHub repository or an empty value')
    .addOption(new Option('--install', 'install dependencies'))
    .addOption(new Option('--no-install', 'do not install dependencies'))
    .addOption(new Option('--git', 'initialize a Git repository'))
    .addOption(new Option('--no-git', 'do not initialize a Git repository'))
    .option('-y, --yes', 'use documented defaults without prompting', false)
    .version(version, '-v, --version', 'show the installed package version')
    .helpOption('-h, --help', 'show this help message')
    .showHelpAfterError()
    .allowExcessArguments(false)
    .exitOverride()
    .configureOutput({
      writeOut: (value) => {
        output += value;
      },
      writeErr: (value) => {
        output += value;
      },
    });

  try {
    program.parse(args, { from: 'user' });
  } catch (error) {
    if (error instanceof CommanderError) return { output, exitCode: error.exitCode } as const;
    throw error;
  }

  if (hasBoth(args, '--install', '--no-install')) {
    return { output: 'error: --install cannot be used with --no-install\n', exitCode: 1 } as const;
  }
  if (hasBoth(args, '--git', '--no-git')) {
    return { output: 'error: --git cannot be used with --no-git\n', exitCode: 1 } as const;
  }

  const raw = program.opts();
  const provided: ProvidedOptions = {
    destination: program.args[0],
    packageName: raw.name,
    siteName: raw.siteName,
    description: raw.description,
    author: raw.author,
    url: raw.url,
    repository: raw.repository,
    install: raw.install,
    git: raw.git,
    yes: raw.yes,
  };
  return { provided } as const;
};

export const runCli = async (
  args: readonly string[],
  version: string,
  context: CliContext = {},
): Promise<CliResult> => {
  const parsed = parseArguments(args, version);
  if (!('provided' in parsed)) return parsed;

  try {
    const options = await resolveOptions(parsed.provided, {
      interactive: context.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY),
      prompts: context.prompts ?? clackPrompts,
    });
    return { output: '', exitCode: 0, options };
  } catch (error) {
    if (error instanceof CancellationError) return { output: `${error.message}\n`, exitCode: 1 };
    if (error instanceof Error) return { output: `error: ${error.message}\n`, exitCode: 1 };
    throw error;
  }
};
