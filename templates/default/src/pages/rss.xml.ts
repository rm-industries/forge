import rss from '@astrojs/rss';

import { site } from '../config/site';
import { getArticles } from '../data/articles';

export const GET = () =>
  rss({
    title: site.name,
    description: site.description,
    site: site.url,
    items: getArticles().map((article) => ({
      title: article.title,
      description: article.description,
      link: `/articles/${article.slug}/`,
      pubDate: new Date(`${article.publishedAt}T00:00:00Z`),
    })),
  });
