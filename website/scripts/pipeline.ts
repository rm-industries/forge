import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { run } from '@zuke/core';

import { loadConfig, loadPins } from '../../templates/default/scripts/ci/load.ts';
import { createSiteBuild } from '../../templates/default/scripts/ci/site.ts';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const config = loadConfig(projectRoot);
config.repositoryRoot = resolve(projectRoot, config.repositoryRoot);
await run(createSiteBuild(projectRoot, config, loadPins(projectRoot, config.repositoryRoot, config.prefix)), {
  args: process.argv.slice(2).length ? process.argv.slice(2) : ['quality'],
});
