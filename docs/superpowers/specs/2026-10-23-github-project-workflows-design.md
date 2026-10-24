# GitHub project workflows

Status: approved by the maintainer on October 23, 2026. This supersedes the GitHub selection and
legacy-check compatibility approach in PR 396. The maintainer subsequently approved
parallel repository checks with a single required aggregate and native GitLab
translation; see the [follow-up plan](../plans/2026-10-23-parallel-quality-and-gitlab.md).

## Intent and agreed decisions

Use ordinary GitHub workflow files and native path filters to make ownership clear
and reduce unrelated validation. Each project owns its checks. Published upstream
package source changes do not run downstream package checks: consumers validate
when their dependency manifest or lockfile changes.

The maintainer accepted review discipline for project-specific check failures and
removal of legacy check names. Template changes retain a packed-generator smoke
check because the CLI bundles template source directly. Full template quality,
browser/accessibility and Lighthouse validation belongs to the Template workflow.
GitHub is designed first; GitLab translation follows separately.

## Approaches considered

1. Shared impact script, always-running checks and compatibility no-ops: preserves
   existing required contexts and a shared selector, but adds orchestration and
   runner overhead. This is the current PR approach and is being replaced.
2. Project-owned workflows with native path filters: explicit YAML, fewer moving
   parts, and independent release boundaries. Conditional project checks rely on
   review discipline. This is the approach selected in the discussion.
3. One unconditional workflow running every project: straightforward enforcement,
   but keeps the unrelated work that motivated this change. Not selected.

## Workflow responsibilities

| Workflow           | Validation ownership                                                                                                    | Primary changed inputs                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Repository quality | Root formatting, lint, spelling, documentation and CI-contract tests                                                    | Every PR and main push                                                   |
| Website            | Independent site quality, build, browsers/accessibility, Lighthouse, deployment and deployed smoke                      | `website/**`, consumed documentation and shared website tooling          |
| Template           | Isolated template source quality, tests, build, browser/accessibility, Lighthouse and starter/customization regressions | `templates/default/**` and its verification tooling                      |
| Content model      | Its own types, unit tests, build, pack and supported runtimes                                                           | `packages/content-model/**` and shared package tooling                   |
| Create Forge       | CLI types/tests/behavior, inspected package and packed-generator smoke                                                  | `packages/create-forge/**`, `templates/default/**` and generator tooling |
| Browser formatter  | Its own package/runtime checks, Rust/WASM reproducibility and packed-browser contracts                                  | `packages/browser-oxfmt/**` and native verification tooling              |
| Markdownlint       | Independent unit, type and packed-consumer checks                                                                       | `packages/markdownlint-frontmatter/**` and its tooling                   |

Existing security, automation, publication and dependency-update workflows keep
separate responsibilities. Shared locks, configuration and setup inputs are listed
explicitly in every affected workflow. Workflow edits trigger their own validation.
Mixed changes naturally trigger multiple workflows. No custom GitHub diff selector,
selected-workspace output, skipped-work success jobs or old-context preservation is
needed.

## Package and integration boundaries

Markdownlint checks now use its structural model API without a content-model
checkout. Cross-package model/Sveltia coverage is repository-owned. Other optional
candidate integrations belong to explicit integration validation, scheduled/manual
or release validation where justified, rather than ordinary downstream package PR
fan-out. Keep existing release safeguards while reorganizing validation ownership.

Separate repository CI-contract tests from cross-package
integration tests, so an always-running repository check does not quietly recreate
package coupling. Cross-package integration runs on its own test/tooling changes
and weekly/manual validation. Existing focused CMS preservation and serialization
checks remain covered there; distinguish the separate known failing ordering probe.

## Template and CLI handoff

The Template workflow validates an isolated copy of the template with existing
verification tools, its own lockfile and public commands. It builds once and passes
that artifact to browser and Lighthouse checks.

Create Forge packs its CLI, installs that tarball into a clean directory, generates
one default consumer, installs its committed dependencies, then builds and validates
its output. This catches missing bundled files, unresolved placeholders and broken
materialization. It does not repeat the full template browser/Lighthouse suite.
Keep distinct CLI behavior/provider/layout scenarios; move full starter and
customization browser verification out of the current CLI scenario harness into
Template-owned coverage. No new shared workflow framework or cross-workflow
artifact dependency is required.

## Required checks, cadence and tradeoffs

Retain one always-running `Repository quality` result as the
only required CI context; project-specific checks are optional in branch protection
but must be reviewed before merging. Remove the 27 old required contexts and old
summary requirements when migrating settings. Preserve unrelated review, security,
environment and publication protections.

Every project offers weekly broad validation and manual dispatch using committed
locks. Preserve the currently agreed per-project browser/Lighthouse cadence and
runtime coverage during the ownership move. Production deployment stays restricted
to the existing main-push gates, with validation before deployment and smoke after.
Schedules/manual validation do not publish or deploy.

Native filters trade automatic unknown-path fallback for explicit ownership rules.
New shared inputs need filter updates; GitHub path-filter limits and unmatched
inputs remain review risks, with scheduled broad coverage as a backstop. A failed
optional project check will not itself block a merge. Published compatibility
failures can surface at downstream dependency upgrades; publication alone does not
necessarily update or validate a consumer.

## Scope, migration and rollback

First implement only Forge-owned GitHub workflows and necessary test ownership
changes. Generated consumers' CI, dependency/release policy, production settings,
consumer repositories and GitLab workflow restructuring are outside this phase.
The old selector may remain temporarily for GitLab's existing adapter; remove its
GitHub action and all GitHub callers without breaking that adapter.

Prepare and validate the new workflows and an exact old-to-new check map. Branch
protection edits are a separate explicitly approved operation, coordinated with
the workflow transition so absent legacy checks cannot strand PRs. Until that
operation is approved, retain the currently functioning workflow/protection pair.
Rollback restores the matching old workflow and required-check configuration.

Validate independent package commands, native YAML syntax/security, relevant/shared
path coverage, template public commands, packed-generator smoke, and deployment
artifact/permission boundaries. Record local versus hosted evidence honestly.
GitLab translation begins after the GitHub design and behavior are accepted.
