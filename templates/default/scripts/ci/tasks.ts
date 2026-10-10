import { execFileSync } from 'node:child_process';

import { discoverTargets, target, type Build, type CiInvocation, type CiStep, type TargetBuilder } from '@zuke/core';

export const npmTask = (script: string, cwd: string) =>
  target().executes(() => {
    execFileSync('npm', ['run', script], { cwd, stdio: 'inherit' });
  });

export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/** CI runs the same target as local execution; only its runner setup differs. */
export function invoke(
  build: Build,
  task: TargetBuilder,
  directory: string,
  before: CiStep[],
  options: Omit<CiInvocation, 'target' | 'steps' | 'before'> & Pick<CiStep, 'continueOnError'> = {},
): CiInvocation {
  const { continueOnError, ...runner } = options;
  discoverTargets(build);
  if (task.name_ === undefined) throw new Error('CI target must belong to the build');
  const command = directory === '.' ? 'npm run pipeline' : `npm --prefix ${shellQuote(directory)} run pipeline`;
  return {
    target: task,
    before,
    steps: [{ name: `Run ${task.name_}`, run: `${command} -- ${shellQuote(task.name_)}`, continueOnError }],
    ...runner,
  };
}

export function packageChecks(cwd: string) {
  const typecheck = npmTask('typecheck', cwd);
  const test = npmTask('test', cwd);
  const build = npmTask('build', cwd);
  const quality = target()
    .dependsOn(typecheck, test, build)
    .executes(() => {});
  return { typecheck, test, build, quality };
}
