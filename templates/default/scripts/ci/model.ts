import { z } from 'zod';

export const nonEmptyStringSchema = z.string().trim().min(1);
export const nonEmptyStringsSchema = z.array(nonEmptyStringSchema).min(1);
export const imageSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9/_.:@$-]*$/);
const identifier = z.string().regex(/^[a-z][a-z0-9-]*$/);
const workSchema = z.strictObject({
  name: nonEmptyStringSchema,
  commands: nonEmptyStringsSchema,
  needs: z.array(identifier).default([]),
  artifacts: z.array(nonEmptyStringSchema).default([]),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default([]),
  advisory: z.boolean().default(false),
});
export const planSchema = z.record(identifier, workSchema).superRefine((plan, context) => {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) {
      context.addIssue({ code: 'custom', message: `Dependency cycle at ${id}` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of plan[id]!.needs) {
      if (!plan[dependency]) context.addIssue({ code: 'custom', message: `Unknown dependency ${dependency} in ${id}` });
      else visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of Object.keys(plan)) visit(id);
});
export type WorkPlan = z.infer<typeof planSchema>;

export function defineWork(input: z.input<typeof planSchema>): WorkPlan {
  return planSchema.parse(input);
}

export const siteWork = defineWork({
  format: { name: 'Format', commands: ['npm run format'] },
  spellcheck: { name: 'Spellcheck', commands: ['npm run spellcheck'] },
  'lint-code': { name: 'Lint code', commands: ['npm run lint:code'] },
  'lint-styles': { name: 'Lint styles', commands: ['npm run lint:css'] },
  'lint-markdown': { name: 'Lint Markdown', commands: ['npm run lint:markdown'] },
  'audit-unused': { name: 'Audit unused code', commands: ['npm run audit:unused'] },
  typecheck: { name: 'Type-check', commands: ['npm run typecheck'] },
  'dependency-audit': { name: 'Dependency audit', commands: ['npm run audit'], advisory: true },
  'unit-tests': { name: 'Unit tests and coverage', commands: ['npm run test:coverage'], artifacts: ['coverage'] },
  build: {
    name: 'Production build',
    commands: ['npm run build'],
    artifacts: ['dist'],
    needs: [
      'format',
      'spellcheck',
      'lint-code',
      'lint-styles',
      'lint-markdown',
      'audit-unused',
      'typecheck',
      'unit-tests',
    ],
  },
  'validate-build': { name: 'Validate build', commands: ['npm run validate:build'], needs: ['build'] },
  'browser-tests': {
    name: 'Browser and accessibility tests',
    commands: ['npm run test:e2e'],
    needs: ['build'],
    browsers: ['chromium', 'firefox', 'webkit'],
    artifacts: ['playwright-report', 'test-results'],
  },
  lighthouse: {
    name: 'Lighthouse budgets',
    commands: ['npm run lighthouse:ci'],
    needs: ['build'],
    browsers: ['chromium'],
    artifacts: ['.lighthouseci'],
  },
});
