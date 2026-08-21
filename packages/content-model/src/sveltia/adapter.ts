import type { EntryCollection, Field } from '@sveltia/cms';

import type { ContentCollectionModel, ContentField } from '../types';
import { validateContentModel } from '../validation';

const commonFieldProperties = (name: string, field: ContentField) => ({
  name,
  label: field.label,
  required: field.required ?? false,
  after_input: field.help,
});

const createSveltiaField = (name: string, field: ContentField): Field => {
  const common = commonFieldProperties(name, field);

  switch (field.kind) {
    case 'string':
      if (field.options)
        return {
          ...common,
          widget: 'select',
          options: field.options.map((option) => ({ ...option })),
          default: field.default,
        };
      if (field.multiline) return { ...common, widget: 'text', default: field.default };
      return { ...common, default: field.default };
    case 'boolean':
      return { ...common, widget: 'boolean', default: field.default };
    case 'number':
      return {
        ...common,
        widget: 'number',
        value_type: field.integer ? 'int' : 'float',
        min: field.min,
        max: field.max,
        default: field.default,
      };
    case 'date':
      return {
        ...common,
        widget: 'datetime',
        type: field.mode === 'datetime' ? 'datetime-local' : 'date',
        format: field.mode === 'datetime' ? undefined : 'YYYY-MM-DD',
        default: field.default,
      };
    case 'list':
      if (field.items.kind === 'string' && field.items.options)
        return {
          ...common,
          widget: 'select',
          multiple: true,
          options: field.items.options.map((option) => ({ ...option })),
          default: field.default ? [...field.default] : undefined,
        };
      if (field.items.kind === 'string')
        return { ...common, widget: 'list', default: field.default ? [...field.default] : undefined };
      if (field.items.kind === 'object')
        return {
          ...common,
          widget: 'list',
          summary: field.itemLabel,
          default: field.default ? [...field.default] : undefined,
          fields: Object.entries(field.items.fields).map(([nestedName, nestedField]) =>
            createSveltiaField(nestedName, nestedField),
          ),
        };
      return {
        ...common,
        widget: 'list',
        default: field.default ? [...field.default] : undefined,
        field: createSveltiaField('item', field.items),
      };
    case 'object':
      return {
        ...common,
        widget: 'object',
        fields: Object.entries(field.fields).map(([nestedName, nestedField]) =>
          createSveltiaField(nestedName, nestedField),
        ),
      };
    case 'asset':
      return { ...common, widget: 'image', default: field.default };
  }
};

export const createSveltiaCollection = (model: ContentCollectionModel): EntryCollection => {
  validateContentModel(model);

  const fields = Object.entries(model.fields).map(([name, field]) => createSveltiaField(name, field));
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
