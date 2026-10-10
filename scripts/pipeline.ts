import { fileURLToPath } from 'node:url';

import { run } from '@zuke/core';

import { loadPins } from '../templates/default/scripts/ci/load.ts';
import { createForgeBuild } from './ci/forge.ts';

const repository = fileURLToPath(new URL('../', import.meta.url));
await run(createForgeBuild(loadPins(repository, repository)), {
  args: process.argv.slice(2).length ? process.argv.slice(2) : ['quality'],
});
