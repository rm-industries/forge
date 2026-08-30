import { isAbsolute, relative } from 'node:path';

import type { GeneratorOptions } from './options';

type CompletionContext = {
  destination: string;
  cwd?: string;
  color?: boolean;
};

const ansi = {
  bold: (value: string) => `\u001B[1m${value}\u001B[22m`,
  green: (value: string) => `\u001B[32m${value}\u001B[39m`,
};

const commandPath = (path: string) => {
  if (/^[\w./@-]+$/u.test(path)) return path;
  return `"${path.replaceAll('"', '\\"')}"`;
};

const displayDestination = (destination: string, cwd: string) => {
  const path = relative(cwd, destination);
  if (!path) return '.';
  return isAbsolute(path) ? destination : path;
};

export const supportsColor = (environment: NodeJS.ProcessEnv = process.env, terminal = Boolean(process.stdout.isTTY)) =>
  terminal && environment.NO_COLOR === undefined;

export const formatCompletion = (options: GeneratorOptions, context: CompletionContext) => {
  const cwd = context.cwd ?? process.cwd();
  const color = context.color ?? supportsColor();
  const decorate = color ? ansi : { bold: (value: string) => value, green: (value: string) => value };
  const destination = displayDestination(context.destination, cwd);
  const commands = [
    ...(destination === '.' ? [] : [`cd ${commandPath(destination)}`]),
    ...(options.install ? [] : ['npm install']),
    'npm run dev',
  ];

  return `${decorate.green('✓')} Created ${options.siteName} in ${destination}\n\n${decorate.bold('Setup')}\n  Dependencies: ${options.install ? 'installed' : 'skipped'}\n  Git repository: ${options.git ? 'initialized' : 'skipped'}\n\n${decorate.bold('Next steps')}\n${commands.map((command) => `  ${command}`).join('\n')}\n`;
};
