import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { sveltiaFormatter } from './scripts/sveltia-formatter';
import { security } from './src/config/security';
import securityTxt from './src/integrations/security-txt';

let publicSite: URL;
try {
  publicSite = new URL(process.env.PUBLIC_SITE_URL ?? 'https://example.com');
} catch {
  throw new Error('The public site URL must be an absolute URL.');
}
if (
  !['http:', 'https:'].includes(publicSite.protocol) ||
  publicSite.username ||
  publicSite.password ||
  publicSite.search ||
  publicSite.hash
) {
  throw new Error('The public site URL must use HTTP or HTTPS without credentials, a query, or a fragment.');
}

publicSite.pathname = `${publicSite.pathname.replace(/\/+$/, '')}/`;

export default defineConfig({
  base: publicSite.pathname,
  integrations: [sitemap(), sveltiaFormatter(), ...(security === undefined ? [] : [securityTxt(security)])],
  output: 'static',
  site: publicSite.href,
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
