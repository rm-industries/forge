import {
  cloudflareDeployCommand,
  cloudflareProjectCheckCommand,
  installCloudflareTool,
  verifyCloudflareArtifact,
} from './cloudflare.ts';
import { resolveDeployments } from './deployment.ts';
import type { CiGenerationOptions } from './generation-options.ts';
import { createGithubExtras } from './github-extra.ts';
import { planSchema, siteWork, type WorkPlan } from './model.ts';
import {
  githubJobSchema,
  githubWorkflowSchema,
  type GithubJob,
  type GithubStep,
  type GithubWorkflow,
} from './schema.ts';

export type ActionResolver = (action: string) => { ref: string; version?: string };
const githubBranchFilterSpecialCharacterPattern = /[!+\\]/g;
const onMain = "github.event_name == 'push' && github.ref == 'refs/heads/main'";

export function createGithubWorkflows(
  config: CiGenerationOptions,
  pins: ActionResolver,
  plan: WorkPlan = siteWork,
): { project: GithubWorkflow; automation: GithubWorkflow; security: GithubWorkflow } {
  plan = planSchema.parse(plan);
  const deployments = resolveDeployments(config.deployments, config.primary);
  if (deployments.length > 1) {
    const result = createGithubWorkflows({ ...config, deployments: [deployments[0]!] }, pins, plan);
    const project = result.project!;
    delete project.jobs.deploy;
    delete project.jobs['smoke-deployed'];
    const branchFilter = [...new Set(['main', ...deployments.map((item) => item.sourceBranch)])].map((branch) =>
      branch.replace(githubBranchFilterSpecialCharacterPattern, '\\$&'),
    );
    for (const workflow of Object.values(result)) {
      if (workflow.on.push) workflow.on.push.branches = branchFilter;
      if (workflow.on.pull_request) workflow.on.pull_request.branches = branchFilter;
    }
    const expressionQuote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    const siteUrl =
      '${{ ' +
      deployments
        .map(
          (item) =>
            `(github.ref == ${expressionQuote(`refs/heads/${item.sourceBranch}`)} || github.base_ref == ${expressionQuote(item.sourceBranch)}) && ${expressionQuote(item.url!)}`,
        )
        .join(' || ') +
      ' || ' +
      expressionQuote(deployments[0]!.url!) +
      ' }}';
    for (const id of Object.keys(plan)) {
      const job = project.jobs[id]!;
      job.env = { ...job.env, PUBLIC_SITE_URL: siteUrl };
      for (const step of job.steps)
        if ('uses' in step && step.uses.startsWith('actions/setup-node@')) {
          delete step.with?.cache;
          delete step.with?.['cache-dependency-path'];
          step.with = { ...step.with, 'package-manager-cache': false };
        }
    }
    for (const deployment of deployments) {
      const rendered = createGithubWorkflows({ ...config, deployments: [deployment] }, pins, plan).project!;
      if (rendered.jobs.deploy) {
        project.jobs[`deploy-${deployment.name}`] = rendered.jobs.deploy;
        const smoke = rendered.jobs['smoke-deployed']!;
        smoke.needs = [`deploy-${deployment.name}`];
        smoke.env = { PUBLIC_SITE_URL: deployment.url! };
        project.jobs[`smoke-${deployment.name}`] = smoke;
      }
      if (deployment.target === 'github-pages' && deployments[0]!.target !== 'github-pages') {
        const upload = rendered.jobs.build!.steps.find(
          (step) => 'uses' in step && step.uses.startsWith('actions/upload-pages-artifact@'),
        );
        if (upload) project.jobs.build!.steps.push(upload);
      }
    }
    result.project = githubWorkflowSchema.parse(project);
    return result;
  }
  const deployment = resolveDeployments(config.deployments, config.primary)[0];
  const nativePages = config.deployments === undefined || deployment?.target === 'github-pages';
  const deployCondition = deployment
    ? `github.event_name == 'push' && github.ref == 'refs/heads/${deployment.sourceBranch.replaceAll("'", "''")}'`
    : onMain;
  const githubExtras = createGithubExtras(pins);
  const validationBranches = [...new Set(['main', ...(deployment ? [deployment.sourceBranch] : [])])].map((branch) =>
    branch.replace(githubBranchFilterSpecialCharacterPattern, '\\$&'),
  );
  const path = (value: string) => `${config.directory}/${value}`;
  const checkout: GithubStep = { uses: pins('actions/checkout').ref, with: { 'persist-credentials': false } };
  const setup = (node: string): GithubStep[] => [
    checkout,
    {
      uses: pins('actions/setup-node').ref,
      with: {
        'node-version': node,
        // Additional deployment branches need independent installs rather than shared publishing caches.
        ...(deployment && (deployment.target === 'cloudflare-pages' || deployment.sourceBranch !== 'main')
          ? { 'package-manager-cache': false }
          : { cache: 'npm', 'cache-dependency-path': path('package-lock.json') }),
      },
    },
    { run: 'npm ci' },
  ];
  const artifact = (paths: string[], name: string): GithubStep => ({
    uses: pins('actions/upload-artifact').ref,
    if: 'always()',
    with: {
      name,
      path: paths.map(path).join('\n'),
      'include-hidden-files': true,
      'if-no-files-found': paths.some((path) => ['coverage', '.lighthouseci'].includes(path)) ? 'error' : 'ignore',
      'retention-days': 7,
    },
  });
  const jobs: Record<string, GithubJob> = {
    select: {
      name: 'Select site checks',
      'runs-on': 'ubuntu-latest',
      permissions: { contents: 'read' },
      outputs: { affected: '${{ steps.impact.outputs.affected }}' },
      steps: [
        { ...checkout, with: { ...checkout.with, 'fetch-depth': 0 } },
        {
          uses: pins('actions/setup-node').ref,
          with: { 'node-version': config.nodeVersion, 'package-manager-cache': false },
        },
        {
          id: 'impact',
          'working-directory': '.',
          env: {
            BASE_SHA: '${{ github.event.pull_request.base.sha || github.event.before }}',
            EVENT_NAME: '${{ github.event_name }}',
          },
          run: `node <<'NODE'
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
const directory = ${JSON.stringify(config.directory)};
const base = process.env.BASE_SHA;
let affected = true;
if (!['schedule', 'workflow_dispatch'].includes(process.env.EVENT_NAME) && /^[a-f0-9]{40}$/u.test(base ?? '') && !/^0+$/u.test(base)) {
  const paths = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, 'HEAD'], { encoding: 'utf8' }).split('\\0').filter(Boolean);
  affected = paths.some((path) => directory === '.' || path.startsWith(directory + '/') || !path.includes('/') || path.startsWith('.') || ['scripts/', 'config/', 'packages/'].some((prefix) => path.startsWith(prefix)));
}
appendFileSync(process.env.GITHUB_OUTPUT, 'affected=' + affected + '\\n');
NODE`,
        },
      ],
    },
  };
  for (const [id, work] of Object.entries(plan)) {
    const steps = setup(config.nodeVersion);
    if (work.browsers.length)
      steps.push({
        run:
          id === 'browser-tests'
            ? `if [ "$FULL_BROWSERS" = "true" ]; then npx playwright install --with-deps ${work.browsers.join(' ')}; else npx playwright install --with-deps chromium; fi`
            : `npx playwright install --with-deps ${work.browsers.join(' ')}`,
      });
    for (const need of work.needs) {
      for (const output of plan[need]!.artifacts)
        steps.push({
          uses: pins('actions/download-artifact').ref,
          with: { name: `${need}-${output.replaceAll('/', '-')}`, path: path(output) },
        });
    }
    steps.push(
      ...work.commands.map((run) => ({
        run:
          id === 'lint-code'
            ? `${run} -- --format github`
            : id === 'browser-tests'
              ? `if [ "$FULL_BROWSERS" = "true" ]; then ${run}; else ${run} -- --project=chromium; fi`
              : run,
      })),
    );
    for (const output of work.artifacts) {
      const upload = artifact([output], `${id}-${output.replaceAll('/', '-')}`);
      if (id === 'build' && 'uses' in upload) {
        delete upload.if;
        upload.with!['if-no-files-found'] = 'error';
      }
      steps.push(upload);
    }
    jobs[id] = githubJobSchema.parse({
      name: work.name,
      'runs-on': 'ubuntu-latest',
      permissions: { contents: 'read' },
      needs: ['select', ...work.needs],
      if: `needs.select.outputs.affected == 'true'${id === 'lighthouse' ? " && github.event_name != 'pull_request'" : ''}`,
      ...(id === 'browser-tests'
        ? {
            env: {
              FULL_BROWSERS: "${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}",
            },
          }
        : {}),
      steps,
    });
  }
  jobs.validation = githubJobSchema.parse({
    name: 'Validation',
    'runs-on': 'ubuntu-latest',
    permissions: {},
    needs: ['select', ...Object.keys(plan)],
    if: 'always()',
    steps: [
      {
        'working-directory': '.',
        env: { NEEDS_JSON: '${{ toJSON(needs) }}', EVENT_NAME: '${{ github.event_name }}' },
        run: `node <<'NODE'
const needs = JSON.parse(process.env.NEEDS_JSON);
if (needs.select.result !== 'success' || !['true', 'false'].includes(needs.select.outputs.affected)) process.exit(1);
for (const id of ${JSON.stringify(Object.keys(plan))}) {
  const expected = needs.select.outputs.affected === 'false' || (id === 'lighthouse' && process.env.EVENT_NAME === 'pull_request') ? 'skipped' : 'success';
  if (needs[id].result !== expected) process.exit(1);
}
console.log(needs.select.outputs.affected === 'true' ? 'Required site checks passed.' : 'No site inputs changed.');
NODE`,
      },
    ],
  });
  // Deployment consumes this run's artifacts and never executes fork-controlled code with Pages credentials.
  if (nativePages)
    jobs.build!.steps.push({
      uses: pins('actions/upload-pages-artifact').ref,
      if: config.primary === 'github' && deployment ? deployCondition : false,
      with: { path: path('dist') },
    });
  for (const [id, extra] of Object.entries(nativePages ? githubExtras.pages : {})) {
    const job = structuredClone(extra);
    if (id === 'deploy') job.needs = Object.keys(plan);
    job.if = config.primary === 'github' && deployment ? deployCondition : false;
    if (id === 'deploy' && config.deployments !== undefined && deployment) job.environment!.name = deployment.name;
    if (id === 'deploy' && deployment?.url) job.environment!.url = deployment.url;
    if (id === 'smoke-deployed' && deployment?.url)
      for (const step of job.steps) if (step.env?.DEPLOYMENT_URL) step.env.DEPLOYMENT_URL = deployment.url;
    for (const step of job.steps) {
      if ('with' in step && step.with && typeof step.with.path === 'string')
        step.with.path = step.with.path.split('\n').filter(Boolean).map(path).join('\n');
    }
    if (id === 'smoke-deployed') job.steps = [...setup(config.nodeVersion), ...job.steps];
    jobs[id] = githubJobSchema.parse(job);
  }
  if (deployment?.target === 'cloudflare-pages') {
    const enabled = config.primary === 'github' ? deployCondition : false;
    jobs.deploy = githubJobSchema.parse({
      name: 'Deploy Cloudflare Pages',
      needs: Object.keys(plan),
      if: enabled,
      'runs-on': 'ubuntu-latest',
      permissions: { contents: 'read' },
      environment: { name: deployment.name, url: deployment.url },
      steps: [
        checkout,
        {
          uses: pins('actions/setup-node').ref,
          with: { 'node-version': config.nodeVersion, 'package-manager-cache': false },
        },
        { uses: pins('actions/download-artifact').ref, with: { name: 'build-dist', path: path('dist') } },
        { name: 'Verify validated artifact', run: verifyCloudflareArtifact },
        { name: 'Install locked project dependencies', run: installCloudflareTool },
        {
          name: 'Verify existing Cloudflare project',
          env: {
            CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
            CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
          },
          run: cloudflareProjectCheckCommand(deployment),
        },
        {
          name: 'Deploy Cloudflare Pages',
          env: {
            CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
            CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
            WRANGLER_SEND_METRICS: 'false',
          },
          run: cloudflareDeployCommand(deployment),
        },
      ],
    });
    const smoke = structuredClone(githubExtras.pages['smoke-deployed']!);
    smoke.if = enabled;
    smoke.steps = [...setup(config.nodeVersion), ...smoke.steps];
    for (const step of smoke.steps) {
      if (step.env?.DEPLOYMENT_URL) step.env.DEPLOYMENT_URL = deployment.url;
      if ('with' in step && typeof step.with?.path === 'string')
        step.with.path = step.with.path.split('\n').filter(Boolean).map(path).join('\n');
    }
    jobs['smoke-deployed'] = githubJobSchema.parse(smoke);
  }
  const base = (name: string): Omit<GithubWorkflow, 'jobs'> => ({
    name: `${config.prefix ? `${config.prefix}: ` : ''}${name}`,
    on: {
      push: { branches: validationBranches },
      pull_request: { branches: validationBranches },
    },
    permissions: {},
    concurrency: {
      group: '${{ github.workflow_ref }}-${{ github.ref }}',
      'cancel-in-progress': "${{ github.event_name == 'pull_request' }}",
    },
  });
  const project = githubWorkflowSchema.parse({
    ...base('Project Continuous Integration'),
    on: {
      ...base('Project Continuous Integration').on,
      schedule: [{ cron: `${config.automationMinute} 6 * * 2` }],
      workflow_dispatch: null,
    },
    defaults: { run: { shell: 'bash', 'working-directory': config.directory } },
    jobs,
  });
  const auxiliary = (kind: 'security' | 'automation', name: string, minute: number) => {
    const definition = structuredClone(githubExtras[kind]);
    const trigger = {
      branches: ['main'],
      ...(kind === 'automation' ? { paths: ['.github/**'] } : {}),
    };
    return githubWorkflowSchema.parse({
      ...base(name),
      on: {
        push: trigger,
        pull_request: trigger,
        schedule: [{ cron: `${minute} 5 * * 1` }],
        ...(kind === 'automation' ? { workflow_dispatch: null } : {}),
      },
      jobs: definition,
    });
  };
  return {
    project,
    security: auxiliary('security', 'Security Analysis', config.securityMinute),
    automation: auxiliary('automation', 'Repository Automation Validation', config.automationMinute),
  };
}
