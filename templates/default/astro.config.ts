import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { sveltiaFormatter } from './scripts/sveltia-formatter';
import { security } from './src/config/security';
import securityTxt from './src/integrations/security-txt';
import { normalizePublicSite } from './src/lib/public-site';

const publicSite = normalizePublicSite(process.env.PUBLIC_SITE_URL ?? 'https://example.com');

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
