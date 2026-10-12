import { shellQuote, type CiGenerationOptions } from './generation-options.ts';
import { planSchema, siteWork, type WorkPlan } from './model.ts';
import { gitlabJobSchema, gitlabPipelineSchema, type GitlabJob } from './schema.ts';

export function createGitlabPipeline(config: CiGenerationOptions, plan: WorkPlan = siteWork) {
  plan = planSchema.parse(plan);
  const depth = (id: string): number => Math.max(-1, ...plan[id]!.needs.map(depth)) + 1;
  const stage = (id: string) => `check-${depth(id)}`;
  const jobs: Record<string, GitlabJob> = {};
  for (const [id, work] of Object.entries(plan)) {
    jobs[id] = gitlabJobSchema.parse({
      image: `node:${config.nodeVersion}`,
      stage: stage(id),
      needs: work.needs.map((job) => ({ job, artifacts: true })),
      script: [
        ...(work.browsers.length ? [`npx playwright install --with-deps ${work.browsers.join(' ')}`] : []),
        ...work.commands,
      ],
      ...(work.advisory ? { allow_failure: true } : {}),
      ...(work.artifacts.length
        ? {
            artifacts: {
              paths: work.artifacts.map((path) => `${config.directory}/${path}`),
              when: 'always',
              expire_in: '7 days',
            },
          }
        : {}),
    });
  }
  const deployRules =
    config.primary === 'gitlab'
      ? [
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")',
          },
        ]
      : [{ when: 'never' as const }];
  jobs.deploy = gitlabJobSchema.parse({
    image: `node:${config.nodeVersion}`,
    stage: 'deploy',
    before_script: [],
    needs: Object.keys(plan).map((job) => ({ job, artifacts: job === 'build' })),
    script: [`test -f ${shellQuote(`${config.directory}/dist/index.html`)}`],
    rules: deployRules,
    pages: { publish: `${config.directory}/dist` },
    environment: { name: 'gitlab-pages', url: '$CI_PAGES_URL' },
    artifacts: { paths: [`${config.directory}/dist`], when: 'on_success', expire_in: '7 days' },
  });
  jobs['smoke-deployed'] = gitlabJobSchema.parse({
    image: `node:${config.nodeVersion}`,
    stage: 'smoke',
    needs: [{ job: 'deploy', artifacts: false }],
    rules: deployRules,
    script: ['npx playwright install --with-deps chromium', 'DEPLOYMENT_URL="$CI_PAGES_URL" npm run test:smoke'],
    artifacts: {
      paths: [`${config.directory}/playwright-report`, `${config.directory}/test-results`],
      when: 'always',
      expire_in: '7 days',
    },
  });
  return gitlabPipelineSchema.parse({
    workflow: {
      rules: [
        { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
        { if: '$CI_PIPELINE_SOURCE == "parent_pipeline"' },
        { if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS && $CI_PIPELINE_SOURCE == "push"', when: 'never' },
        { if: '$CI_PIPELINE_SOURCE == "push"' },
      ],
    },
    stages: [...new Set(Object.keys(plan).map(depth))]
      .sort((left, right) => left - right)
      .map((level) => `check-${level}`)
      .concat(['deploy', 'smoke']),
    default: { interruptible: true, before_script: [`cd ${shellQuote(config.directory)}`, 'npm ci'] },
    ...jobs,
  });
}
