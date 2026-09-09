import { expect, test } from 'vitest';

import {
  ContentModelValidationError,
  defineFields,
  defineModel,
  defineModels,
  type ContentCollectionModel,
  type ContentField,
} from './index';

const articleFields = defineFields([
  ['title', { kind: 'string', required: true, label: 'Title' }],
  ['description', { kind: 'string', multiline: true, label: 'Description' }],
  ['draft', { kind: 'boolean', default: false, label: 'Draft' }],
  ['updatedDate', { kind: 'date', mode: 'datetime', label: 'Updated date' }],
  ['readingMinutes', { kind: 'number', integer: true, min: 1, label: 'Reading minutes' }],
  [
    'section',
    {
      kind: 'string',
      required: true,
      options: [
        { label: 'Process', value: 'process' },
        { label: 'Projects', value: 'projects' },
      ],
      label: 'Section',
    },
  ],
  [
    'tags',
    {
      kind: 'list',
      default: [],
      items: { kind: 'string', required: true, label: 'Tag' },
      label: 'Tags',
    },
  ],
  [
    'author',
    {
      kind: 'object',
      required: true,
      fields: {
        name: { kind: 'string', required: true, label: 'Name' },
        bio: { kind: 'string', multiline: true, label: 'Biography' },
      },
      label: 'Author',
    },
  ],
  ['coverImage', { kind: 'asset', assetType: 'image', label: 'Cover image' }],
] as const);

const articleModel = defineModel({
  name: 'articles',
  label: 'Articles',
  labelSingular: 'Article',
  folder: 'src/content/articles',
  extensions: ['md', 'mdx'],
  slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
  fields: articleFields,
  body: { name: 'body', label: 'Body', required: true },
  sort: {
    fields: ['slug', 'title'],
    default: { field: 'slug', direction: 'descending' },
  },
});

test('models every v1 article capability without integration metadata', () => {
  expect(articleModel.fields.description.multiline).toBe(true);
  expect(articleModel.fields.section.options?.[0]?.value).toBe('process');
  expect(articleModel.fields.author.kind).toBe('object');
  expect(articleModel.fields.coverImage.assetType).toBe('image');
  expect(articleModel.body?.name).toBe('body');
});

test('preserves model and field literals for adapter inference', () => {
  const collectionName: 'articles' = articleModel.name;
  const titleKind: 'string' = articleModel.fields.title.kind;

  expect(collectionName).toBe('articles');
  expect(titleKind).toBe('string');
});

test('rejects duplicate collection names', () => {
  const defineDuplicateModels = () => defineModels([articleModel, { ...articleModel }]);

  expect(defineDuplicateModels).toThrow(ContentModelValidationError);
  expect(defineDuplicateModels).toThrow('models: contains duplicate collection name "articles".');
});

test('validates single, multiple, and recursively nested references against the registry', () => {
  const skills = defineModel({
    name: 'skills',
    label: 'Skills',
    labelSingular: 'Skill',
    folder: 'src/content/skills',
    format: 'json',
    extensions: ['json'],
    slug: '{{name}}',
    entryLabelField: 'name',
    fields: { name: { kind: 'string', required: true, label: 'Name' } },
  });
  const experience = defineModel({
    name: 'experience',
    label: 'Experience',
    labelSingular: 'Experience',
    folder: 'src/content/experience',
    extensions: ['md'],
    slug: '{{slug}}',
    fields: {
      primarySkill: {
        kind: 'reference',
        collection: 'skills',
        required: true,
        valueField: 'name',
        displayFields: ['name'],
        label: 'Primary skill',
      },
      relatedSkills: {
        kind: 'reference',
        collection: 'skills',
        multiple: true,
        default: [],
        displayFields: ['name'],
        searchFields: ['name'],
        label: 'Related skills',
      },
      details: {
        kind: 'object',
        required: true,
        label: 'Details',
        fields: {
          skill: { kind: 'reference', collection: 'skills', displayFields: ['name'], label: 'Skill' },
        },
      },
      groups: {
        kind: 'list',
        label: 'Groups',
        items: {
          kind: 'object',
          required: true,
          label: 'Group',
          fields: {
            skills: {
              kind: 'reference',
              collection: 'skills',
              multiple: true,
              displayFields: ['name'],
              label: 'Skills',
            },
          },
        },
      },
    },
  });

  expect(() => defineModels([skills, experience])).not.toThrow();
});

test('reports the complete path for a reference to an unregistered collection', () => {
  const { sort: _sort, ...articleWithoutSort } = articleModel;
  const model = defineModel({
    ...articleWithoutSort,
    fields: {
      metadata: {
        kind: 'object',
        label: 'Metadata',
        fields: {
          skills: {
            kind: 'reference',
            collection: 'skills',
            multiple: true,
            displayFields: ['name'],
            label: 'Skills',
          },
        },
      },
    },
  });

  expect(() => defineModels([model])).toThrow(
    'articles.fields.metadata.fields.skills.collection: references unknown collection "skills".',
  );
});

test('validates reference cardinality, defaults, and authoring hints', () => {
  expect(() =>
    defineModel({
      ...articleModel,
      fields: {
        skill: {
          kind: 'reference',
          collection: 'skills',
          multiple: false,
          default: [],
          displayFields: ['name'],
          label: 'Skill',
        },
      },
    } as unknown as ContentCollectionModel),
  ).toThrow('must be a string for a single reference');
  expect(() =>
    defineModel({
      ...articleModel,
      fields: {
        skills: {
          kind: 'reference',
          collection: 'skills',
          multiple: true,
          default: 'typescript',
          displayFields: ['name'],
          label: 'Skills',
        },
      },
    } as unknown as ContentCollectionModel),
  ).toThrow('must be an array of strings for a multiple reference');
  expect(() =>
    defineModel({
      ...articleModel,
      fields: {
        skill: { kind: 'reference', collection: 'skills', displayFields: [], label: 'Skill' },
      },
    }),
  ).toThrow('displayFields: must contain at least one field');
  expect(() => defineModel({ ...articleModel, entryLabelField: 'missing' })).toThrow(
    'articles.entryLabelField: references unknown field "missing".',
  );
});

test('rejects duplicate field entries before creating a field record', () => {
  expect(() =>
    defineFields([
      ['title', { kind: 'string', label: 'Title' }],
      ['title', { kind: 'string', label: 'Replacement title' }],
    ]),
  ).toThrow(/contains duplicate field name "title"/u);
});

test('rejects a Markdown body that collides with a frontmatter field', () => {
  expect(() =>
    defineModel({ ...articleModel, fields: { ...articleModel.fields, body: { kind: 'string', label: 'Body' } } }),
  ).toThrow(/duplicates field name "body"/u);
});

test('rejects unsupported field kinds with their model path', () => {
  const invalidModel = {
    ...articleModel,
    fields: { video: { kind: 'video', label: 'Video' } },
  } as unknown as ContentCollectionModel;

  expect(() => defineModel(invalidModel)).toThrow(/articles\.fields\.video\.kind: unsupported field kind "video"/u);
});

test('rejects unsupported file assets clearly', () => {
  const invalidModel = {
    ...articleModel,
    fields: { attachment: { kind: 'asset', assetType: 'file', label: 'Attachment' } },
  } as unknown as ContentCollectionModel;

  expect(() => defineModel(invalidModel)).toThrow(/only image assets are supported in v1/u);
});

test('rejects invalid defaults, select options, bounds, and sort fields', () => {
  expect(() =>
    defineModel({
      ...articleModel,
      fields: {
        section: {
          kind: 'string',
          default: 'missing',
          options: [{ label: 'Known', value: 'known' }],
          label: 'Section',
        },
      },
    }),
  ).toThrow(/must match one of the configured option values/u);
  expect(() =>
    defineModel({ ...articleModel, fields: { count: { kind: 'number', min: 10, max: 1, label: 'Count' } } }),
  ).toThrow(/min must be less than or equal to max/u);
  expect(() => defineModel({ ...articleModel, sort: { fields: ['missing'] } })).toThrow(
    /references unknown field "missing"/u,
  );
});

test('field types reject defaults and presentation owned by another kind', () => {
  const invalidBoolean = {
    kind: 'boolean',
    default: 'false',
    label: 'Draft',
  } as const;
  const invalidString = {
    kind: 'string',
    default: [],
    label: 'Title',
  } as const;
  const unsupportedKind = { kind: 'video', label: 'Video' } as const;
  const invalidMultipleReference = {
    kind: 'reference',
    collection: 'skills',
    multiple: true,
    default: 'typescript',
    displayFields: ['name'],
    label: 'Skills',
  } as const;

  // @ts-expect-error Boolean defaults must be booleans.
  const booleanField: ContentField = invalidBoolean;
  // @ts-expect-error String defaults must be strings.
  const stringField: ContentField = invalidString;
  // @ts-expect-error Video is not a supported v1 field kind.
  const videoField: ContentField = unsupportedKind;
  // @ts-expect-error Multiple-reference defaults must be arrays of strings.
  const referenceField: ContentField = invalidMultipleReference;

  expect(booleanField.kind).toBe('boolean');
  expect(stringField.kind).toBe('string');
  expect(videoField.kind).toBe('video');
  expect(referenceField.kind).toBe('reference');
});
