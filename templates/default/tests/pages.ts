import { readdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';

// Discover built routes so content slugs and optional starter pages can change freely.
export const publicRoutes = readdirSync(resolve('dist'), { recursive: true })
  .map((path) => String(path).split(sep).join('/'))
  .filter((path) => path.endsWith('.html') && path !== 'admin/index.html')
  .map((path) => (path === '404.html' ? '/does-not-exist/' : `/${path.replace(/index\.html$/u, '')}`));
