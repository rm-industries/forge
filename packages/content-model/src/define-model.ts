import type { ContentCollectionModel, ContentModelRegistry, FieldEntry, FieldsFromEntries } from './types';
import { fieldsFromEntries, validateContentModel, validateContentModels } from './validation';

export const defineFields = <const Entries extends readonly FieldEntry[]>(
  entries: Entries,
): FieldsFromEntries<Entries> => {
  const fields = fieldsFromEntries(entries);
  return fields as FieldsFromEntries<Entries>;
};

export const defineModel = <const Model extends ContentCollectionModel>(model: Model): Model => {
  validateContentModel(model);
  return model;
};

export const defineModels = <const Models extends ContentModelRegistry>(models: Models): Models => {
  validateContentModels(models);
  return models;
};
