import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { rewriteDocumentationLinks } from './scripts/rewrite-documentation-links';

const publicSite = new URL('https://www.rm-industries.com/forge/');
if (
  !['http:', 'https:'].includes(publicSite.protocol) ||
  publicSite.username ||
  publicSite.password ||
  publicSite.search ||
  publicSite.hash
) {
  throw new TypeError('Astro site must be an HTTP(S) URL without credentials, a query, or a fragment.');
}
publicSite.pathname = `${publicSite.pathname.replace(/\/+$/, '')}/`;
const base = process.env.NODE_ENV === 'development' ? '/' : publicSite.pathname;

export default defineConfig({
  base,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'catppuccin-mocha' },
    processor: unified({
      rehypePlugins: [
        [
          rewriteDocumentationLinks,
          {
            base,
            repositoryDirectory: fileURLToPath(new URL('../', import.meta.url)),
          },
        ],
      ],
    }),
  },
  output: 'static',
  site: publicSite.href,
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
