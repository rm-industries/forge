<!-- cspell:words prepatch -->

# Independent release preparation comparison

Evaluation for [#392](https://github.com/rm-industries/forge/issues/392), 2026-10-24,
against the [common baseline](release-baseline-391.md). This is an isolated
preparation experiment, not a tool migration. All four approaches produced the
same independent versions and usable Forge release plans. Changesets and Nx
replace manual version/changelog calculation; release-please instead proposes
reviewable release PRs. None of these observations removes Forge's approval,
artifact or recovery responsibilities.

## Reproduction and boundary

The [fixture](fixtures/release-preparation/run.cjs) uses public Changesets CLI
3.0.3, Nx Release API 24.0.1 with matching `@nx/js`, release-please Manifest API
17.11.2 and Forge's existing `scripts/prepare-package-release.ts` CLI. Tested on
macOS arm64, Node 26.9.0, npm 11.19.1. Install tools separately from Forge:

```sh
npm install --prefix /tmp/forge-370/tools --no-audit --no-fund \
  @changesets/cli@3.0.3 nx@24.0.1 @nx/js@24.0.1 release-please@17.11.2
RELEASE_TOOLS=/tmp/forge-370/tools/node_modules \
  FORGE_SOURCE="$PWD" node docs/reviews/fixtures/release-preparation/run.cjs
```

Run after Forge's normal locked installation so the existing preparer can
resolve its dependencies. The fixture writes only a fresh `/tmp` directory,
prints its location and preserves command output, exact inputs and complete
results there for inspection. Nothing generated is committed. Local Git
repositories, commits and Changesets tags exist only in those fixtures. No
remote is configured. The controlled npm facade accepts only metadata reads
and a version query; every publication or other npm operation fails. The
release-please SCM facade supplies controlled file/history reads through its
public interface and throws on unexpected operations, including mutations.
`buildPullRequests()` and `buildReleases()` do not open PRs or create releases.

Assertions use literal expected versions and channel values, independent of
candidate calculations. The shared seam is prepared files/plans returned by
public entry points. This does not test hosted GitHub history, npm writes,
OIDC, provenance, real user review or production permission configuration.

## Equivalent observed scenarios

Versions below are **synthetic fixture inputs**, not the live package inventory.
Order is content-model, create-forge, browser-oxfmt, markdownlint-frontmatter.
Initial versions are `1.2.0 / 2.3.0 / 0.1.0 / 0.4.0`.

| Reviewed scenario                                   | Result for baseline, Changesets, Nx and release-please | Forge preparer channel         |
| --------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| Model patch only                                    | `1.2.1 / 2.3.0 / 0.1.0 / 0.4.0`                        | Model `latest`                 |
| Model patch plus generator feature                  | `1.2.1 / 2.4.0 / 0.1.0 / 0.4.0`                        | Both changed packages `latest` |
| Docs/internal-only, no release intent               | Initial versions; no candidate release                 | No plan submitted              |
| Stable model breaking plus pre-1.0 browser breaking | `2.0.0 / 2.3.0 / 0.2.0 / 0.4.0`                        | Both changed packages `latest` |
| Model next prerelease                               | `1.2.1-next.0 / 2.3.0 / 0.1.0 / 0.4.0`                 | Model `next`                   |
| Promote model prerelease to stable                  | `1.2.1 / 2.3.0 / 0.1.0 / 0.4.0`                        | Model `latest`                 |

The baseline uses explicit reviewed version/changelog edits, not a native
bump calculator. Candidates generate their metadata. Every changed candidate
version was handed to the **existing Forge CLI** with a matching package tag
and a fixed synthetic commit SHA; its returned concrete `npmTag` was asserted.
The handoff uses fresh reviewed fixture release notes to isolate that public
contract. It does not claim lossless changelog conversion between tools.
Candidate-generated changelog content is retained separately in fixture results.
The preparer does not decide whether a documentation commit deserves a release;
the reviewed intent/no-release decision must remain upstream of it.

## What each tool actually demonstrated

### Changesets

Native reviewed intent is a committed Markdown changeset. `add --patch`,
`--minor` and `--major` with a message produced the intended independent
release plan; `status --output`, `version` generated versions and changelogs.
For pre-1.0 breaking behavior the reviewer explicitly selects **minor**;
Changesets does not infer Forge's policy from a request for a major bump.
No changeset means no release: status was empty and versioning was skipped.
An exploratory call to `version` with no intent exited 1 with “No unreleased
changesets found”, so CI needs to check the plan rather than assume that
command is always a successful no-op.

`pre enter next`, versioning, and `publish-plan --output` returned a native
publish chunk for `@rm-industries/content-model@1.2.1-next.0` with `tag: next`.
`pre exit` and versioning returned `1.2.1` with `tag: latest`. These were actual
publish plans against the controlled registry response containing the initial
stable versions. This directly observes channel selection, beyond version
syntax. It does not cover every registry history: the only-prerelease-package
case remains a separate native policy concern in the baseline research.

`git-tag` ran after a local fixture release commit with baseline tags already
present. New tags used native scoped `@rm-industries/content-model@1.2.1`
style. Forge requires `content-model-v1.2.1`; retaining Forge's tag creation
or explicitly mapping tags is integration work. No production tag was created.
New CLI 3 artifact mode is reserved for the publication/recovery comparison
[#394](https://github.com/rm-industries/forge/issues/394).

### Nx Release

Native `.nx/version-plans/reviewed.md` intent files, independent relationship,
public `ReleaseClient.releaseVersion()` and `releaseChangelog()` generated
versions, project changelogs and package tag candidates. `updateDependents:
never` prevents indiscriminate graph propagation in this independent fixture.
The default zero-major adjustment converted a reviewed major browser bump
from `0.1.0` to `0.2.0`; stable model major became `2.0.0`.
`prepatch` with `preid: next` produced `1.2.1-next.0`. Promotion consumed the
previous plan before an explicit reviewed `1.2.1` specifier; reusing that
prerelease plan would be the wrong operating procedure.

This metadata-only fixture uses documented `skipLockFileUpdate: true`, so it
never installs the fixture packages or changes Forge's locks. Actual adoption
would need each affected real lock updated and validated. The API required
matching `@nx/js` but no Nx task runner, Cloud service or production workspace
migration. Git commit/tag/push and remote release creation are disabled.

Changelog results included concrete tag candidates such as
`@rm-industries/content-model-v1.2.1` with the fixture's package-name project
IDs. That is package-specific but differs from Forge's unscoped slug tag.
Project naming or tag mapping needs deliberate configuration. The fixture
**did not call Nx's npm publisher**: its next/latest result above is the retained
Forge preparer's demonstrated decision, not a claim about Nx native dist-tags.

### release-please

Public `Manifest.fromManifest()` / `buildPullRequests()` generated independent
package/changelog/manifest updates from controlled conventional commits. Docs
commits produced no release candidate. `bump-minor-pre-major: true` produced
Forge's pre-1.0 breaking result; stable breaking remained major. The next case
used explicit reviewed `release-as: 1.2.1-next.0` and prerelease configuration;
promotion started from that prerelease and used reviewed `release-as: 1.2.1`.
This proves exact reviewed overrides, not automatic prerelease iteration.

The resulting release PR bodies were returned as controlled merged PRs with
the pending-release label and a merge SHA to `buildReleases()`. Release tag
candidates followed configured `component`, separator `-`, and `v` inclusion,
matching Forge's `content-model-v...` convention. These are plans, not remote
tags. Reviewable release PRs supply ordinary release intent; avoiding a second
approval for already-reviewed narrow automation still needs the policy seam
in [#393](https://github.com/rm-industries/forge/issues/393).

release-please does not publish npm. Its GitHub prerelease flag is not an npm
channel. Here the existing Forge preparer supplied and checked concrete
next/latest decisions. Retaining that publisher is a valid integration, with
an adapter from merged release metadata to Forge's expected inputs.

## Dependency ordering and retained integration

Forge's four release packages do not declare runtime dependencies on one
another. There is no required topological publication chain between them.
The fixture includes an external runtime dependency, a copied template pin
and a test-only model import. Model-only intent left the generator and lint
package versions unchanged across all approaches. This exercises the
independent release boundary rather than creating fake runtime edges for
copied files or test consumption. Real downstream compatibility validation
still matters; it does not automatically require downstream publication.

Changesets' native plan grouped unrelated changed packages together. Nx and
release-please likewise prepared the selected packages independently; this
fixture's package manifests contain no inter-package runtime release edge. Native behavior for a
future real Forge runtime dependency is **not demonstrated**: version ranges,
order and dependent-bump configuration must then be reassessed. In particular,
Nx `updateDependents: never` must not silently suppress a required dependency
range repair. The current copied-template pin can still require the separate
reviewed template-sync patch; this experiment does not adopt lock omission.

| Concern                                | Baseline                        | Changesets                                         | Nx                                                      | release-please                                          |
| -------------------------------------- | ------------------------------- | -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Reviewed version and notes             | Manual file edits               | Native changeset + generated files                 | Native version plan + generated files                   | Native proposed release PR; reviewed override supported |
| No-release boundary                    | Reviewer/automation eligibility | Empty plan                                         | Empty version-plan result                               | Docs commit produces no candidate                       |
| Native channel evidence here           | Existing public preparer        | Native publish-plan next/latest plus Forge handoff | Native npm channel untested; Forge handoff demonstrated | npm publishing external; Forge handoff demonstrated     |
| Existing Forge tag shape               | Native                          | Keep/map Forge tags                                | Configure project IDs/map tags                          | Native configured release candidate                     |
| Remaining glue                         | Existing                        | Tag mapping, notes/intent and manifest handoff     | Project discovery, locks, tags and manifest handoff     | SCM/API workflow, merged release PR to manifest handoff |
| Safety, eligibility, artifact recovery | Existing                        | Retained and compared in #393/#394                 | Retained and compared in #393/#394                      | Retained and compared in #393/#394                      |

The demonstrated metadata reductions are real, but are not yet an overall
maintenance win. The next comparisons must account for retained safeguards,
manual operating steps and new upgrade/configuration surface before selecting
an approach. No scoring weights or first-working-tool decision is applied.

## Verification

The retained fixture completed all **24 approach/scenario combinations** with
exit 0 and literal version/channel assertions. The printed scratch directory
includes native plans, generated changelogs, release candidates and command
logs for the recorded observations.
Focused formatting, Oxlint, Markdown lint, spelling, documentation validation
and `git diff --check` passed. The production package test/build suite was not
repeated for this evaluation-only report and isolated fixture. Hosted behavior
and publication safeguards remain the explicitly separate #393/#394 scope.
