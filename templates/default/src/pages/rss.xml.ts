import rss from '@astrojs/rss';

import { site } from '../config/site';
import { getArticles } from '../lib/articles';

export const GET = async () =>
  rss({
    title: site.name,
    description: site.description,
    site: site.url,
    items: (await getArticles()).map((article) => ({
      title: article.data.title,
      description: article.data.description,
      link: `/articles/${article.id}/`,
      pubDate: article.data.publishedAt,
    })),
  });
