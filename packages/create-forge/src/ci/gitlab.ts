import { shellQuote, type CiGenerationOptions } from './generation-options.ts';
import { planSchema, siteWork, type WorkPlan } from './model.ts';
import { gitlabJobSchema, gitlabPipelineSchema, type GitlabJob } from './schema.ts';

export function createGitlabPipeline(config: CiGenerationOptions, plan: WorkPlan = siteWork) {
  plan = planSchema.parse(plan);
  const depth = (id: string): number => Math.max(-1, ...plan[id]!.needs.map(depth)) + 1;
  const workStageNames = ['validate', 'build', 'verify'];
  const stageName = (level: number) => workStageNames[level] ?? `verify-${level - 1}`;
  const stage = (id: string) => stageName(depth(id));
  const jobs: Record<string, GitlabJob> = {};
  for (const [id, work] of Object.entries(plan)) {
    const reports =
      id === 'unit-tests'
        ? {
            junit: `${config.directory}/test-results/unit.xml`,
            coverage_report: {
              coverage_format: 'cobertura',
              path: `${config.directory}/coverage/cobertura-coverage.xml`,
            },
          }
        : id === 'browser-tests'
          ? { junit: `${config.directory}/test-results/browser.xml` }
          : id === 'lint-code'
            ? { codequality: `${config.directory}/test-results/code-quality.json` }
            : undefined;
    const commands =
      id === 'lint-code'
        ? [
            'mkdir -p test-results',
            `status=0\nnpm run lint:code --silent -- --format gitlab > test-results/code-quality.json || status=$?\nnode --input-type=module -e ${shellQuote(`import { readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path'; const file = 'test-results/code-quality.json'; const report = JSON.parse(readFileSync(file, 'utf8')); for (const finding of report) finding.location.path = join(${JSON.stringify(config.directory)}, finding.location.path); writeFileSync(file, JSON.stringify(report));`)}\nexit "$status"`,
          ]
        : work.commands;
    jobs[id] = gitlabJobSchema.parse({
      image: `node:${config.nodeVersion}`,
      stage: stage(id),
      needs: work.needs.map((job) => ({ job, artifacts: true })),
      // Node containers run as root; scope Chrome's flag to GitLab Lighthouse jobs.
      ...(id === 'lighthouse'
        ? { variables: { LHCI_COLLECT__SETTINGS__CHROME_FLAGS: '--no-sandbox --disable-dev-shm-usage --disable-gpu' } }
        : {}),
      script: [
        ...(work.browsers.length ? [`npx playwright install --with-deps ${work.browsers.join(' ')}`] : []),
        ...(id === 'lighthouse'
          ? [
              `export CHROME_PATH="$(node --input-type=module -e 'import { chromium } from "@playwright/test"; process.stdout.write(chromium.executablePath());')"`,
            ]
          : []),
        ...commands,
      ],
      ...(work.artifacts.length || reports
        ? {
            artifacts: {
              paths: [...new Set([...work.artifacts, ...(reports ? ['test-results'] : [])])].map(
                (path) => `${config.directory}/${path}`,
              ),
              when: id === 'build' ? 'on_success' : 'always',
              expire_in: '7 days',
              ...(reports ? { reports } : {}),
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
    timeout: '10m',
    needs: [{ job: 'deploy', artifacts: false }],
    rules: deployRules,
    script: [
      'test -n "$CI_PAGES_URL"',
      'npx playwright install --with-deps chromium',
      'DEPLOYMENT_URL="$CI_PAGES_URL" npm run test:smoke',
    ],
    artifacts: {
      paths: [`${config.directory}/playwright-report`, `${config.directory}/test-results`],
      when: 'always',
      expire_in: '7 days',
      reports: { junit: `${config.directory}/test-results/smoke.xml` },
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
      .map(stageName)
      .concat(['deploy', 'smoke']),
    default: { interruptible: true, before_script: [`cd ${shellQuote(config.directory)}`, 'npm ci'] },
    ...jobs,
  });
}
