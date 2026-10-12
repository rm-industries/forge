import { z } from 'zod';

const directory = z
  .string()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value) && !value.includes('${{'), 'Invalid CI directory');
export const configSchema = z
  .strictObject({
    directory,
    repositoryRoot: directory,
    prefix: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80)
      .optional(),
    providers: z
      .array(z.enum(['github', 'gitlab']))
      .min(1)
      .refine((providers) => new Set(providers).size === providers.length),
    primary: z.enum(['github', 'gitlab']).optional(),
    securityMinute: z.number().int().min(1).max(59),
    automationMinute: z.number().int().min(1).max(59),
  })
  .refine(
    (config) => config.primary === undefined || config.providers.includes(config.primary),
    'Primary must be an enabled provider',
  );
export type SiteCiConfig = z.infer<typeof configSchema>;
export const workflowPath = (name: string, config: SiteCiConfig) =>
  `.github/workflows/${config.prefix ? `${config.prefix}-` : ''}${name}.yml`;
export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
