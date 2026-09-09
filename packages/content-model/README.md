# `@rm-industries/content-model`

Integration-neutral content collection definitions and validation for Forge.
Astro and Sveltia adapters are separate package entry points introduced by the
adapter milestones; the core module imports neither integration.

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

The package is bundled as native ESM for publication. Source files therefore
use relative imports without file extensions, which keeps editor-generated
imports conventional while the build resolves internal modules into the
published entry point. Oxlint enforces this convention in the package source.

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
