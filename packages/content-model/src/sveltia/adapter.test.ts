import type { SchemaContext } from 'astro/content/config';
import { z } from 'astro/zod';
import { describe, expect, test } from 'vitest';

import { createAstroSchema } from '../astro';
import { defineModel } from '../define-model';
import { createSveltiaCollection } from './index';

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
  sort: {
    fields: ['slug', 'title'],
    default: { field: 'slug', direction: 'descending' },
  },
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
    links: {
      kind: 'list',
      default: [],
      itemLabel: '{{fields.label}}',
      items: {
        kind: 'object',
        required: true,
        fields: {
          label: { kind: 'string', required: true, label: 'Label' },
          url: { kind: 'string', required: true, label: 'URL' },
        },
        label: 'Link',
      },
      label: 'Links',
    },
    author: {
      kind: 'object',
      required: true,
      fields: {
        name: { kind: 'string', required: true, label: 'Name' },
      },
      label: 'Author',
    },
    coverImage: { kind: 'asset', assetType: 'image', label: 'Cover image' },
  },
  body: { name: 'body', label: 'Body', required: true },
});

describe('Sveltia content adapter', () => {
  const collection = createSveltiaCollection(articleModel);

  test('derives collection metadata, sorting, and field order from the model', () => {
    expect(collection).toMatchObject({
      name: 'articles',
      label: 'Articles',
      label_singular: 'Article',
      folder: 'src/content/articles',
      slug: '{{slug}}',
      sortable_fields: {
        fields: ['slug', 'title'],
        default: { field: 'slug', direction: 'descending' },
      },
    });
    expect(collection.fields.map((field) => field.name)).toEqual([...Object.keys(articleModel.fields), 'body']);
  });

  test('maps every v1 primitive without redefining field behavior', () => {
    expect(collection.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'title', required: true }),
        expect.objectContaining({ name: 'description', widget: 'text', required: false }),
        expect.objectContaining({ name: 'draft', widget: 'boolean', default: false }),
        expect.objectContaining({ name: 'publishedAt', widget: 'datetime', type: 'date', format: 'YYYY-MM-DD' }),
        expect.objectContaining({ name: 'updatedAt', widget: 'datetime', type: 'datetime-local' }),
        expect.objectContaining({
          name: 'readingMinutes',
          widget: 'number',
          value_type: 'int',
          min: 1,
          max: 60,
        }),
        expect.objectContaining({ name: 'section', widget: 'select', required: true }),
        expect.objectContaining({ name: 'tags', widget: 'list', default: [] }),
        expect.objectContaining({ name: 'links', widget: 'list', summary: '{{fields.label}}', default: [] }),
        expect.objectContaining({ name: 'author', widget: 'object', required: true }),
        expect.objectContaining({ name: 'coverImage', widget: 'image', required: false }),
        expect.objectContaining({ name: 'body', widget: 'richtext', required: true }),
      ]),
    );
  });

  test('serializes to plain JSON without functions or unsupported values', () => {
    const serialized = JSON.stringify(collection);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect(serialized).not.toContain('undefined');
    expect(parsed).toMatchObject({ name: 'articles', folder: 'src/content/articles' });
  });

  test('keeps required fields, defaults, options, and nested shapes aligned with Astro', async () => {
    const cmsFields = Object.fromEntries(collection.fields.map((field) => [field.name, field]));
    const astroSchema = createAstroSchema(articleModel, { image });

    expect(cmsFields.title).toMatchObject({ required: true });
    expect(cmsFields.draft).toMatchObject({ default: false, required: false });
    expect(cmsFields.section).toMatchObject({
      options: [
        { label: 'Guides', value: 'guides' },
        { label: 'Notes', value: 'notes' },
      ],
    });
    expect(cmsFields.author).toMatchObject({
      fields: [expect.objectContaining({ name: 'name', required: true })],
    });
    await expect(
      astroSchema.parseAsync({
        title: 'Shared contract',
        publishedAt: '2026-08-20',
        section: 'guides',
        author: { name: 'Forge' },
        body: 'Both adapters derive this shape from one model.',
      }),
    ).resolves.toMatchObject({
      title: 'Shared contract',
      draft: false,
      section: 'guides',
      author: { name: 'Forge' },
    });
  });
});
