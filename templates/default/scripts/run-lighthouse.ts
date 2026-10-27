import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getViteConfig } from 'astro/config';

import { resolveConfiguredSite } from '../tests/support/preview-url.ts';

const previewOrigin = 'http://127.0.0.1:4321';
export const getLighthouseUrls = (siteUrl: string, origin = previewOrigin, buildDirectory = 'dist'): string[] => {
  const base = new URL(`${new URL(siteUrl).pathname.replace(/\/+$/, '')}/`, origin);

  const builtPaths = readdirSync(buildDirectory, { recursive: true })
    .map((path) => String(path).split(sep).join('/'))
    .filter((path) => path.endsWith('.html') && path !== '404.html' && !path.startsWith('admin/'))
    .map((path) => `/${path.replace(/index\.html$/u, '')}`)
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  // Preserve the homepage/listing/detail budget sample without pinning content slugs.
  const detail = builtPaths.find(
    (path) => path.split('/').filter(Boolean).length > 1 && builtPaths.includes(path.replace(/[^/]+\/?$/u, '')),
  );
  const paths = detail ? ['/', detail.replace(/[^/]+\/?$/u, ''), detail] : ['/'];
  return paths.map((path) => new URL(path.slice(1), base).href);
};

export const runLighthouse = async (): Promise<void> => {
  process.env.NODE_ENV = 'production';
  const { define } = await getViteConfig({})({ command: 'serve', mode: 'production' });
  const configuredSite = resolveConfiguredSite(define?.['import.meta.env.SITE'], define?.['import.meta.env.BASE_URL']);
  const lighthouseCli = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js');
  const urlArguments = getLighthouseUrls(configuredSite.href).map((url) => `--collect.url=${url}`);
  const result = spawnSync(process.execPath, [lighthouseCli, 'autorun', ...urlArguments], {
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: '0' },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runLighthouse();
