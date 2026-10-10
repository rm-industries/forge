import { parseDocument } from 'yaml';
import { z } from 'zod';

const command = z.string().min(1);
const commands = z.array(command).min(1);
const runtimes = z.array(z.enum(['22.22.2', '22', '24', '26'])).min(1);
const step = z.union([
  z.strictObject({
    uses: z.string().regex(/^actions\/checkout@[a-f0-9]{40}$/),
    with: z.strictObject({ 'persist-credentials': z.union([z.literal(false), z.literal('false')]) }),
  }),
  z.strictObject({
    uses: z.string().regex(/^actions\/setup-node@[a-f0-9]{40}$/),
    with: z.strictObject({ 'node-version': z.literal('${{ matrix.node }}'), cache: z.literal('npm') }),
  }),
  z.strictObject({ run: command }),
]);
const githubJob = z.strictObject({
  'runs-on': z.literal('ubuntu-latest'),
  permissions: z.strictObject({ contents: z.literal('read') }),
  strategy: z.strictObject({
    'fail-fast': z.literal(false),
    matrix: z.strictObject({ node: runtimes }),
  }),
  steps: z.array(step).min(1),
});
const gitlabJob = z.strictObject({
  image: z.literal('node:$NODE_VERSION'),
  parallel: z.strictObject({ matrix: z.array(z.strictObject({ NODE_VERSION: runtimes })).length(1) }),
  script: commands,
});

// These schemas cover Forge's generated validation pipelines, not every provider keyword.
export const ciSchemas = {
  github: z.strictObject({
    name: command,
    on: z.strictObject({
      push: z.union([z.null(), z.strictObject({})]),
      pull_request: z.union([z.null(), z.strictObject({})]),
    }),
    permissions: z.strictObject({}),
    concurrency: z.strictObject({
      group: z.literal('${{ github.workflow }}-${{ github.ref }}'),
      'cancel-in-progress': z.literal(true),
    }),
    jobs: z.strictObject({ quality: githubJob, browser: githubJob }),
  }),
  gitlab: z.strictObject({
    workflow: z.strictObject({
      rules: z.array(z.strictObject({ if: command, when: z.literal('never').optional() })).min(1),
    }),
    default: z.strictObject({ interruptible: z.literal(true), before_script: commands }),
    quality: gitlabJob,
    browser: gitlabJob,
  }),
};

/** Parse emitted text, then reject malformed YAML and unknown or invalid fields. */
export function validateCiYaml(schema: z.ZodType, content: string) {
  const document = parseDocument(content, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw document.errors[0];
  }
  schema.parse(document.toJS());
  return content;
}
