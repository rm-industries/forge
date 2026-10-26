import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { documentationSources } from './config/documentation.ts';
import { documentationId } from './lib/documentation.ts';

const documentation = defineCollection({
  loader: glob({
    base: new URL('../../', import.meta.url),
    pattern: documentationSources,
    generateId: documentationId,
  }),
});

export const collections = { documentation };
