import type { SiteCiConfig } from './config.ts';
import { createGithubExtras } from './github-extra.ts';
import { planSchema, runtimeVersions, siteWork, type WorkPlan } from './model.ts';
import {
  githubJobSchema,
  githubWorkflowSchema,
  type GithubJob,
  type GithubStep,
  type GithubWorkflow,
} from './schema.ts';

export type ActionResolver = (action: string) => { ref: string; version?: string };
const onMain = "github.event_name == 'push' && github.ref == 'refs/heads/main'";

export function createGithubWorkflows(config: SiteCiConfig, pins: ActionResolver, plan: WorkPlan = siteWork) {
  plan = planSchema.parse(plan);
  const githubExtras = createGithubExtras(pins);
  const path = (value: string) => `${config.directory}/${value}`;
  const checkout: GithubStep = { uses: pins('actions/checkout').ref, with: { 'persist-credentials': false } };
  const setup = (node: string): GithubStep[] => [
    checkout,
    {
      uses: pins('actions/setup-node').ref,
      with: { 'node-version': node, cache: 'npm', 'cache-dependency-path': path('package-lock.json') },
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
  const jobs: Record<string, GithubJob> = {};
  for (const [id, work] of Object.entries(plan)) {
    const steps = setup('26');
    if (work.browsers.length) steps.push({ run: `npx playwright install --with-deps ${work.browsers.join(' ')}` });
    for (const need of work.needs) {
      for (const output of plan[need]!.artifacts)
        steps.push({
          uses: pins('actions/download-artifact').ref,
          with: { name: `${need}-${output.replaceAll('/', '-')}`, path: path(output) },
        });
    }
    steps.push(...work.commands.map((run) => ({ run, ...(work.advisory ? { 'continue-on-error': true } : {}) })));
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
      ...(work.needs.length ? { needs: work.needs } : {}),
      steps,
    });
  }
  jobs.compatibility = githubJobSchema.parse({
    name: 'Runtime compatibility (${{ matrix.node }})',
    'runs-on': 'ubuntu-latest',
    permissions: { contents: 'read' },
    strategy: { 'fail-fast': false, matrix: { node: runtimeVersions } },
    steps: [
      ...setup('${{ matrix.node }}'),
      ...['typecheck', 'unit-tests', 'build', 'validate-build'].flatMap((id) =>
        plan[id]!.commands.map((run) => ({ run })),
      ),
    ],
  });
  jobs.project = githubJobSchema.parse({
    name: config.prefix ? `${config.prefix}: Project` : 'Project',
    'runs-on': 'ubuntu-latest',
    permissions: {},
    if: 'always()',
    needs: [...Object.keys(plan), 'compatibility'],
    steps: [
      {
        run: 'test "$RESULT" = "success"',
        env: {
          RESULT:
            "${{ contains(needs.*.result, 'failure') && 'failure' || contains(needs.*.result, 'cancelled') && 'cancelled' || contains(needs.*.result, 'skipped') && 'skipped' || 'success' }}",
        },
      },
    ],
  });
  // Deployment consumes this run's artifacts and never executes fork-controlled code with Pages credentials.
  if (config.primary === 'github') {
    jobs.build!.steps.push({
      uses: pins('actions/upload-pages-artifact').ref,
      if: onMain,
      with: { path: path('dist') },
    });
    for (const [id, extra] of Object.entries(githubExtras.pages)) {
      const job = structuredClone(extra);
      for (const step of job.steps) {
        if ('with' in step && step.with && typeof step.with.path === 'string')
          step.with.path = step.with.path.split('\n').map(path).join('\n');
      }
      if (id === 'smoke-deployed') job.steps = [...setup('26'), ...job.steps];
      jobs[id] = githubJobSchema.parse(job);
    }
  }
  const base = (name: string): Omit<GithubWorkflow, 'jobs'> => ({
    name: `${config.prefix ? `${config.prefix}: ` : ''}${name}`,
    on: { push: { branches: ['main'] }, pull_request: { branches: ['main'] } },
    permissions: {},
    concurrency: {
      group: '${{ github.workflow_ref }}-${{ github.ref }}',
      'cancel-in-progress': "${{ github.event_name == 'pull_request' }}",
    },
  });
  const project = githubWorkflowSchema.parse({
    ...base('Project Continuous Integration'),
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
      on: { push: trigger, pull_request: trigger, schedule: [{ cron: `${minute} 5 * * 1` }] },
      jobs: definition,
    });
  };
  return {
    project,
    security: auxiliary('security', 'Security Analysis', config.securityMinute),
    automation: auxiliary('automation', 'Repository Automation Validation', config.automationMinute),
  };
}
