import type { SchemaContext } from 'astro/content/config';
import { z } from 'astro/zod';
import { describe, expect, test } from 'vitest';

import { defineModel } from '../define-model';
import { AstroContentAdapterError, createAstroCollections, createAstroSchema, type AstroModelData } from './index';

const image: SchemaContext['image'] = () =>
  z.object({
    src: z.string(),
    width: z.number(),
    height: z.number(),
    format: z.union([
      z.literal('png'),
      z.literal('jpg'),
      z.literal('jpeg'),
      z.literal('tiff'),
      z.literal('webp'),
      z.literal('gif'),
      z.literal('svg'),
      z.literal('avif'),
    ]),
  });

const articleModel = defineModel({
  name: 'articles',
  label: 'Articles',
  labelSingular: 'Article',
  folder: 'src/content/articles',
  extensions: ['md', 'mdx'],
  slug: '{{slug}}',
  fields: {
    title: { kind: 'string', required: true, label: 'Title' },
    description: { kind: 'string', multiline: true, label: 'Description' },
    draft: { kind: 'boolean', default: false, label: 'Draft' },
    publishedAt: { kind: 'date', mode: 'date', required: true, label: 'Published at' },
    updatedAt: { kind: 'date', mode: 'datetime', label: 'Updated at' },
    readingMinutes: { kind: 'number', integer: true, min: 1, max: 60, label: 'Reading minutes' },
    section: {
      kind: 'string',
      required: true,
      options: [
        { label: 'Guides', value: 'guides' },
        { label: 'Notes', value: 'notes' },
      ],
      label: 'Section',
    },
    tags: {
      kind: 'list',
      default: [],
      items: { kind: 'string', required: true, label: 'Tag' },
      label: 'Tags',
    },
    author: {
      kind: 'object',
      required: true,
      fields: {
        name: { kind: 'string', required: true, label: 'Name' },
        featured: { kind: 'boolean', default: false, label: 'Featured' },
      },
      label: 'Author',
    },
    coverImage: { kind: 'asset', assetType: 'image', label: 'Cover image' },
  },
  body: { name: 'body', label: 'Body', required: true },
});

const schema = createAstroSchema(articleModel, { image });

describe('Astro content adapter', () => {
  test('loads a valid article and preserves defaults, dates, nested data, and images', () => {
    const coverImage = { src: '/cover.png', width: 1200, height: 630, format: 'png' as const };
    const article = schema.parse({
      title: 'A valid article',
      publishedAt: '2026-08-20',
      section: 'guides',
      author: { name: 'Example author' },
      coverImage,
    });

    expect(article).toMatchObject({
      title: 'A valid article',
      draft: false,
      publishedAt: new Date('2026-08-20T00:00:00.000Z'),
      section: 'guides',
      tags: [],
      author: { name: 'Example author', featured: false },
      coverImage,
    });
    expect(article.description).toBeUndefined();
    expect(article.updatedAt).toBeUndefined();
  });

  test.each([
    ['a missing required field', { publishedAt: '2026-08-20', section: 'guides', author: { name: 'Author' } }],
    [
      'an unsupported select value',
      { title: 'Article', publishedAt: '2026-08-20', section: 'other', author: { name: 'Author' } },
    ],
    [
      'a fractional integer',
      {
        title: 'Article',
        publishedAt: '2026-08-20',
        section: 'guides',
        readingMinutes: 1.5,
        author: { name: 'Author' },
      },
    ],
    [
      'a number above its maximum',
      {
        title: 'Article',
        publishedAt: '2026-08-20',
        section: 'guides',
        readingMinutes: 61,
        author: { name: 'Author' },
      },
    ],
    ['invalid nested data', { title: 'Article', publishedAt: '2026-08-20', section: 'guides', author: {} }],
  ])('rejects %s with a useful field path', (_name, fixture) => {
    const result = schema.safeParse(fixture);
    const issues = result.success ? [] : result.error.issues;

    expect(result.success).toBe(false);
    expect(issues[0]?.path.length).toBeGreaterThan(0);
  });

  test('normalizes empty optional dates while rejecting invalid dates', () => {
    const required = {
      title: 'Article',
      publishedAt: '2026-08-20',
      section: 'guides',
      author: { name: 'Author' },
    };

    expect(schema.parse({ ...required, updatedAt: '' }).updatedAt).toBeUndefined();
    expect(schema.parse({ ...required, updatedAt: null }).updatedAt).toBeUndefined();
    expect(() => schema.parse({ ...required, updatedAt: 'not-a-date' })).toThrow('Invalid input');
  });

  test('rejects image defaults because Astro must load image metadata', () => {
    const model = defineModel({
      ...articleModel,
      fields: {
        image: { kind: 'asset', assetType: 'image', default: '/cover.png', label: 'Image' },
      },
    });

    expect(() => createAstroSchema(model, { image })).toThrow(AstroContentAdapterError);
    expect(() => createAstroSchema(model, { image })).toThrow('image defaults cannot be converted');
  });

  test('creates a typed collection registry without duplicating collection names', () => {
    const collections = createAstroCollections([articleModel] as const);
    const collection = collections.articles;

    expect(Object.keys(collections)).toEqual(['articles']);
    expect(collection).toHaveProperty('loader');
    expect(collection).toHaveProperty('schema');
  });

  test('infers collection data directly from the model', () => {
    const typedArticle: AstroModelData<typeof articleModel> = schema.parse({
      title: 'Typed article',
      publishedAt: '2026-08-20',
      section: 'notes',
      author: { name: 'Author' },
    });

    const title: string = typedArticle.title;
    const publishedAt: Date = typedArticle.publishedAt;
    const draft: boolean = typedArticle.draft;

    expect({ title, publishedAt, draft }).toMatchObject({ title: 'Typed article', draft: false });
  });
});
