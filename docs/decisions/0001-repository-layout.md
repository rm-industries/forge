# 0001: Separate generator, template, and repository concerns

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1)

## Context

Forge contains a publishable project generator, a reusable content-model
package, a generated application, and repository-only tooling. Their ownership
must be obvious, and a generated project must not depend on unpublished files
elsewhere in the monorepo.

## Decision

Use the following top-level layout:

- `packages/create-forge/` owns the publishable `@rm-industries/create-forge`
  package, including its CLI, materialization code, and generator tests.
- `packages/content-model/` owns the publishable
  `@rm-industries/content-model` package, including its integration-neutral
  model language, runtime validation, Astro and Sveltia adapters, and tests.
- `templates/default/` owns the complete default Astro project, including its
  application source, project-specific content declarations, adapter
  composition, and integrations such as Sveltia CMS.
- `docs/` owns project and maintainer documentation; `docs/decisions/` owns
  ADRs.
- root configuration and scripts own workspace-wide development, validation,
  and release orchestration.

Reusable content-model code that can evolve through normal dependency updates
belongs in `packages/content-model/`. Site-specific declarations and
integration configuration belong in `templates/default/`. Code used only while
creating a project belongs in `packages/create-forge/`.

## Consequences

The template can be copied and tested outside the monorepo using only published
dependencies. The generator package must include the template as a package
asset or copy it during packaging without introducing a runtime dependency on
the repository. Existing projects can update the content-model engine without
being regenerated. Some development tooling may be duplicated between the root
and template to preserve that independence.

## Rejected alternatives

- Putting the application under `packages/` blurs publishable-package and
  generated-project boundaries.
- Sharing unpublished runtime source from a root `shared/` directory makes
  generated projects depend on monorepo internals.
- Keeping the content-model engine in each generated project prevents supported
  engine and adapter updates through the package manager.
- Keeping generator and template files together obscures ownership and makes
  package allowlisting harder to audit.
