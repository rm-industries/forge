import { createAstroCollections } from '@rm-industries/content-model/astro';
import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { contentModels } from './config/content-models/registry.ts';
import { documentationId } from './lib/documentation.ts';

const documentation = defineCollection({
  loader: glob({
    base: new URL('../../docs/', import.meta.url),
    pattern: '**/*.md',
    generateId: documentationId,
  }),
});

export const collections = { ...createAstroCollections(contentModels), documentation };
