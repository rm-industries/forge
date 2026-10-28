import type { APIRoute } from 'astro';

import { resolveSiteHref } from '../lib/paths';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('Robots metadata requires Astro site configuration.');
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(resolveSiteHref('/sitemap-index.xml'), site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
