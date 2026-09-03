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
