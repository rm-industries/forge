import type { CollectionEntry } from 'astro:content';

export const documentationTitle = (entry: CollectionEntry<'documentation'>): string =>
  entry.body?.match(/^#\s+(.+)$/mu)?.[1]?.replaceAll('`', '') ?? entry.id;

export const documentationHref = (id: string): string => `/docs/${id ? `${id}/` : ''}`;

export const documentationGroup = (id: string): string => {
  if (id.startsWith('decisions/')) return 'Architecture decisions';
  if (id.startsWith('reviews/')) return 'Release reviews';
  return 'Guides and policies';
};
