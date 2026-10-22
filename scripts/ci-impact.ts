import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Unknown ownership deliberately retains broad validation. */
export function selectCiImpact(paths: string[] | null) {
  const isolated =
    paths !== null &&
    paths.length > 0 &&
    paths.every((path) => path.startsWith('website/') || path.startsWith('docs/'));
  return { project: !isolated, generator: !isolated, website: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.CI_BASE_SHA;
  const head = process.env.CI_HEAD_SHA;
  const known = base && head && /^[a-f0-9]{40}$/.test(base) && /^[a-f0-9]{40}$/.test(head) && !/^0+$/.test(base);
  const paths = known
    ? execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], { encoding: 'utf8' })
        .split('\0')
        .filter(Boolean)
    : null;
  const impact = selectCiImpact(paths);
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(impact)
      .map(([lane, selected]) => `${lane}=${selected}\n`)
      .join(''),
  );
}
