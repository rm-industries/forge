export interface FieldPresentation {
  label: string;
  help?: string;
}

interface ContentFieldBase<Kind extends string, Default = never> extends FieldPresentation {
  kind: Kind;
  required?: boolean;
  default?: Default;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface StringContentField extends ContentFieldBase<'string', string> {
  multiline?: boolean;
  options?: readonly SelectOption[];
}

export type BooleanContentField = ContentFieldBase<'boolean', boolean>;

export interface NumberContentField extends ContentFieldBase<'number', number> {
  integer?: boolean;
  min?: number;
  max?: number;
}

export interface DateContentField extends ContentFieldBase<'date', string> {
  mode?: 'date' | 'datetime';
}

export interface ListContentField extends ContentFieldBase<'list', readonly unknown[]> {
  items: ContentField;
  itemLabel?: string;
}

export interface ObjectContentField extends ContentFieldBase<'object'> {
  fields: ContentFields;
}

export interface ImageContentField extends ContentFieldBase<'asset', string> {
  assetType: 'image';
}

export type ContentField =
  | StringContentField
  | BooleanContentField
  | NumberContentField
  | DateContentField
  | ListContentField
  | ObjectContentField
  | ImageContentField;

export type ContentFields = Readonly<Record<string, ContentField>>;

export interface ContentBody extends FieldPresentation {
  name: string;
  required?: boolean;
}

export interface ContentCollectionModel {
  name: string;
  label: string;
  labelSingular: string;
  folder: string;
  extensions?: readonly ('json' | 'md' | 'mdx')[];
  format?: 'json';
  slug: string;
  fields: ContentFields;
  body?: ContentBody;
  sort?: {
    fields: readonly string[];
    default?: {
      field: string;
      direction: 'ascending' | 'descending';
    };
  };
}

export type ContentModelRegistry = readonly ContentCollectionModel[];

export type FieldEntry = readonly [name: string, field: ContentField];

export type FieldsFromEntries<Entries extends readonly FieldEntry[]> = {
  readonly [Entry in Entries[number] as Entry[0]]: Entry[1];
};
