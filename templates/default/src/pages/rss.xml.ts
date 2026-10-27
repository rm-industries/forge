import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { site } from '../config/site';
import { getArticles } from '../lib/articles';
import { resolveSiteHref } from '../lib/paths';

export const GET: APIRoute = async ({ site: publicSite }) => {
  if (!publicSite) throw new Error('RSS requires Astro site configuration.');
  return rss({
    title: site.name,
    description: site.description,
    site: publicSite.href,
    items: (await getArticles()).map((article) => ({
      title: article.data.title,
      description: article.data.description,
      link: resolveSiteHref(`/articles/${article.id}/`),
      pubDate: article.data.publishedAt,
    })),
  });
};
