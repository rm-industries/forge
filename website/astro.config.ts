import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { rewriteDocumentationLinks } from './scripts/rewrite-documentation-links';
import { getDeploymentConfig } from './src/config/deployment';
import { site } from './src/config/site';

const deployment = getDeploymentConfig(site.url);
const isLocalDevelopment = process.env.NODE_ENV === 'development';

export default defineConfig({
  base: isLocalDevelopment ? undefined : deployment.base,
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      rehypePlugins: [
        [
          rewriteDocumentationLinks,
          {
            base: isLocalDevelopment ? '/' : (deployment.base ?? '/'),
            docsDirectory: fileURLToPath(new URL('../docs/', import.meta.url)),
            repositoryDirectory: fileURLToPath(new URL('../', import.meta.url)),
          },
        ],
      ],
    }),
  },
  output: 'static',
  site: deployment.site,
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
