# 0008: Independently version the frontmatter lint package

- Status: Accepted
- Date: 2026-10-21
- Scope: Supersedes the two-package enumeration in ADR 0003 and ADR 0006;
  preserves their workspace discovery, ownership, and versioning decisions.
- Issue: [#343](https://github.com/rm-industries/forge/issues/343)

## Context

Frontmatter key ordering is a reusable lint contract. It must not require the
Astro generator, Sveltia runtime, or content-model package to execute. A template
snapshot cannot distribute an unpublished registry dependency safely.

## Decision

Add `@rm-industries/markdownlint-frontmatter` under the existing `packages/*`
workspace discovery. Give it its own semantic version, changelog, public export,
MIT license, package allowlist, and `markdownlint-frontmatter-v<version>` tag.
Apply ADR 0006's pre-1.0 minor-breaking and post-1.0 major-breaking policy.
Changes to rule names, configuration, diagnostic/fix guarantees, supported peers,
or runtime minimums are public compatibility changes.

Keep the generic rule and structural model projection in this package. Model
field insertion order remains the authoring authority; collection-specific CLI2
configuration derives its key list. Oxfmt owns formatting, this rule owns key
order, and Astro/model validation owns schema semantics. The rule is neither a
YAML formatter nor a schema validator.

Reuse the existing manual package-release registry and protected publication
workflow. Manual dispatch only prepares artifacts; package tags require the
`npm-release` environment and provenance. Do not add an automatic release source
or a template synchronization event for this package. Browser formatter #349
can extend the same registry independently without becoming a prerequisite.

## Consequences

Normal starters keep registry-only installs until a maintainer publishes the
plugin. The isolated packed-artifact adoption fixture proves the handoff while
explicitly leaving general distribution pending. Existing sites adopt reviewed
source and configuration changes with rollback; regeneration is not an upgrade.
Historical accepted ADR bodies remain unchanged.
