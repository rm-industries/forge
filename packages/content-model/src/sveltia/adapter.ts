import type { EntryCollection, Field } from '@sveltia/cms';

import type { ContentCollectionModel, ContentField, ContentModelRegistry } from '../types';
import { validateContentModel, validateContentModels } from '../validation';

export interface SveltiaFieldCustomizationContext {
  collection: string;
  path: string;
  source: ContentField;
}

export interface SveltiaCollectionOptions {
  summary?: string;
  customizeField?: (field: Field, context: SveltiaFieldCustomizationContext) => Field;
}

const commonFieldProperties = (name: string, field: ContentField) => ({
  name,
  label: field.label,
  required: field.required ?? false,
  after_input: field.help,
});

const toSveltiaReferenceField = (name: string) => (name === 'slug' ? '{{slug}}' : name);

const createSveltiaField = (
  name: string,
  field: ContentField,
  collection: string,
  path: string,
  customize?: SveltiaCollectionOptions['customizeField'],
): Field => {
  const common = commonFieldProperties(name, field);

  let generated: Field;

  switch (field.kind) {
    case 'string':
      if (field.options)
        generated = {
          ...common,
          widget: 'select',
          options: field.options.map((option) => ({ ...option })),
          default: field.default,
        };
      else if (field.multiline) generated = { ...common, widget: 'text', default: field.default };
      else generated = { ...common, default: field.default };
      break;
    case 'boolean':
      generated = { ...common, widget: 'boolean', default: field.default };
      break;
    case 'number':
      generated = {
        ...common,
        widget: 'number',
        value_type: field.integer ? 'int' : 'float',
        min: field.min,
        max: field.max,
        default: field.default,
      };
      break;
    case 'date':
      generated = {
        ...common,
        widget: 'datetime',
        type: field.mode === 'datetime' ? 'datetime-local' : 'date',
        format: field.mode === 'datetime' ? undefined : 'YYYY-MM-DD',
        default: field.default,
      };
      break;
    case 'reference':
      generated = {
        ...common,
        widget: 'relation',
        collection: field.collection,
        multiple: field.multiple ?? false,
        value_field: toSveltiaReferenceField(field.valueField ?? 'slug'),
        display_fields: field.displayFields?.map(toSveltiaReferenceField),
        search_fields: field.searchFields?.map(toSveltiaReferenceField),
        default:
          field.default === undefined ? undefined : Array.isArray(field.default) ? [...field.default] : field.default,
      };
      break;
    case 'list':
      if (field.items.kind === 'string' && field.items.options)
        generated = {
          ...common,
          widget: 'select',
          multiple: true,
          options: field.items.options.map((option) => ({ ...option })),
          default: field.default ? [...field.default] : undefined,
        };
      else if (field.items.kind === 'string')
        generated = { ...common, widget: 'list', default: field.default ? [...field.default] : undefined };
      else if (field.items.kind === 'object')
        generated = {
          ...common,
          widget: 'list',
          summary: field.itemLabel,
          default: field.default ? [...field.default] : undefined,
          fields: Object.entries(field.items.fields).map(([nestedName, nestedField]) =>
            createSveltiaField(nestedName, nestedField, collection, `${path}.items.fields.${nestedName}`, customize),
          ),
        };
      else
        generated = {
          ...common,
          widget: 'list',
          default: field.default ? [...field.default] : undefined,
          field: createSveltiaField('item', field.items, collection, `${path}.items`, customize),
        };
      break;
    case 'object':
      generated = {
        ...common,
        widget: 'object',
        fields: Object.entries(field.fields).map(([nestedName, nestedField]) =>
          createSveltiaField(nestedName, nestedField, collection, `${path}.fields.${nestedName}`, customize),
        ),
      };
      break;
    case 'asset':
      generated = { ...common, widget: 'image', default: field.default };
      break;
  }

  return customize ? customize(structuredClone(generated), { collection, path, source: field }) : generated;
};

export const createSveltiaCollection = (
  model: ContentCollectionModel,
  options: SveltiaCollectionOptions = {},
): EntryCollection => {
  validateContentModel(model);

  const fields = Object.entries(model.fields).map(([name, field]) =>
    createSveltiaField(name, field, model.name, `${model.name}.fields.${name}`, options.customizeField),
  );
  if (model.body)
    fields.push({
      name: model.body.name,
      label: model.body.label,
      widget: 'richtext',
      required: model.body.required ?? false,
      after_input: model.body.help,
    });

  const collection: EntryCollection = {
    name: model.name,
    label: model.label,
    label_singular: model.labelSingular,
    folder: model.folder,
    slug: model.slug,
    identifier_field: model.entryLabelField,
    summary: options.summary,
    fields,
  };

  if (model.format) {
    collection.format = model.format;
    collection.extension = model.extensions?.[0] ?? model.format;
  }
  if (model.sort) {
    collection.sortable_fields = { fields: [...model.sort.fields] };
    if (model.sort.default) collection.sortable_fields.default = { ...model.sort.default };
  }

  return collection;
};

export const createSveltiaCollections = (
  models: ContentModelRegistry,
  options?: (model: ContentCollectionModel) => SveltiaCollectionOptions | undefined,
): EntryCollection[] => {
  validateContentModels(models);
  return models.map((model) => createSveltiaCollection(model, options?.(model)));
};
