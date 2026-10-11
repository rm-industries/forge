import { describe, expect, test } from 'vitest';
import { Document } from 'yaml';

import { configSchema } from './config.ts';
import { createGithubWorkflows } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { defineWork, siteWork, workOrder } from './model.ts';
import { githubJobSchema, githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

const config = configSchema.parse({
  directory: 'website',
  repositoryRoot: '..',
  prefix: 'website',
  providers: ['github', 'gitlab'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
});
const pins = (action: string) => ({ ref: `${action}@${'a'.repeat(40)}` });

describe('shared work and provider rendering', () => {
  test('validates dependencies and computes an order with each prerequisite once', () => {
    expect(() => defineWork({ a: { name: 'A', commands: ['true'], needs: ['missing'] } })).toThrow(
      'Unknown dependency',
    );
    expect(() =>
      defineWork({
        a: { name: 'A', commands: ['true'], needs: ['b'] },
        b: { name: 'B', commands: ['true'], needs: ['a'] },
      }),
    ).toThrow('cycle');
    const order = workOrder(siteWork, ['browser-tests', 'lighthouse']);
    expect(order.filter((id) => id === 'build')).toHaveLength(1);
    expect(order.indexOf('unit-tests')).toBeLessThan(order.indexOf('build'));
    expect(() => workOrder(siteWork, ['missing'])).toThrow('Unknown target');
  });
  test('keeps Pages in the validated run and preserves native environments and outputs', () => {
    const { project } = createGithubWorkflows(config, pins);
    expect(project.on).not.toHaveProperty('workflow_run');
    expect(project.jobs.deploy!.needs).toEqual(['project']);
    expect(project.jobs.deploy!.environment!.name).toBe('github-pages');
    expect(project.jobs.deploy!.outputs!['page-url']).toBe('${{ steps.deployment.outputs.page_url }}');
    expect(project.jobs.project!.if).toBe('always()');
    expect(project.jobs.project!.needs).toContain('compatibility');
    expect(project.jobs['browser-tests']!.steps.some((step) => 'run' in step && step.run === 'npm run build')).toBe(
      false,
    );
    expect(
      project.jobs['browser-tests']!.steps.some(
        (step) => 'uses' in step && step.uses.startsWith('actions/download-artifact@'),
      ),
    ).toBe(true);
    expect(project.defaults!.run['working-directory']).toBe('website');
    expect(validateCiYaml(githubWorkflowSchema, new Document(project).toString())).toContain('github-pages');
  });
  test('renders GitLab dependencies, artifact paths, compatibility and duplicate pipeline suppression', () => {
    const pipeline = createGitlabPipeline(config, Object.fromEntries(Object.entries(siteWork).reverse()));
    expect(pipeline.stages).toEqual(['check-0', 'check-1', 'check-2']);
    const browser = pipeline['browser-tests'];
    expect(browser).toMatchObject({
      needs: [{ job: 'build', artifacts: true }],
      stage: 'check-2',
      artifacts: { paths: ['website/playwright-report', 'website/test-results'] },
    });
    expect(pipeline.compatibility).toMatchObject({
      image: 'node:$NODE_VERSION',
      parallel: { matrix: [{ NODE_VERSION: ['22.22.2', '22', '24', '26'] }] },
    });
    expect(pipeline.workflow.rules[2]).toMatchObject({ when: 'never' });
    validateCiYaml(gitlabPipelineSchema, new Document(pipeline).toString());
    expect(() =>
      gitlabPipelineSchema.parse({
        ...pipeline,
        build: { ...pipeline.build, needs: [{ job: 'browser-tests', artifacts: true }] },
      }),
    ).toThrow('must precede');
  });
  test('keeps deployment exclusive to the primary provider', () => {
    expect(createGithubWorkflows({ ...config, primary: 'gitlab' }, pins).project.jobs).not.toHaveProperty('deploy');
    const { primary: _primary, ...validationOnly } = config;
    expect(createGithubWorkflows(validationOnly, pins).project.jobs).not.toHaveProperty('deploy');
  });
  test('rejects malformed YAML, unknown provider fields, mutable actions, and dangling job dependencies', () => {
    expect(() => validateCiYaml(githubWorkflowSchema, 'name: one\nname: two\n')).toThrow(/unique/i);
    const workflow = createGithubWorkflows(config, pins).project;
    expect(() => githubWorkflowSchema.parse({ ...workflow, unexpected: true })).toThrow(
      /duplicate|Unrecognized|Invalid/i,
    );
    expect(() =>
      githubJobSchema.parse({ ...workflow.jobs.format, steps: [{ uses: 'actions/checkout@main' }] }),
    ).toThrow(/duplicate|Unrecognized|Invalid/i);
    expect(() =>
      githubWorkflowSchema.parse({
        ...workflow,
        jobs: { ...workflow.jobs, format: { ...workflow.jobs.format, needs: ['missing'] } },
      }),
    ).toThrow('Unknown job dependency');
  });
});
