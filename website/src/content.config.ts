import { createAstroCollections } from '@rm-industries/content-model/astro';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { contentModels } from './config/content-models/registry.ts';

const documentation = defineCollection({
  loader: glob({
    base: new URL('../../docs/', import.meta.url),
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replace(/(?:^|\/)README\.md$/u, '').replace(/\.md$/u, ''),
  }),
});

export const collections = { ...createAstroCollections(contentModels), documentation };
