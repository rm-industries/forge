import type { CollectionEntry } from 'astro:content';

import { documentation } from '../config/documentation.ts';

export const documentationTitle = (entry: CollectionEntry<'documentation'>): string =>
  entry.body?.match(/^#\s+(.+)$/mu)?.[1]?.replaceAll('`', '') ?? entry.id;

export const documentationHref = (id: string): string => `/docs/${id ? `${id}/` : ''}`;

export const documentationPublication = (id: string) => documentation.find((entry) => entry.id === id)!;

export const documentationId = ({ entry }: { entry: string }): string =>
  documentation.find(({ source }) => source === entry)!.id;
