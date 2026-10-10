import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { generateCi, type CiJob, type CiPipeline, type CiPinResolver } from '@zuke/core';

import { createCiPinResolver } from '../src/ci/pins.ts';
import { checks } from '../src/ci/plan.ts';

const repository = new URL('../../../', import.meta.url);
const workflows: Record<string, string> = {};
for (const name of ['project.yml', 'automation.yml']) {
  workflows[name] = readFileSync(new URL(`.github/workflows/${name}`, repository), 'utf8');
}
workflows['setup-project/action.yml'] = readFileSync(
  new URL('.github/actions/setup-project/action.yml', repository),
  'utf8',
);
const pins = createCiPinResolver(workflows) satisfies CiPinResolver;
export const pipeline = {
  name: 'Project CI',
  triggers: { push: [], pullRequest: [] },
  permissions: {},
  concurrency: {
    group: '${{ github.workflow }}-${{ github.ref }}',
    cancelInProgress: true,
  },
  bootstrap: false,
  jobs: checks.map(({ id, runtimes, commands }): CiJob => ({
    id,
    runsOn: 'ubuntu-latest',
    permissions: { contents: 'read' },
    matrix: { node: runtimes },
    failFast: false,
    steps: [
      {
        uses: pins('actions/checkout'),
        with: { 'persist-credentials': 'false' },
      },
      {
        uses: pins('actions/setup-node'),
        with: { 'node-version': '${{ matrix.node }}', cache: 'npm' },
      },
      { run: 'npm ci' },
      ...commands.map((run) => ({ run })),
    ],
  })),
} satisfies CiPipeline;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = new URL('../src/ci/github.yml', import.meta.url);
  const generated = generateCi(pipeline, 'github');
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== generated) {
      throw new Error(
        'Generated GitHub CI is stale; run npm run ci:generate -w @rm-industries/create-forge and commit the output',
      );
    }
  } else {
    writeFileSync(output, generated);
  }
}
