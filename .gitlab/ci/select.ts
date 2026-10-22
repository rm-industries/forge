import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { parse } from 'yaml';

import { selectCiImpact } from '../../scripts/ci-impact.ts';

const staticJobs = [
  'project-format',
  'project-lint-code',
  'project-lint-markdown',
  'project-spellcheck',
  'project-documentation',
];

export function createMirrorPipeline(paths: string[] | null) {
  const impact = selectCiImpact(paths);
  const jobs = Object.assign(
    {},
    ...['project', ...(impact.generator ? ['generator'] : []), ...(impact.website ? ['website'] : [])].map((lane) =>
      parse(readFileSync(new URL(`./${lane}.yml`, import.meta.url), 'utf8')),
    ),
  );
  for (const id of Object.keys(jobs)) {
    if (id.startsWith('project-') && !staticJobs.includes(id) && !impact.project) delete jobs[id];
    if (id === 'project-native' && !impact.native) delete jobs[id];
  }
  for (const job of Object.values(jobs) as { needs?: { job: string }[] }[]) {
    if (job.needs) job.needs = job.needs.filter((need) => need.job !== 'project-native' || impact.native);
  }
  return {
    workflow: { rules: [{ if: '$CI_PIPELINE_SOURCE == "parent_pipeline"' }] },
    default: { interruptible: true },
    stages: ['prepare', 'validate', 'build', 'verify', 'deploy', 'smoke'],
    variables: {
      FORGE_PACKAGES: impact.packages,
      FORGE_NATIVE: String(impact.native),
      FORGE_FULL_BROWSERS: String(impact.websiteFullBrowsers),
    },
    ...jobs,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = process.env.CI_PIPELINE_SOURCE;
  const base =
    source === 'merge_request_event'
      ? process.env.CI_MERGE_REQUEST_DIFF_BASE_SHA
      : source === 'push'
        ? process.env.CI_COMMIT_BEFORE_SHA
        : undefined;
  const head = process.env.CI_COMMIT_SHA;
  const known = base && head && /^[a-f0-9]{40}$/.test(base) && /^[a-f0-9]{40}$/.test(head) && !/^0+$/.test(base);
  const paths = known
    ? execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], { encoding: 'utf8' })
        .split('\0')
        .filter(Boolean)
    : null;
  writeFileSync('.gitlab-child.json', JSON.stringify(createMirrorPipeline(paths)));
}
