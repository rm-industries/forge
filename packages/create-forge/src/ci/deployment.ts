import { z } from 'zod';

const environmentNamePattern = /^[a-z][a-z0-9-]*$/;
const invalidBranchCharacterPattern = /[~^:?*$[\]\\]/u;
const hasControlOrSpace = (value: string) => [...value].some((character) => character <= ' ' || character === '\u007f');
const expressionMarkerPattern = /\$\{\{|\$\{/;

const sourceBranchSchema = z
  .string()
  .min(1)
  .refine(
    (branch) =>
      !hasControlOrSpace(branch) &&
      !invalidBranchCharacterPattern.test(branch) &&
      !expressionMarkerPattern.test(branch) &&
      !branch.startsWith('-') &&
      !branch.startsWith('refs/') &&
      branch !== '@' &&
      !branch.includes('..') &&
      !branch.includes('@{') &&
      branch
        .split('/')
        .every((part) => part.length > 0 && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock')),
    'Invalid deployment source branch',
  );
const deploymentUrlSchema = z
  .string()
  .refine((value) => !hasControlOrSpace(value) && !value.includes('$'), 'Invalid deployment URL')
  .pipe(z.url())
  .refine((value) => {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !expressionMarkerPattern.test(value)
    );
  }, 'Invalid deployment URL');

export const deploymentEnvironmentSchema = z.strictObject({
  name: z.string().regex(environmentNamePattern, 'Invalid deployment environment name').max(80),
  sourceBranch: sourceBranchSchema,
  target: z.enum(['github-pages', 'gitlab-pages']),
  url: deploymentUrlSchema.optional(),
});
export type DeploymentEnvironment = z.infer<typeof deploymentEnvironmentSchema>;
export const deploymentPlanSchema = z
  .array(deploymentEnvironmentSchema)
  .max(1, 'Native Pages supports one deployment environment in this iteration');

export function resolveDeployments(
  input: unknown[] | undefined,
  primary: 'github' | 'gitlab' | undefined,
): DeploymentEnvironment[] {
  if (input === undefined)
    return primary ? [{ name: 'production', sourceBranch: 'main', target: `${primary}-pages` }] : [];
  const result = deploymentPlanSchema.safeParse(input);
  if (!result.success)
    throw new Error(`Invalid deployment: ${result.error.issues.map((issue) => issue.message).join('; ')}`);
  if (result.data.length && (!primary || result.data[0]!.target !== `${primary}-pages`))
    throw new Error('Deployment target requires the matching primary CI provider');
  return result.data;
}
