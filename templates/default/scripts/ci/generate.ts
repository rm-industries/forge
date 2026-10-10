import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverCiFiles, syncCiFiles } from '@zuke/core';

import { loadConfig, loadPins } from './load.ts';
import { createSiteBuild } from './site.ts';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const config = loadConfig(projectRoot);
const repositoryRoot = resolve(projectRoot, config.repositoryRoot);
const pins = loadPins(projectRoot, repositoryRoot, config.prefix);
const output = process.argv.indexOf('--output-root');
if (output !== -1) {
  const path = process.argv[output + 1];
  if (!path) throw new TypeError('--output-root requires a path');
  config.repositoryRoot = resolve(path);
} else {
  config.repositoryRoot = repositoryRoot;
}
const Build = createSiteBuild(projectRoot, config, pins);
const results = await syncCiFiles(discoverCiFiles(new Build()), { check: process.argv.includes('--check') });
if (results.some(({ status }) => status === 'stale')) throw new Error('Generated CI is stale; run npm run ci:generate');
