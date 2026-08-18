import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { site } from './src/config/site';

export default defineConfig({
  integrations: [sitemap()],
  output: 'static',
  site: site.url,
  trailingSlash: 'always',
});
