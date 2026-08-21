import type { ImageMetadata } from 'astro';
import { defineCollection, type SchemaContext } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import type { ContentCollectionModel, ContentField, ContentModelRegistry } from '../types';
import { validateContentModel, validateContentModels } from '../validation';

export class AstroContentAdapterError extends TypeError {}

type PresentFieldValue<Field extends ContentField> = Field extends { kind: 'string' }
  ? string
  : Field extends { kind: 'boolean' }
    ? boolean
    : Field extends { kind: 'number' }
      ? number
      : Field extends { kind: 'date' }
        ? Date
        : Field extends { kind: 'list'; items: infer Item extends ContentField }
          ? Array<PresentFieldValue<Item>>
          : Field extends { kind: 'object'; fields: infer Fields extends Record<string, ContentField> }
            ? AstroFieldsOutput<Fields>
            : Field extends { kind: 'asset'; assetType: 'image' }
              ? ImageMetadata
              : never;

export type AstroFieldOutput<Field extends ContentField> = Field extends { required: true } | { default: unknown }
  ? PresentFieldValue<Field>
  : PresentFieldValue<Field> | undefined;

export type AstroFieldsOutput<Fields extends Record<string, ContentField>> = {
  [Name in keyof Fields]: AstroFieldOutput<Fields[Name]>;
};

export type AstroModelData<Model extends ContentCollectionModel> = AstroFieldsOutput<Model['fields']>;

const parseDate = (value: unknown) => {
  if (typeof value === 'string') return new Date(value);
  return value;
};

const parseOptionalDate = (value: unknown) => {
  if (value === null || value === '') return undefined;
  return parseDate(value);
};

const optionalUnlessRequired = (schema: z.ZodType, field: ContentField, forcePresent: boolean) =>
  forcePresent || field.required ? schema : schema.optional();

const createAstroField = (
  name: string,
  field: ContentField,
  image: SchemaContext['image'],
  forcePresent = false,
): z.ZodType => {
  switch (field.kind) {
    case 'string': {
      const schema = field.options
        ? z.string().refine((value) => field.options?.some((option) => option.value === value), {
            message: `Choose a configured value for ${name}.`,
          })
        : z.string();
      if (field.default !== undefined) return schema.default(field.default);
      return optionalUnlessRequired(schema, field, forcePresent);
    }
    case 'boolean': {
      const schema = z.boolean();
      if (field.default !== undefined) return schema.default(field.default);
      return optionalUnlessRequired(schema, field, forcePresent);
    }
    case 'number': {
      let schema = z.number();
      if (field.integer) schema = schema.int();
      if (field.min !== undefined) schema = schema.min(field.min);
      if (field.max !== undefined) schema = schema.max(field.max);
      if (field.default !== undefined) return schema.default(field.default);
      return optionalUnlessRequired(schema, field, forcePresent);
    }
    case 'date': {
      const schema = z.preprocess(parseDate, z.date());
      if (field.default !== undefined) return schema.default(new Date(field.default));
      if (forcePresent || field.required) return schema;
      return z.preprocess(parseOptionalDate, z.date().optional());
    }
    case 'list': {
      const schema = z.array(createAstroField(`${name} item`, field.items, image, true));
      if (field.default !== undefined) return schema.default([...field.default]);
      return optionalUnlessRequired(schema, field, forcePresent);
    }
    case 'object': {
      const schema = z.object(
        Object.fromEntries(
          Object.entries(field.fields).map(([nestedName, nestedField]) => [
            nestedName,
            createAstroField(`${name}.${nestedName}`, nestedField, image),
          ]),
        ),
      );
      return optionalUnlessRequired(schema, field, forcePresent);
    }
    case 'asset': {
      if (field.default !== undefined)
        throw new AstroContentAdapterError(
          `${name}.default: image defaults cannot be converted to Astro image metadata without loading an asset.`,
        );
      return optionalUnlessRequired(image(), field, forcePresent);
    }
  }
};

export const createAstroSchema = <const Model extends ContentCollectionModel>(
  model: Model,
  context: SchemaContext,
): z.ZodType<AstroModelData<Model>> => {
  validateContentModel(model);

  const shape = Object.fromEntries(
    Object.entries(model.fields).map(([name, field]) => [name, createAstroField(name, field, context.image)]),
  );

  return z.object(shape) as z.ZodType<AstroModelData<Model>>;
};

export const createAstroCollection = <const Model extends ContentCollectionModel>(model: Model) => {
  validateContentModel(model);
  const extensions = model.extensions ?? ['md', 'mdx'];
  const pattern = extensions.length === 1 ? `**/*.${extensions[0]}` : `**/*.{${extensions.join(',')}}`;

  return defineCollection({
    loader: glob({ base: `./${model.folder}`, pattern }),
    schema: (context) => createAstroSchema(model, context),
  });
};

type AstroCollections<Models extends ContentModelRegistry> = {
  [Model in Models[number] as Model['name']]: ReturnType<typeof createAstroCollection<Model>>;
};

export const createAstroCollections = <const Models extends ContentModelRegistry>(
  models: Models,
): AstroCollections<Models> => {
  validateContentModels(models);

  return Object.fromEntries(
    models.map((model) => [model.name, createAstroCollection(model)]),
  ) as AstroCollections<Models>;
};
