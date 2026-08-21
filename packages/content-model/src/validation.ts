import type {
  ContentCollectionModel,
  ContentField,
  ContentFields,
  ContentModelRegistry,
  DateContentField,
  FieldEntry,
  ListContentField,
  NumberContentField,
  StringContentField,
} from './types';

export class ContentModelValidationError extends TypeError {}

const identifierPattern = /^[a-z][a-z0-9-]*$/u;
const fieldNamePattern = /^[a-z][A-Za-z0-9]*$/u;

const fail = (path: string, message: string): never => {
  throw new ContentModelValidationError(`${path}: ${message}`);
};

const requireText = (value: unknown, path: string): string => {
  if (typeof value !== 'string') return fail(path, 'must be a non-empty string.');
  if (!value.trim()) return fail(path, 'must be a non-empty string.');
  return value;
};

const requireIdentifier = (value: unknown, path: string): string => {
  const identifier = requireText(value, path);
  if (!identifierPattern.test(identifier)) fail(path, 'must use lowercase kebab-case.');
  return identifier;
};

const requireFieldName = (value: unknown, path: string): string => {
  const name = requireText(value, path);
  if (!fieldNamePattern.test(name)) fail(path, 'must use lower camelCase.');
  return name;
};

const validateDefault = (field: ContentField, path: string): void => {
  if (!Object.hasOwn(field, 'default')) return;

  const value = field.default;

  switch (field.kind) {
    case 'string':
    case 'date':
    case 'asset':
      if (typeof value !== 'string') fail(`${path}.default`, 'must be a string.');
      break;
    case 'boolean':
      if (typeof value !== 'boolean') fail(`${path}.default`, 'must be a boolean.');
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path}.default`, 'must be a finite number.');
      break;
    case 'list':
      if (!Array.isArray(value)) fail(`${path}.default`, 'must be an array.');
      break;
    case 'object':
      fail(`${path}.default`, 'object defaults are not supported in v1.');
  }
};

const validateString = (field: StringContentField, path: string): void => {
  if (field.multiline !== undefined && typeof field.multiline !== 'boolean')
    fail(`${path}.multiline`, 'must be a boolean.');

  if (!field.options) return;
  if (field.options.length === 0) fail(`${path}.options`, 'must contain at least one option.');

  const values = new Set<string>();
  field.options.forEach((option, index) => {
    requireText(option.label, `${path}.options[${index}].label`);
    const value = requireText(option.value, `${path}.options[${index}].value`);
    if (values.has(value)) fail(`${path}.options`, `contains duplicate value "${value}".`);
    values.add(value);
  });

  if (field.default !== undefined && !values.has(field.default))
    fail(`${path}.default`, 'must match one of the configured option values.');
};

const validateNumber = (field: NumberContentField, path: string): void => {
  for (const bound of ['min', 'max'] as const) {
    const value = field[bound];
    if (value !== undefined && (!Number.isFinite(value) || typeof value !== 'number'))
      fail(`${path}.${bound}`, 'must be a finite number.');
  }
  if (field.min !== undefined && field.max !== undefined && field.min > field.max)
    fail(path, 'min must be less than or equal to max.');
  if (field.integer !== undefined && typeof field.integer !== 'boolean') fail(`${path}.integer`, 'must be a boolean.');
  if (field.default !== undefined) {
    if (field.integer && !Number.isInteger(field.default)) fail(`${path}.default`, 'must be an integer.');
    if (field.min !== undefined && field.default < field.min) fail(`${path}.default`, `must be at least ${field.min}.`);
    if (field.max !== undefined && field.default > field.max) fail(`${path}.default`, `must be at most ${field.max}.`);
  }
};

const validateDate = (field: DateContentField, path: string): void => {
  if (field.mode !== undefined && !['date', 'datetime'].includes(field.mode))
    fail(`${path}.mode`, 'must be "date" or "datetime".');
  if (field.default !== undefined) {
    const isDate =
      /^\d{4}-\d{2}-\d{2}$/u.test(field.default) && !Number.isNaN(Date.parse(`${field.default}T00:00:00Z`));
    const isDateTime = /^\d{4}-\d{2}-\d{2}T/u.test(field.default) && !Number.isNaN(Date.parse(field.default));
    if ((field.mode ?? 'date') === 'date' && !isDate) fail(`${path}.default`, 'must be an ISO calendar date.');
    if (field.mode === 'datetime' && !isDateTime) fail(`${path}.default`, 'must be an ISO date-time.');
  }
};

const validateListItem = (field: ContentField, value: unknown, path: string): void => {
  switch (field.kind) {
    case 'string':
    case 'date':
    case 'asset':
      if (typeof value !== 'string') fail(path, 'must be a string.');
      return;
    case 'boolean':
      if (typeof value !== 'boolean') fail(path, 'must be a boolean.');
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a finite number.');
      return;
    case 'list':
      if (!Array.isArray(value)) return fail(path, 'must be an array.');
      value.forEach((item, index) => validateListItem(field.items, item, `${path}[${index}]`));
      return;
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object.');
      return;
  }
};

const validateList = (field: ListContentField, path: string): void => {
  validateField(field.items, `${path}.items`);
  if (field.itemLabel !== undefined) requireText(field.itemLabel, `${path}.itemLabel`);
  field.default?.forEach((item, index) => validateListItem(field.items, item, `${path}.default[${index}]`));
};

const validateField = (field: ContentField, path: string): void => {
  if (!field || typeof field !== 'object') fail(path, 'must be a field definition.');
  requireText(field.label, `${path}.label`);
  if (field.help !== undefined) requireText(field.help, `${path}.help`);
  if (field.required !== undefined && typeof field.required !== 'boolean')
    fail(`${path}.required`, 'must be a boolean.');

  validateDefault(field, path);

  switch (field.kind) {
    case 'string':
      validateString(field, path);
      return;
    case 'boolean':
      return;
    case 'number':
      validateNumber(field, path);
      return;
    case 'date':
      validateDate(field, path);
      return;
    case 'list':
      validateList(field, path);
      return;
    case 'object':
      validateFields(field.fields, `${path}.fields`);
      return;
    case 'asset':
      if (field.assetType !== 'image') fail(`${path}.assetType`, 'only image assets are supported in v1.');
      if (field.default !== undefined) requireText(field.default, `${path}.default`);
      return;
    default:
      fail(`${path}.kind`, `unsupported field kind "${String((field as { kind?: unknown }).kind)}".`);
  }
};

const validateFields = (fields: ContentFields, path: string): void => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) fail(path, 'must be a field record.');

  const entries = Object.entries(fields);
  if (entries.length === 0) fail(path, 'must define at least one field.');

  for (const [name, field] of entries) {
    requireFieldName(name, `${path}.${name}`);
    validateField(field, `${path}.${name}`);
  }
};

export const validateContentModel = (model: ContentCollectionModel): void => {
  if (!model || typeof model !== 'object') fail('model', 'must be a collection definition.');

  requireIdentifier(model.name, 'model.name');
  requireText(model.label, 'model.label');
  requireText(model.labelSingular, 'model.labelSingular');
  requireText(model.folder, 'model.folder');
  requireText(model.slug, 'model.slug');
  validateFields(model.fields, `${model.name}.fields`);

  if (model.extensions) {
    if (model.extensions.length === 0) fail(`${model.name}.extensions`, 'must contain at least one extension.');
    const extensions = new Set<string>();
    for (const extension of model.extensions) {
      if (!['json', 'md', 'mdx'].includes(extension))
        fail(`${model.name}.extensions`, `contains unsupported extension "${extension}".`);
      if (extensions.has(extension)) fail(`${model.name}.extensions`, `contains duplicate extension "${extension}".`);
      extensions.add(extension);
    }
  }
  if (model.format !== undefined && model.format !== 'json') fail(`${model.name}.format`, 'only json is supported.');

  if (model.body) {
    requireFieldName(model.body.name, `${model.name}.body.name`);
    requireText(model.body.label, `${model.name}.body.label`);
    if (model.body.help !== undefined) requireText(model.body.help, `${model.name}.body.help`);
    if (model.body.required !== undefined && typeof model.body.required !== 'boolean')
      fail(`${model.name}.body.required`, 'must be a boolean.');
    if (model.body.name in model.fields) fail(`${model.name}.body.name`, `duplicates field name "${model.body.name}".`);
  }

  const fieldNames = new Set(Object.keys(model.fields));
  for (const field of model.sort?.fields ?? []) {
    if (field !== 'slug' && !fieldNames.has(field))
      fail(`${model.name}.sort.fields`, `references unknown field "${field}".`);
  }
  if (model.sort?.default && model.sort.default.field !== 'slug' && !fieldNames.has(model.sort.default.field))
    fail(`${model.name}.sort.default.field`, `references unknown field "${model.sort.default.field}".`);
  if (model.sort?.default && !['ascending', 'descending'].includes(model.sort.default.direction))
    fail(`${model.name}.sort.default.direction`, 'must be "ascending" or "descending".');
};

export const validateContentModels = (models: ContentModelRegistry): void => {
  const names = new Set<string>();

  for (const model of models) {
    validateContentModel(model);
    if (names.has(model.name)) fail('models', `contains duplicate collection name "${model.name}".`);
    names.add(model.name);
  }
};

export const fieldsFromEntries = <const Entries extends readonly FieldEntry[]>(
  entries: Entries,
): Record<string, ContentField> => {
  const fields: Record<string, ContentField> = {};

  for (const [name, field] of entries) {
    requireFieldName(name, 'fields.name');
    if (Object.hasOwn(fields, name)) fail('fields', `contains duplicate field name "${name}".`);
    fields[name] = field;
  }

  return fields;
};
