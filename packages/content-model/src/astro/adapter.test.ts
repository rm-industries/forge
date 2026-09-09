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
      z.literal('apng'),
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
    primarySkill: {
      kind: 'reference',
      collection: 'skills',
      displayFields: ['name'],
      required: true,
      label: 'Primary skill',
    },
    secondarySkill: { kind: 'reference', collection: 'skills', displayFields: ['name'], label: 'Secondary skill' },
    fallbackSkill: {
      kind: 'reference',
      collection: 'skills',
      default: 'typescript',
      displayFields: ['name'],
      label: 'Fallback skill',
    },
    relatedSkills: {
      kind: 'reference',
      collection: 'skills',
      multiple: true,
      default: [],
      displayFields: ['name'],
      label: 'Related skills',
    },
    skillMetadata: {
      kind: 'object',
      label: 'Skill metadata',
      fields: {
        featuredSkill: {
          kind: 'reference',
          collection: 'skills',
          displayFields: ['name'],
          required: true,
          label: 'Featured skill',
        },
      },
    },
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
      primarySkill: 'typescript',
    });

    expect(article).toMatchObject({
      title: 'A valid article',
      draft: false,
      publishedAt: new Date('2026-08-20T00:00:00.000Z'),
      section: 'guides',
      tags: [],
      author: { name: 'Example author', featured: false },
      coverImage,
      primarySkill: 'typescript',
      relatedSkills: [],
      fallbackSkill: 'typescript',
    });
    expect(article.description).toBeUndefined();
    expect(article.updatedAt).toBeUndefined();
    expect(article.secondarySkill).toBeUndefined();
  });

  test.each([
    [
      'a missing required field',
      { publishedAt: '2026-08-20', section: 'guides', author: { name: 'Author' }, primarySkill: 'typescript' },
    ],
    [
      'an unsupported select value',
      {
        title: 'Article',
        publishedAt: '2026-08-20',
        section: 'other',
        author: { name: 'Author' },
        primarySkill: 'typescript',
      },
    ],
    [
      'a fractional integer',
      {
        title: 'Article',
        publishedAt: '2026-08-20',
        section: 'guides',
        readingMinutes: 1.5,
        author: { name: 'Author' },
        primarySkill: 'typescript',
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
        primarySkill: 'typescript',
      },
    ],
    [
      'invalid nested data',
      { title: 'Article', publishedAt: '2026-08-20', section: 'guides', author: {}, primarySkill: 'typescript' },
    ],
    [
      'an invalid multiple reference',
      {
        title: 'Article',
        publishedAt: '2026-08-20',
        section: 'guides',
        author: { name: 'Author' },
        primarySkill: 'typescript',
        relatedSkills: 'typescript',
      },
    ],
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
      primarySkill: 'typescript',
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
    const skillModel = defineModel({
      name: 'skills',
      label: 'Skills',
      labelSingular: 'Skill',
      folder: 'src/content/skills',
      extensions: ['json'],
      format: 'json',
      slug: '{{name}}',
      fields: { name: { kind: 'string', required: true, label: 'Name' } },
    });
    const collections = createAstroCollections([articleModel, skillModel] as const);
    const collection = collections.articles;

    expect(Object.keys(collections)).toEqual(['articles', 'skills']);
    expect(collection).toHaveProperty('loader');
    expect(collection).toHaveProperty('schema');
  });

  test('infers collection data directly from the model', () => {
    const typedArticle: AstroModelData<typeof articleModel> = schema.parse({
      title: 'Typed article',
      publishedAt: '2026-08-20',
      section: 'notes',
      author: { name: 'Author' },
      primarySkill: 'typescript',
    });

    const title: string = typedArticle.title;
    const publishedAt: Date = typedArticle.publishedAt;
    const draft: boolean = typedArticle.draft;
    const primarySkill: string = typedArticle.primarySkill;
    const relatedSkills: string[] = typedArticle.relatedSkills;
    const secondarySkill: string | undefined = typedArticle.secondarySkill;
    const fallbackSkill: string = typedArticle.fallbackSkill;

    expect({ title, publishedAt, draft, primarySkill, secondarySkill, fallbackSkill, relatedSkills }).toMatchObject({
      title: 'Typed article',
      draft: false,
      primarySkill: 'typescript',
      secondarySkill: undefined,
      fallbackSkill: 'typescript',
      relatedSkills: [],
    });
  });
});
