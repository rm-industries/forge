# 0006: Version publishable packages independently

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1),
  [FGE-003](https://github.com/rm-industries/forge/issues/3)

## Context

Users install a generator release but own the project it creates. Most generated
source is a snapshot, while the reusable content-model engine must remain
updatable without regenerating or overwriting that source.

## Decision

Apply semantic versioning to the published `@rm-industries/create-forge`
package. Each release contains tested, versioned source for the default template. From
create-forge 2.0.0, this source declares curated dependency ranges without a
delivered lockfile: npm resolves dependencies at creation time and the consumer
owns the resulting lock. Root and website authoring locks remain committed; the
template has no committed lock and is tested with fresh resolution.
Generator version identifies source and range policy, not an immutable dependency
graph. Compatible resolutions within unchanged ranges need no generator commit
or release; source, range, pin and runtime changes retain release
review. See [ADR 0010](0010-dependency-delivery-evaluation.md). The
generator's `--version` reports the package version, and generated metadata or
release evidence records that source version where practical.

Apply semantic versioning independently to the published
`@rm-industries/content-model` package. Generated projects record a compatible
package range and an exact resolved version in their lockfile. The package ships
core types, validation, and Astro and Sveltia adapters as one release so a model
capability cannot be installed without matching adapters.

Apply semantic versioning independently to `@rm-industries/browser-oxfmt`.
Its package version identifies the browser API, worker/assets, supported options,
and pinned upstream formatter engine together. Record the exact upstream Oxfmt
version and asset identity; package and engine versions are separate identities.
The consumer must use the matching authoritative Oxfmt configuration contract.
A different engine version is rejected until its output, supported options and
browser/CMS tests have been reviewed as part of a new package release. Before 1.0, incompatible browser API, output
policy, configuration, or runtime baseline changes require a minor release and
migration notes; compatible fixes use patch releases. After 1.0, those changes
require a major release. Review output changes even when upstream calls an
engine update a patch. Publishing this package never edits generated source.

Before 1.0, minor releases may change the emerging generator or template
contract, with those changes called out in release notes. From 1.0 onward,
incompatible CLI behavior, options, generated-project contract, or required
runtime baseline requires a generator major release. Additive features and
backward-compatible template improvements are minor; backward-compatible fixes
are patch releases.

The content-model package follows the same pre-1.0 convention. After its 1.0,
breaking model definitions, inferred types, runtime validation, adapter output,
or supported peer ranges require a major release. Additive model capabilities
are minor and compatible fixes are patches. Before its 1.0, breaking changes
require a minor release and explicit migration notes.

Astro and `@sveltia/cms` are peer dependencies, not bundled copies. Every peer
range must correspond to tested versions. Widening a range requires passing the
full core and adapter compatibility suite. Adapting to an upstream breaking
change, or dropping support for a previously supported peer version, is a
breaking content-model release. Pre-1.0 peer packages, particularly Sveltia, use
conservative ranges that do not assume minor releases are compatible.

Generated source remains a snapshot, not a managed installation. Publishing a
new Forge version does not mutate existing projects. Content-model updates are
delivered through the project's package manager and may include migration
guidance; re-running the generator is never an upgrade mechanism. Other template
source changes require documented manual steps or later migration tooling, and
that tooling requires its own decision.

## Consequences

Generator and bundled template changes ship under one traceable generator
version while project owners keep control of generated code. The content-model
engine can release on its own cadence, but Forge releases must test and record
the exact compatible content-model and peer versions. Release review must assess
CLI, generated-output, model, adapter, and peer compatibility. Security fixes to
snapshot source require clear advisories because existing projects do not update
automatically.

## Rejected alternatives

- Independently versioning the sole template creates compatibility combinations
  without v1 benefit.
- Versioning the model package only with the generator prevents existing
  projects from receiving model and adapter updates independently.
- Versioning the core and adapters separately permits unsupported combinations
  of model capabilities and integration behavior.
- Using the root repository version as an implicit public contract confuses
  unpublished tooling with the npm package.
- Automatically updating generated projects risks overwriting user changes.
- Treating every template output diff as a breaking change would prevent useful
  semver minor and patch releases.
