# `@rm-industries/content-model`

Integration-neutral content collection definitions and validation for Forge.
Astro and Sveltia adapters use separate package entry points; the core module
imports neither integration.

Install the stable package from npm:

```sh
npm install @rm-industries/content-model
```

The package exports integration-specific adapters from
`@rm-industries/content-model/astro` and
`@rm-industries/content-model/sveltia`. The core entry point imports neither
peer. Install only the Astro and Sveltia peer versions declared by the package;
those narrow ranges identify the compatibility matrix Forge has verified.

```ts
import { defineModel } from '@rm-industries/content-model';
import { createAstroCollections } from '@rm-industries/content-model/astro';
import { createSveltiaCollection } from '@rm-industries/content-model/sveltia';
```

The package uses native ESM and ships TypeScript declarations. Core and adapters
share one package version; other Forge packages are independently versioned.
Node `^22.22.2 || ^24.0.0 || ^26.0.0` and npm `^10.9.0 || ^11.0.0` are supported.
The current Astro peer is `^7.2.3` and Sveltia peer is `>=0.193.2 <0.252.0`;
inspect the installed manifest before selecting peers for another release.

## Model language

The v1 language follows the model proven in the Forge reference site:

- short text is a `string` field;
- multiline text is a `string` field with `multiline: true`;
- a select is a `string` field with shared `options`;
- Markdown or MDX body content is collection-level `body` metadata;
- dates use the `date` kind with `mode: 'date'` or `mode: 'datetime'`;
- images use the `asset` kind with `assetType: 'image'`;
- cross-collection relationships use a `reference` field with single or
  multiple cardinality;
- lists and objects recursively compose the same supported fields; and
- boolean and number fields carry kind-appropriate defaults and constraints.

Field names come from record keys instead of being repeated inside field
definitions. `defineFields` is available when fields are assembled dynamically
and rejects duplicate entries before converting them to a record.
Collection names use kebab-case, while field keys and Markdown body names use
lower camelCase to match content metadata and the proven reference models.

## Semantics

`required: true` means source content must provide a value unless a compatible
`default` is declared. Without `required` or a default, a field is optional.
Defaults are content values; labels, help text, multiline hints, and list item
labels are integration-neutral authoring metadata. Adapter-specific settings do
not belong in the core model.

`requiredWhen` makes a field required when a sibling string, boolean, or number
field equals a scalar value. References must exist in the same collection or
nested object, cannot point to the field itself, and must compare compatible
values.

```ts
fields: {
  draft: { kind: 'boolean', default: false, label: 'Draft' },
  coverImage: {
    kind: 'asset',
    assetType: 'image',
    requiredWhen: { field: 'draft', equals: false },
    label: 'Cover image',
  },
}
```

The Astro adapter enforces the condition during content and build validation.
Sveltia cannot represent dependent required fields, so it renders the field as
optional while the shared model retains the condition. Astro remains the
authoritative enforcement boundary.

`defineModel` validates one model at runtime. `defineModels` additionally rejects
duplicate collection names. Validation reports the complete model path for
unsupported kinds, invalid defaults or bounds, body collisions, and unknown sort
fields.

## Cross-collection references

References preserve relationship semantics without coupling a model to a CMS.
The `collection` is the registered target. `valueField` selects the stored
string value and defaults to the entry slug. Required `displayFields` and
optional `searchFields` are portable authoring hints. Every named value, display, and search field must
exist on the target collection; `slug` is also accepted as the generated entry
identifier.

```ts
import { defineModels } from '@rm-industries/content-model';

export const models = defineModels([
  {
    name: 'skills',
    label: 'Skills',
    labelSingular: 'Skill',
    folder: 'src/content/skills',
    extensions: ['json'],
    format: 'json',
    slug: '{{name}}',
    entryLabelField: 'name',
    fields: {
      name: { kind: 'string', required: true, label: 'Name' },
    },
  },
  {
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
        valueField: 'name',
        displayFields: ['name'],
        searchFields: ['name'],
        required: true,
        label: 'Primary skill',
      },
      skills: {
        kind: 'reference',
        collection: 'skills',
        valueField: 'name',
        displayFields: ['name'],
        multiple: true,
        default: [],
        label: 'Skills',
      },
    },
  },
] as const);
```

Astro validates a single reference as a string and a multiple reference as an
array of strings. It intentionally does not claim that referenced entries exist
because schema construction does not load the target collection. Registry
validation verifies the model-level target and field names instead. Sveltia
maps the same definitions to relation widgets automatically.

To migrate an existing workaround, replace a string field with a single
reference, or replace a list of strings with a multiple reference. Persisted
values remain strings or arrays of strings, so the content shape does not need
to change.

## Adapter-specific presentation

`entryLabelField` is portable collection metadata and must name a string field
in the same model. Sveltia maps it to `identifier_field`. CMS-specific summary
templates remain adapter options:

```ts
import { createSveltiaCollections } from '@rm-industries/content-model/sveltia';

const collections = createSveltiaCollections(models, (model) =>
  model.name === 'skills' ? { summary: '{{name}}' } : undefined,
);
```

For presentation needs that are specific to a Sveltia field, use the typed
`customizeField` callback and return a new value. The adapter passes a cloned
field plus its source-model path, so consumer code does not mutate adapter
output, rebuild fields, or cast through the public field union.

```ts
const collections = createSveltiaCollections(models, () => ({
  customizeField: (field, context) =>
    context.path.endsWith('.description') ? { ...field, hint: 'Shown in collection cards.' } : field,
}));
```

## Core validation and adapter use

`defineModel` and `defineModels` validate and return typed definitions.
`defineFields` accepts field entries and rejects duplicate keys.
`validateContentModel` and `validateContentModels` can validate existing objects;
invalid models throw `ContentModelValidationError` with a model path.

For Astro, export `createAstroCollections(models)` from your content configuration.
`createAstroCollection(model)` builds one collection and `createAstroSchema`
provides the schema separately. Assets require Astro's image schema context;
unsupported adapter inputs throw `AstroContentAdapterError`. The generated schema
owns content validation, including conditional requirements and date conversion.
The Markdown body remains separate from frontmatter fields.

For Sveltia, `createSveltiaCollection` and `createSveltiaCollections` produce CMS
collection configuration. They preserve model field order, but cannot enforce
conditional requirements that the CMS cannot represent. Keep Astro validation as
the enforcement boundary. Apply adapter options for presentation instead of
mutating the shared model or returned adapter output.

Use the [frontmatter ordering rule](../markdownlint-frontmatter/README.md) when
Markdownlint should enforce the model's metadata order; the content-model package
does not format Markdown or reorder source files itself.
