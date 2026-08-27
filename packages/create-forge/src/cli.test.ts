import { describe, expect, test } from 'vitest';

import { runCli } from './cli';

describe('initializer scaffold', () => {
  test('prints help when invoked without arguments', () => {
    expect(runCli([], '0.3.0-alpha.0')).toEqual({
      output: expect.stringContaining('Usage:\n  create-forge [options]'),
      exitCode: 0,
    });
  });

  test('prints the installed package version', () => {
    expect(runCli(['--version'], '0.3.0-alpha.0')).toEqual({
      output: '0.3.0-alpha.0\n',
      exitCode: 0,
    });
  });

  test('rejects options reserved for the argument-parsing task', () => {
    expect(runCli(['--unknown'], '0.3.0-alpha.0')).toMatchObject({
      output: expect.stringContaining('Unknown option: --unknown'),
      exitCode: 1,
    });
  });
});
