import { z } from 'zod';

import { deploymentPlanSchema, resolveDeployments } from './deployment.ts';

const lineBreakPattern = /[\r\n]/;
const workflowPrefixPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const directory = z
  .string()
  .min(1)
  .refine((value) => !lineBreakPattern.test(value) && !value.includes('${{'), 'Invalid CI directory');
export const generationOptionsSchema = z
  .strictObject({
    directory,
    nodeVersion: z.enum(['22', '24', '26']).default('26'),
    repositoryRoot: directory,
    prefix: z.string().regex(workflowPrefixPattern).max(80).optional(),
    providers: z
      .array(z.enum(['github', 'gitlab']))
      .min(1)
      .refine((providers) => new Set(providers).size === providers.length),
    deployments: deploymentPlanSchema.optional(),
    primary: z.enum(['github', 'gitlab']).optional(),
    securityMinute: z.number().int().min(1).max(59),
    automationMinute: z.number().int().min(1).max(59),
  })
  .refine(
    (config) => config.primary === undefined || config.providers.includes(config.primary),
    'Primary must be an enabled provider',
  )
  .superRefine((config, context) => {
    try {
      resolveDeployments(config.deployments, config.primary);
    } catch (error) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid deployment' });
    }
  });
export type CiGenerationOptions = z.infer<typeof generationOptionsSchema>;
export const workflowPath = (name: string, config: CiGenerationOptions) =>
  `.github/workflows/${config.prefix ? `${config.prefix}-` : ''}${name}.yml`;
export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
