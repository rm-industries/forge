import { generateCi, type CiJob, type CiPipeline, type CiPinResolver } from 'jsr:@zuke/core@1.70.1';

import { createCiPinResolver } from '../src/ci/pins.ts';
import { checks } from '../src/ci/plan.ts';

const repository = new URL('../../../', import.meta.url);
const workflows: Record<string, string> = {};
for (const name of ['project.yml', 'automation.yml']) {
  workflows[name] = Deno.readTextFileSync(new URL(`.github/workflows/${name}`, repository));
}
workflows['setup-project/action.yml'] = Deno.readTextFileSync(
  new URL('.github/actions/setup-project/action.yml', repository),
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

if (import.meta.main) {
  const output = new URL('../src/ci/github.yml', import.meta.url);
  const generated = generateCi(pipeline, 'github');
  if (Deno.args.includes('--check')) {
    if (Deno.readTextFileSync(output).replace(/\r\n/g, '\n') !== generated) {
      throw new Error(
        'Generated GitHub CI is stale; run npm run ci:generate -w @rm-industries/create-forge and commit the output',
      );
    }
  } else {
    Deno.writeTextFileSync(output, generated);
  }
}
