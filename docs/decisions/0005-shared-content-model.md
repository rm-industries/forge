# 0005: Define content once in an integration-neutral model

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1), [FGE-030](https://github.com/rm-industries/forge/issues/12)
- Reference: [example implementation at `6b12712`](https://github.com/rahul0705/rahul0705.github.io/commit/6b127128029568dba6175e97191dcaf8356f1e9b)

## Context

Astro validates content while Sveltia CMS presents editing fields. Defining the
same collections independently would allow their required fields, defaults,
and supported types to drift.

## Decision

Split the canonical model into a published model engine and site-specific
collection declarations:

- `packages/content-model/` publishes `@rm-industries/content-model` and owns
  integration-neutral field and collection types, definition helpers, runtime
  validation, Astro and Sveltia adapters, and their tests.
- `templates/default/src/config/content-models/` owns one declaration per
  collection, shared field fragments, and a registry of enabled collections.

Core package modules must not import Astro or Sveltia. Framework-specific code
is exposed from explicit package subpaths such as
`@rm-industries/content-model/astro` and
`@rm-industries/content-model/sveltia`; the adapters are bundled and versioned
with the core rather than published as independent packages. The package
declares Astro and `@sveltia/cms` as peer dependencies, with adapter entry points
requiring their corresponding peer at runtime. Peer ranges must be narrow
enough to represent versions proven by the compatibility test matrix. This is
especially important while Sveltia is pre-1.0 and may make breaking changes in
minor releases.

The model language covers only the v1 field capabilities named by the roadmap.
Project declarations may contain editor-neutral presentation metadata required
to produce a usable CMS, but they may not contain Sveltia configuration
objects.

Place consumers at these locations:

- `templates/default/src/content.config.ts` uses the package's Astro adapter and
  composes its schemas with Astro collection loaders.
- `templates/default/src/integrations/sveltia/` uses the package's Sveltia
  adapter and owns only site-specific CMS configuration, branding, and preview
  behavior.

Adapters must reject unsupported or lossy mappings with clear errors. They may
add integration mechanics, but must not redefine collection fields.

## Consequences

Required fields, defaults, dates, images, nested values, and draft semantics
have one source of truth without forcing every collection into one large file.
The model language becomes a public API that needs runtime validation,
compile-time tests, adapter conformance tests, semantic versioning, and migration
notes. Adding a collection requires a declaration and registry entry, not edits
to either adapter. Existing generated projects can receive compatible engine
and adapter fixes through dependency updates without re-running the generator.
Integration-only capabilities remain unavailable until the neutral model can
represent them deliberately.

## Rejected alternatives

- Separate Astro and CMS schemas inevitably duplicate product rules.
- Making Astro's schema canonical couples the CMS adapter to Astro internals.
- Making CMS configuration canonical constrains build-time validation to editor
  capabilities.
- Keeping types, helpers, every collection, and the registry in one
  `content-model.ts` file creates unnecessary coupling and weakens ownership.
- Publishing core, Astro, and Sveltia as independently versioned packages
  creates avoidable compatibility combinations; one package keeps each model
  capability aligned with both adapters.
- Re-running the generator to obtain model updates risks overwriting code owned
  and customized by the user.
- A general-purpose schema language would expand v1 beyond proven needs.
