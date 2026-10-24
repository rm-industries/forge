# 0011: Retain static templates and typed CI authoring

<!-- cspell:ignore Projen -->

- Status: Proposed
- Date: 2026-10-23
- Roadmap: [369](https://github.com/rm-industries/forge/issues/369),
  [390](https://github.com/rm-industries/forge/issues/390)

## Context and recommendation

Retain copied/tokenized static configuration and existing typed CI generation. Do not adopt
Projen on the representative trial's evidence: equivalent editable consumer output was possible,
but no maintained policy, production custom code or validator was removed. This proposed record
awaits maintainer review; it does not supersede the accepted materialization, workspace or versioning
ADRs and authorizes no production migration.

The [baseline](../reviews/template-baseline-385.md) already combines static template files with typed
provider models and writers. The [authoring experiment](../reviews/template-authoring-388.md) compared
package metadata, TypeScript configuration, Dependabot and the actual default root GitHub workflow
using Projen 0.104.14. This was a bounded comparison, not a replacement of every provider or a claim
about every possible Projen component. Both evaluation branches share two focused working days;
retaining the baseline is a decisive result within that scope, not an extension request.

## Alternatives and maintained responsibilities

| Approach                              | Demonstrated value                                                                                      | Maintained responsibility and cost                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static files with targeted validation | Directly editable source, existing isolated packed-generator checks and formatter policy                | Curated scripts, dependency policy, TypeScript and Dependabot configuration remain authored and reviewed                                                                |
| Existing typed generation             | Validated provider options, dependency graphs, commands, permissions and artifact handoffs              | Existing models, schemas, action pins and provider writers remain necessary; static files need not become generated models                                              |
| Internal Projen slice                 | Deterministic JSON/YAML serialization with editable consumer files and no consumer authoring obligation | Same policy objects and typed generation retained; new dependency, synthesis configuration, staging, export allowlist, output normalization and leak/determinism checks |

The trial removed **zero production custom source lines, configuration files or validators**. The
three static inputs contain 132 lines; serializing their complete objects relocates those rules,
rather than removing them. The baseline inventories 1,374 lines of CI authoring and supporting
contracts; none is credited as replaced by the default-only workflow adapter. Materialization,
opaque copying, path/collision safety and rollback, dependency synchronization, integration validation,
and release policy retain their owners under each alternative. Counts describe source surface,
not measured staff time or proof that every line needs to remain forever.

The candidate added Projen's pinned dependency and upgrade review, explicit writable/marker settings,
isolated synthesis, an export allowlist, an eight-line default-scenario workflow adapter, and formatting
plus absence-of-leak checks. Raw output lost useful workflow ownership comments and action-version
annotations; restoring them would add annotation work. The higher-level Dependabot component's
observed output did not preserve the existing manifest/action/group/cooldown policy; generic YAML
preserved it but supplied no policy-maintenance reduction. This is specific to the inspected pinned
version and tested approach, not a statement that another implementation cannot preserve that policy.

## Executed evidence and limits

Four synthesis runs (two in the same stage, two fresh) produced identical raw exported bytes and
baseline-equivalent parsed values. The actual canonical workflow was consumed through the scratch
packed CLI's existing formatting/schema boundary; there was no duplicate workflow. All four files
were writable with mode `0644`, with no delivered Projen dependency, metadata, config, task or
regeneration requirement. Consumer edits to all four files and an added package script survived
ordinary formatting, checks and builds. Components and themes remain consumer-owned; no reference
repository or existing consumer was regenerated.

The first raw output failed the generated project's formatter. Reusing the existing Oxfmt
configuration during export corrected this, making normalization a measured new responsibility.
Clean registry installation and normal/customized `quality:core` each passed static checks,
39 tests with coverage, a production build and output validation. The separate audit command
failed on the same three baseline Lighthouse dependency advisories; it was neither removed nor
allowed to pass through a new exception. A green quality result does not mean a green security audit.

Candidate execution covered root GitHub defaults on Node 26/npm 11, not GitLab, nested layouts,
other runtimes, hosted provider execution or deployment. Parsed workflow equivalence and locally
executed commands do not establish hosted artifact transfer or permissions behavior. Full browser,
Lighthouse and interactive CMS preservation checks were not repeated by this authoring trial.
Existing safeguards remain required. These gaps bound the equivalence claim; no missing result
is treated as evidence of a Projen defect.

## Consequences and reconsideration

Keep production templates, typed writers, shipped lockfiles, synchronization releases and consumer
commands unchanged. This authoring decision is independent of the dependency-delivery recommendation:
internal synthesis neither delivers fresher dependencies nor requires lockfile removal. Existing
CI and tooling contracts remain coordination inputs, not blanket blockers. No new consumer regeneration,
component ownership or ongoing authoring dependency is introduced.

No conditional migration, cleanup, regression or rollback issue drafts are needed because adoption
is not recommended. If a future slice demonstrates a concrete policy or writer that can actually be
deleted, revisit with that deletion and its replacement coverage, rather than serialization alone.
Any adoption proposal must separately identify scoped migration/cleanup, regression coverage and
rollback, and seek explicit amendments to affected accepted ADRs before rollout.

Estimate at least one additional focused working day, plus hosted runner time, to generalize a
candidate across representative provider/deployment/layout inputs and run executable provider checks;
full component migration and its maintenance accounting would require a new bounded estimate. This
is an effort estimate, not permission to extend. Evidence that specialized components remove
maintained policy or custom implementation while preserving editable output and safety would change
the recommendation. More deterministic snapshots alone would not. No extension is necessary to
recommend retaining the baseline now.
