export type CliResult = {
  output: string;
  exitCode: number;
};

const help = `Create a content-driven Forge website.

Usage:
  create-forge [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show the installed package version
`;

export const runCli = (args: readonly string[], version: string): CliResult => {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { output: help, exitCode: 0 };
  }

  if (args.includes('--version') || args.includes('-v')) {
    return { output: `${version}\n`, exitCode: 0 };
  }

  return {
    output: `Unknown option: ${args[0]}\n\n${help}`,
    exitCode: 1,
  };
};
