import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Build, run, target } from 'jsr:@zuke/core@1.70.1';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const npmTask = (script: string) =>
  target().executes(() => {
    execFileSync('npm', ['run', script], { cwd: repository, stdio: 'inherit' });
  });

export class LocalBuild extends Build {
  format = npmTask('format');
  lint = npmTask('lint');
  typecheck = npmTask('typecheck');
  test = npmTask('test');
  build = npmTask('build');
  pack = npmTask('pack').dependsOn(this.build);
  quality = target()
    .dependsOn(this.format, this.lint, this.typecheck, this.test, this.pack)
    .executes(() => {});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run(LocalBuild, { args: process.argv.slice(2).length ? process.argv.slice(2) : ['quality'] });
}
