import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { getViteConfig } from 'astro/config';

import { resolveSiteHref } from '../src/lib/paths.ts';
import { resolveConfiguredSite } from '../tests/support/preview-url.ts';

const previewOrigin = 'http://127.0.0.1:4321';
const auditedPaths = ['/', '/docs/getting-started/', '/packages/'] as const;

export const getLighthouseUrls = (base: string, origin = previewOrigin): string[] => {
  return auditedPaths.map((path) => new URL(resolveSiteHref(path, base), origin).href);
};

export const runLighthouse = async (): Promise<void> => {
  process.env.NODE_ENV = 'production';
  const { define } = await getViteConfig({})({ command: 'serve', mode: 'production' });
  const configuredSite = resolveConfiguredSite(define?.['import.meta.env.SITE'], define?.['import.meta.env.BASE_URL']);
  const lighthouseCli = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js');
  const urlArguments = getLighthouseUrls(configuredSite.pathname).map((url) => `--collect.url=${url}`);
  const result = spawnSync(process.execPath, [lighthouseCli, 'autorun', ...urlArguments], {
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: '0' },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runLighthouse();
