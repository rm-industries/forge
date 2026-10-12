import { shellQuote, type SiteCiConfig } from './config.ts';
import { planSchema, runtimeVersions, siteWork, type WorkPlan } from './model.ts';
import { gitlabJobSchema, gitlabPipelineSchema, type GitlabJob } from './schema.ts';

export function createGitlabPipeline(config: SiteCiConfig, plan: WorkPlan = siteWork) {
  plan = planSchema.parse(plan);
  const depth = (id: string): number => Math.max(-1, ...plan[id]!.needs.map(depth)) + 1;
  const stage = (id: string) => `check-${depth(id)}`;
  const jobs: Record<string, GitlabJob> = {};
  for (const [id, work] of Object.entries(plan)) {
    jobs[id] = gitlabJobSchema.parse({
      image: 'node:26',
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
  jobs.compatibility = gitlabJobSchema.parse({
    image: 'node:$NODE_VERSION',
    stage: 'check-0',
    needs: [],
    parallel: { matrix: [{ NODE_VERSION: runtimeVersions }] },
    script: ['typecheck', 'unit-tests', 'build', 'validate-build'].flatMap((id) => plan[id]!.commands),
  });
  const deployRules =
    config.primary === 'gitlab'
      ? [
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && ($CI_PIPELINE_SOURCE == "push" || $CI_PIPELINE_SOURCE == "parent_pipeline")',
          },
        ]
      : [{ when: 'never' as const }];
  jobs.project = gitlabJobSchema.parse({
    image: 'node:26',
    stage: 'project',
    before_script: [],
    script: ['true'],
    needs: [...Object.keys(plan), 'compatibility'].map((job) => ({ job, artifacts: false })),
  });
  jobs.deploy = gitlabJobSchema.parse({
    image: 'node:26',
    stage: 'deploy',
    before_script: [],
    needs: [
      { job: 'project', artifacts: false },
      { job: 'build', artifacts: true },
    ],
    script: [`test -f ${shellQuote(`${config.directory}/dist/index.html`)}`],
    rules: deployRules,
    pages: { publish: `${config.directory}/dist` },
    environment: { name: 'gitlab-pages', url: '$CI_PAGES_URL' },
    artifacts: { paths: [`${config.directory}/dist`], when: 'on_success', expire_in: '7 days' },
  });
  jobs['smoke-deployed'] = gitlabJobSchema.parse({
    image: 'node:26',
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
      .concat(['project', 'deploy', 'smoke']),
    default: { interruptible: true, before_script: [`cd ${shellQuote(config.directory)}`, 'npm ci'] },
    ...jobs,
  });
}
