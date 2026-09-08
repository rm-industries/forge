import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { documentationId } from './lib/documentation.ts';

const documentation = defineCollection({
  loader: glob({
    base: new URL('../../docs/', import.meta.url),
    pattern: '**/*.md',
    generateId: documentationId,
  }),
});

export const collections = { documentation };
