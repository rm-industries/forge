import { describe, expect, test } from 'vitest';
import { Document } from 'yaml';

import { generationOptionsSchema } from './generation-options.ts';
import { createGithubWorkflows } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { defineWork, siteWork, nonEmptyStringSchema, nonEmptyStringsSchema, imageSchema } from './model.ts';
import { githubJobSchema, githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

const duplicateYamlKeyMessagePattern = /unique/i;
const invalidProviderDefinitionMessagePattern = /duplicate|Unrecognized|Invalid/i;

const config = generationOptionsSchema.parse({
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
  test('generates one selected runtime without consumer compatibility jobs', () => {
    const selected = generationOptionsSchema.parse({ ...config, nodeVersion: '24' });
    const github = createGithubWorkflows(selected, pins).project;
    expect(github.jobs).not.toHaveProperty('compatibility');
    expect(
      github.jobs.format!.steps.find((step) => 'uses' in step && step.uses.startsWith('actions/setup-node@')),
    ).toMatchObject({ with: { 'node-version': '24' } });
    const gitlab = createGitlabPipeline(selected);
    expect(gitlab).not.toHaveProperty('compatibility');
    expect(gitlab.format).toMatchObject({ image: 'node:24' });
    expect(generationOptionsSchema.parse(config).nodeVersion).toBe('26');
    expect(() => generationOptionsSchema.parse({ ...config, nodeVersion: '20' })).toThrow('Invalid option');
  });
  test('validates reusable strings, command lists and image references', () => {
    expect(nonEmptyStringSchema.parse('  npm run build  ')).toBe('npm run build');
    expect(() => nonEmptyStringSchema.parse('  ')).toThrow('Too small');
    expect(() => nonEmptyStringsSchema.parse([])).toThrow('Too small');
    expect(() => nonEmptyStringsSchema.parse(['true', ' '])).toThrow('Too small');
    expect(imageSchema.parse('node:26')).toBe('node:26');
    expect(() => imageSchema.parse('node:26; echo unsafe')).toThrow('Invalid string: must match pattern');
  });
  test('requires build artifacts before running site build consumers', () => {
    expect(siteWork.build!.artifacts).toContain('dist');
    for (const work of Object.values(siteWork).filter((work) => work.browsers.length > 0))
      expect(work.needs).toContain('build');
  });
  test('filters workflow validation while keeping project and security checks unconditional', () => {
    const workflows = createGithubWorkflows(config, pins);
    for (const event of ['push', 'pull_request'] as const) {
      expect(workflows.automation.on[event]).toEqual({ branches: ['main'], paths: ['.github/**'] });
      expect(workflows.project.on[event]).toEqual({ branches: ['main'] });
      expect(workflows.security.on[event]).toEqual({ branches: ['main'] });
    }
    expect(workflows.automation.on.schedule).toEqual([{ cron: '43 5 * * 1' }]);
  });
  test('rejects missing dependencies and cycles', () => {
    expect(() => defineWork({ a: { name: 'A', commands: ['true'], needs: ['missing'] } })).toThrow(
      'Unknown dependency',
    );
    expect(() =>
      defineWork({
        a: { name: 'A', commands: ['true'], needs: ['b'] },
        b: { name: 'B', commands: ['true'], needs: ['a'] },
      }),
    ).toThrow('cycle');
  });
  test('keeps Pages in the validated run and preserves native environments and outputs', () => {
    const { project } = createGithubWorkflows(config, pins);
    expect(project.on).not.toHaveProperty('workflow_run');
    expect(project.jobs).not.toHaveProperty('project');
    expect(project.jobs.deploy!.needs).toEqual(Object.keys(siteWork));
    expect(project.jobs.deploy!.environment!.name).toBe('github-pages');
    expect(project.jobs.deploy!.outputs!['page-url']).toBe('${{ steps.deployment.outputs.page_url }}');
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
  test('renders GitLab dependencies, artifact paths and duplicate pipeline suppression', () => {
    const pipeline = createGitlabPipeline(config, Object.fromEntries(Object.entries(siteWork).reverse()));
    expect(pipeline.stages).toEqual(['check-0', 'check-1', 'check-2', 'deploy', 'smoke']);
    const browser = pipeline['browser-tests'];
    expect(browser).toMatchObject({
      needs: [{ job: 'build', artifacts: true }],
      stage: 'check-2',
      artifacts: { paths: ['website/playwright-report', 'website/test-results'] },
    });
    expect(pipeline).not.toHaveProperty('compatibility');
    expect(pipeline).not.toHaveProperty('dependency-audit');
    expect(pipeline.build).toHaveProperty('artifacts.when', 'on_success');
    expect(pipeline.workflow.rules[2]).toMatchObject({ when: 'never' });
    validateCiYaml(gitlabPipelineSchema, new Document(pipeline).toString());
    expect(() =>
      gitlabPipelineSchema.parse({
        ...pipeline,
        build: { ...pipeline.build, needs: [{ job: 'browser-tests', artifacts: true }] },
      }),
    ).toThrow('must precede');
  });
  test('fails dependency review on high severity findings instead of treating it as advisory', () => {
    const review = createGithubWorkflows(config, pins).security.jobs['dependency-review']!;
    expect(review.if).toBe("github.event_name == 'pull_request'");
    const action = review.steps.find(
      (step) => 'uses' in step && step.uses.startsWith('actions/dependency-review-action@'),
    );
    expect(action).toMatchObject({ with: { 'fail-on-severity': 'high' } });
    expect(action).not.toHaveProperty('continue-on-error');
  });
  test('bounds smoke tests and rejects a missing deployment URL before running them', () => {
    const smoke = createGithubWorkflows(config, pins).project.jobs['smoke-deployed']!;
    expect(smoke).toHaveProperty('timeout-minutes', 10);
    expect(smoke.steps.find((step) => 'run' in step && step.run.includes('npm run test:smoke'))).toMatchObject({
      run: 'test -n "$DEPLOYMENT_URL"\nnpm run test:smoke',
    });
    const gitlab = createGitlabPipeline({ ...config, primary: 'gitlab' });
    expect(gitlab['smoke-deployed']).toMatchObject({ timeout: '10m' });
    expect(gitlab['smoke-deployed']!.script).toContain('test -n "$CI_PAGES_URL"');
  });
  test('keeps deployment exclusive to the primary provider', () => {
    const github = createGithubWorkflows({ ...config, primary: 'gitlab' }, pins).project;
    expect(github.jobs.deploy!.if).toBe(false);
    expect(github.jobs['smoke-deployed']!.if).toBe(false);
    expect(
      github.jobs.build!.steps.find((step) => 'uses' in step && step.uses.startsWith('actions/upload-pages-artifact@'))!
        .if,
    ).toBe(false);
    const inactive = createGitlabPipeline(config);
    expect(inactive.deploy).toMatchObject({ rules: [{ when: 'never' }], pages: { publish: 'website/dist' } });
    expect(inactive['smoke-deployed']).toMatchObject({ rules: [{ when: 'never' }] });
    const active = createGitlabPipeline({ ...config, primary: 'gitlab' });
    expect(active.deploy).toMatchObject({
      needs: Object.keys(siteWork).map((job) => ({ job, artifacts: job === 'build' })),
    });
    expect(active.deploy).toHaveProperty('rules.0.if');
    expect(active['smoke-deployed']).toMatchObject({ needs: [{ job: 'deploy', artifacts: false }] });
    const { primary: _primary, ...validationOnly } = config;
    expect(createGithubWorkflows(validationOnly, pins).project.jobs.deploy!.if).toBe(false);
    expect(createGitlabPipeline(validationOnly).deploy).toMatchObject({ rules: [{ when: 'never' }] });
  });
  test('rejects malformed YAML, unknown provider fields, mutable actions, and dangling job dependencies', () => {
    expect(() => validateCiYaml(githubWorkflowSchema, 'name: one\nname: two\n')).toThrow(
      duplicateYamlKeyMessagePattern,
    );
    const workflow = createGithubWorkflows(config, pins).project;
    expect(() => githubWorkflowSchema.parse({ ...workflow, unexpected: true })).toThrow(
      invalidProviderDefinitionMessagePattern,
    );
    expect(() =>
      githubJobSchema.parse({ ...workflow.jobs.format, steps: [{ uses: 'actions/checkout@main' }] }),
    ).toThrow(invalidProviderDefinitionMessagePattern);
    expect(() =>
      githubWorkflowSchema.parse({
        ...workflow,
        jobs: { ...workflow.jobs, format: { ...workflow.jobs.format, needs: ['missing'] } },
      }),
    ).toThrow('Unknown job dependency');
  });
});
