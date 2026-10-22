import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { getDeploymentConfig } from '../src/config/deployment';
import { site } from '../src/config/site';
import { resolveSiteHref } from '../src/lib/paths';

export const previewOrigin = 'http://127.0.0.1:4321';

const deployment = getDeploymentConfig(site.url);

export const resolvePreviewPath = (path: string): string => resolveSiteHref(path, deployment.base ?? '/');

export const resolvePreviewUrl = (path: string): string => new URL(resolvePreviewPath(path), previewOrigin).href;

// Discover built routes so content slugs and optional starter pages can change freely.
export const publicRoutes = readdirSync(resolve('dist'), { recursive: true })
  .map(String)
  .filter((path) => path.endsWith('.html') && path !== 'admin/index.html')
  .map((path) => (path === '404.html' ? '/does-not-exist/' : `/${path.replace(/index\.html$/u, '')}`));
