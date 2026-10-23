import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getDeploymentConfig } from '../src/config/deployment.ts';
import { site } from '../src/config/site.ts';
import { resolveSiteHref } from '../src/lib/paths.ts';

const previewOrigin = 'http://127.0.0.1:4321';
// Keep navigation budgets and one representative built content-detail page.
const auditedPaths = [...new Set(['/', ...site.navigation.map(({ href }) => href)])].filter(
  (path) => path.startsWith('/') && !path.startsWith('//'),
);

export const getLighthouseUrls = (siteUrl: string, origin = previewOrigin, buildDirectory = 'dist'): string[] => {
  const deployment = getDeploymentConfig(siteUrl);

  const detail = readdirSync(buildDirectory, { recursive: true })
    .map((path) => String(path).split(sep).join('/'))
    .filter((path) => path.endsWith('.html') && path !== '404.html' && !path.startsWith('admin/'))
    .map((path) => `/${path.replace(/index\.html$/u, '')}`)
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .find((path) => path.split('/').filter(Boolean).length > 1 && !auditedPaths.includes(path));
  const paths = detail ? [...auditedPaths, detail] : auditedPaths;
  return paths.map((path) => new URL(resolveSiteHref(path, deployment.base ?? '/'), origin).href);
};

export const runLighthouse = (): void => {
  const lighthouseCli = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js');
  const urlArguments = getLighthouseUrls(site.url).map((url) => `--collect.url=${url}`);
  const result = spawnSync(process.execPath, [lighthouseCli, 'autorun', ...urlArguments], {
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: '0' },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runLighthouse();
