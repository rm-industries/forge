import { parseDocument } from 'yaml';
import { z } from 'zod';

import { imageSchema, nonEmptyStringSchema, nonEmptyStringsSchema } from './model.ts';

const githubActionReferencePattern = /^(?:\$\/|\.\/)[^\s]+$|^[^@\s]+@[a-f0-9]{40}$/;

const values = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const condition = z.union([z.string(), z.boolean()]);
const permissions = z.partialRecord(
  z.enum([
    'actions',
    'checks',
    'contents',
    'deployments',
    'discussions',
    'id-token',
    'issues',
    'packages',
    'pages',
    'pull-requests',
    'security-events',
    'statuses',
    'attestations',
    'models',
  ]),
  z.enum(['read', 'write', 'none']),
);
const stepFields = {
  name: nonEmptyStringSchema.optional(),
  id: nonEmptyStringSchema.optional(),
  if: condition.optional(),
  env: values.optional(),
  'continue-on-error': z.boolean().optional(),
};
const githubStepSchema = z.union([
  z.strictObject({
    ...stepFields,
    run: nonEmptyStringSchema,
    shell: nonEmptyStringSchema.optional(),
    'working-directory': nonEmptyStringSchema.optional(),
  }),
  z.strictObject({
    ...stepFields,
    uses: z.string().regex(githubActionReferencePattern),
    with: values.optional(),
  }),
]);
const matrix = z.record(
  z.string(),
  z.union([z.array(z.union([z.string(), z.number(), z.boolean()])), z.array(values)]),
);
export const githubJobSchema = z.strictObject({
  name: nonEmptyStringSchema.optional(),
  'runs-on': nonEmptyStringSchema,
  needs: z.array(nonEmptyStringSchema).optional(),
  if: condition.optional(),
  permissions,
  steps: z.array(githubStepSchema).min(1),
  strategy: z.strictObject({ 'fail-fast': z.boolean().optional(), matrix }).optional(),
  environment: z.strictObject({ name: nonEmptyStringSchema, url: nonEmptyStringSchema.optional() }).optional(),
  outputs: z.record(z.string(), nonEmptyStringSchema).optional(),
});
const event = z
  .strictObject({ branches: z.array(nonEmptyStringSchema).optional(), paths: z.array(nonEmptyStringSchema).optional() })
  .nullable();
export const githubWorkflowSchema = z
  .strictObject({
    name: nonEmptyStringSchema,
    on: z.strictObject({
      push: event.optional(),
      pull_request: event.optional(),
      schedule: z.array(z.strictObject({ cron: nonEmptyStringSchema })).optional(),
      workflow_dispatch: z.null().optional(),
    }),
    permissions,
    concurrency: z.strictObject({ group: nonEmptyStringSchema, 'cancel-in-progress': condition }).optional(),
    defaults: z
      .strictObject({ run: z.strictObject({ shell: nonEmptyStringSchema, 'working-directory': nonEmptyStringSchema }) })
      .optional(),
    jobs: z.record(z.string(), githubJobSchema),
  })
  .superRefine((workflow, context) => {
    if (Object.keys(workflow.on).length === 0 || Object.keys(workflow.jobs).length === 0)
      context.addIssue({ code: 'custom', message: 'Workflow requires a trigger and a job' });
    const visiting = new Set<string>();
    const visited = new Set<string>();
    function visit(id: string) {
      if (visiting.has(id)) {
        context.addIssue({ code: 'custom', message: `Job dependency cycle at ${id}` });
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const need of workflow.jobs[id]!.needs ?? []) {
        if (!workflow.jobs[need]) context.addIssue({ code: 'custom', message: `Unknown job dependency ${need}` });
        else visit(need);
      }
      visiting.delete(id);
      visited.add(id);
    }
    for (const id of Object.keys(workflow.jobs)) visit(id);
  });
const rule = z.strictObject({ if: nonEmptyStringSchema, when: z.enum(['never', 'always', 'on_success']).optional() });
export const gitlabJobSchema = z.strictObject({
  image: imageSchema,
  stage: nonEmptyStringSchema,
  script: nonEmptyStringsSchema,
  allow_failure: z.boolean().optional(),
  needs: z.array(z.strictObject({ job: nonEmptyStringSchema, artifacts: z.boolean() })).optional(),
  artifacts: z
    .strictObject({
      paths: nonEmptyStringsSchema,
      when: z.enum(['always', 'on_success']),
      expire_in: nonEmptyStringSchema,
    })
    .optional(),
});
export const gitlabPipelineSchema = z
  .object({
    workflow: z.strictObject({ rules: z.array(rule).min(1) }),
    stages: nonEmptyStringsSchema,
    default: z.strictObject({ interruptible: z.boolean(), before_script: nonEmptyStringsSchema }),
  })
  .catchall(gitlabJobSchema)
  .superRefine((pipeline, context) => {
    const jobs = Object.keys(pipeline).filter((id) => !['workflow', 'stages', 'default'].includes(id));
    if (!jobs.length) context.addIssue({ code: 'custom', message: 'Pipeline requires a job' });
    for (const id of jobs) {
      const job = gitlabJobSchema.parse(pipeline[id]);
      if (!pipeline.stages.includes(job.stage))
        context.addIssue({ code: 'custom', message: `Unknown stage ${job.stage}` });
      for (const need of job.needs ?? []) {
        if (!jobs.includes(need.job) || need.job === id)
          context.addIssue({ code: 'custom', message: `Invalid dependency ${need.job}` });
        else if (
          pipeline.stages.indexOf(gitlabJobSchema.parse(pipeline[need.job]).stage) >= pipeline.stages.indexOf(job.stage)
        )
          context.addIssue({ code: 'custom', message: `Dependency ${need.job} must precede ${id}` });
      }
    }
  });
export type GithubStep = z.infer<typeof githubStepSchema>;
export type GithubJob = z.infer<typeof githubJobSchema>;
export type GithubWorkflow = z.infer<typeof githubWorkflowSchema>;
export type GitlabJob = z.infer<typeof gitlabJobSchema>;

/** YAML syntax, duplicate keys, and the supported provider fields are checked before writing. */
export function validateCiYaml(schema: z.ZodType, content: string) {
  const document = parseDocument(content, { uniqueKeys: true });
  if (document.errors.length) throw document.errors[0];
  schema.parse(document.toJS());
  return content;
}
