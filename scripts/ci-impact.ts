import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const packageNames = ['browser-oxfmt', 'content-model', 'create-forge', 'markdownlint-frontmatter'];

/** Unknown ownership deliberately retains broad validation. */
export function selectCiImpact(paths: string[] | null) {
  const broad =
    !paths?.length ||
    paths.some(
      (path) =>
        !path.startsWith('website/') &&
        !path.startsWith('docs/') &&
        !path.startsWith('templates/default/') &&
        !packageNames.some((name) => path.startsWith(`packages/${name}/`)),
    );
  const selected = packageNames.filter(
    (name) =>
      broad ||
      paths?.some(
        (path) =>
          path.startsWith(`packages/${name}/`) || (name === 'create-forge' && path.startsWith('templates/default/')),
      ),
  );
  // Frontmatter unit tests import the local content-model source.
  if (selected.includes('content-model') && !selected.includes('markdownlint-frontmatter'))
    selected.push('markdownlint-frontmatter');
  const template = broad || !!paths?.some((path) => path.startsWith('templates/default/'));
  return {
    project: selected.length > 0,
    generator: selected.includes('create-forge'),
    website: broad || !!paths?.some((path) => path.startsWith('website/') || path.startsWith('docs/')),
    websiteFullBrowsers: !paths?.length || !paths.every((path) => /^docs\/.+\.md$/.test(path)),
    packages: selected.join(' '),
    native: selected.includes('browser-oxfmt'),
    frontmatterCandidate: broad || selected.includes('content-model') || selected.includes('markdownlint-frontmatter'),
    browserCandidate: broad || template || selected.includes('browser-oxfmt') || selected.includes('content-model'),
  };
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
