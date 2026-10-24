# Reviewed automation and template-release comparison

Evaluation for [#393](https://github.com/rm-industries/forge/issues/393), 2026-10-24,
using the [common baseline](release-baseline-391.md) and actual independent patch
results from [#392](release-preparation-392.md). **All four approaches can hand the
same reviewed stable patch to Forge's existing eligibility selector. None replaces
its identity, commit, file-scope or unreleased-source policy.** Candidate metadata
files introduce an explicit integration decision; they are rejected by the current
production allowlist rather than implicitly trusted.

## Public-boundary rehearsal

The [fixture](fixtures/release-automation/run.cjs) invokes the unchanged
`scripts/select-automatic-release.ts` CLI against fresh local Git repositories.
Each has a previous published-baseline commit/tag, a reviewed patch commit and a
local-only origin. Actual `git diff`, manifest reads, baseline fetch and
since-release source comparison execute. The `gh` facade allows only the expected
API reads and returns controlled associated PR, merged identity and tag responses;
the `npm` facade permits only the expected previous-version metadata read. Every
other operation, including publication, is rejected. No real API mutations or npm
publication are performed.

Input is the preparation fixture's observed model `1.2.0 -> 1.2.1` result for
Forge, Changesets 3.0.3, Nx Release 24.0.1 and release-please 17.11.2. Each value is
asserted against the literal expected patch. This is a metadata handoff, not a
claim that each candidate natively evaluates GitHub App identity. The peer lane
feeds that candidate patch into the same reviewed metadata shape. The template
lane invokes Forge's unchanged public `prepare-template-sync.ts` CLI with controlled
verified-publication and registry metadata, obtaining generator `2.3.0 -> 2.3.1`,
model pin `1.2.1` and compatible CMS pin `0.251.0`. It retains that domain preparer
for every candidate; native candidate generation of the generator patch is not
claimed. The synthetic template lock refresh is marked as simulated and does not
prove installation, compatibility tests or a real registry attestation.

Reproduce after the normal locked Forge installation and the #392 preparation run:

```sh
RELEASE_TOOLS=/tmp/forge-370/tools/node_modules FORGE_SOURCE="$PWD" \
  node docs/reviews/fixtures/release-preparation/run.cjs
# Use the scratch location printed by that command:
PREPARATION_RESULTS=/tmp/forge-release-preparation-EXAMPLE/results.json \
  FORGE_SOURCE="$PWD" node docs/reviews/fixtures/release-automation/run.cjs
```

Results and full command logs are preserved in the printed temporary directory.
Commits and tags are created only there; the fixture configures no network remote.
No source workflow, eligible-file policy, publisher, template delivery or approval
setting is modified.

## Equivalent scenario results

Each baseline/finalist runs peer and template lanes against the same scenarios.
A positive result must exit zero and print the exact selected package. Ordinary
rejections must exit zero and visibly print `eligible=false`; invalid SHA and
unavailable required registry state must fail with their expected reason. This
prevents a broken facade or arbitrary process failure from counting as rejection.

| Case, applied equally to every approach                         | Observed outcome                                         |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| Configured App, reviewed merged exact stable next patch         | Eligible model or generator; unrelated package unchanged |
| Unmerged PR / wrong merged commit                               | Ineligible                                               |
| Untrusted author / foreign head or base repository              | Ineligible                                               |
| Wrong target branch / source branch                             | Ineligible                                               |
| Source implementation added to patch / another package mixed in | Ineligible                                               |
| Prerelease / skipped patch version                              | Ineligible                                               |
| Missing changed manifest / missing changed changelog            | Ineligible                                               |
| Non-full release SHA                                            | Explicit CLI failure                                     |
| No associated App PR / ambiguous App PR association             | Ineligible                                               |
| Missing previous package tag                                    | Ineligible, manual baseline notice                       |
| Previous package version unavailable from registry              | Explicit CLI failure                                     |
| Unreleased implementation since previous published baseline     | Ineligible, manual baseline notice                       |
| Template pins include prerelease model                          | Ineligible; template lane only                           |
| Extra candidate metadata file                                   | Ineligible; each non-baseline candidate, both lanes      |

The artifact/publishing controls of [#394](https://github.com/rm-industries/forge/issues/394)
remain a separate seam: selecting a package cannot establish inspected-byte
publication, registry completion, provenance or failure recovery.

## Approval and metadata integration cost

The eligible CLI output is the same `eligible=true` / `package=<slug>` contract
that the existing workflow uses to select `npm-release-auto`. Live environment
inspection in #391 found that environment allows `main` and has no reviewer rule.
Thus the retained workflow path adds no second environment approval after the
reviewed merge. This local fixture proves selection and handoff, not actual human
review or a hosted environment deployment. Ordinary/ineligible release intent
still needs the existing manual tagged path and `npm-release` approval.

| Approach       | Retained policy and operating step                                            | Additional adaptation demonstrated or still needed                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forge baseline | Existing reviewed peer/template PR, merged selector and automatic environment | No new metadata convention                                                                                                                                                                                                                                                                              |
| Changesets     | Same selector and template preparer, candidate patch handed off               | Changeset intent/state outside current allowlist rejects; integrate reviewed metadata generation and consumption before the eligible merge, or narrowly validate extra intent files in a later separately reviewed policy change                                                                        |
| Nx Release     | Same selector and template preparer, candidate patch handed off               | Version-plan state outside current allowlist rejects; account for project configuration, generated metadata and plan consumption without granting source changes broad eligibility                                                                                                                      |
| release-please | Same selector and template preparer, candidate patch handed off               | Manifest state outside current allowlist rejects. Default separate release PR is another operating/review step; no-second-approval requires intentionally preparing metadata in the existing reviewed automation PR or retaining the Forge exception path rather than blindly adding another release PR |

The extra-file observations use representative `.changeset/reviewed.md`,
`.nx/version-plans/reviewed.md` and `.release-please-manifest.json` paths; they prove
the current selector rejects those paths, not the complete set of changed files
for every possible tool configuration. A candidate can operate without introducing
those files into the eligible commit only if its proposed adapter establishes
reviewed intent elsewhere. No broad allowlist relaxation was implemented. An
already functioning metadata calculator alone therefore does not eliminate this
custom logic or establish a maintenance win.

## Template policy remains unchanged

Generator releases remain justified by copied template content and exact pinned
model/CMS/lock metadata, not a runtime dependency from create-forge to content-model.
The current template-sync patch stays in place for every finalist. Downstream
compatibility validation does not require arbitrary package publication.

If fresh resolution is adopted in a future approved change, an upstream release
inside unchanged compatible bundled ranges need not trigger a generator release.
Template source, ranges, pins and compatibility-rule corrections still require
release assessment. #369 proposed retaining the bundled lock, so this evaluation
neither activates that conditional policy nor deletes template-sync automation.
Task-runner selection remains independent.

## Verification and limits

The public selector rehearsal completed **170 cases** across four approaches and
two lanes: **8 eligible** handoffs and **162 visible rejection/failure cases**.
The current selector cannot make a candidate's metadata files eligible unchanged;
that is a demonstrated integration limit, not a reason to weaken its safety rule.
Focused fixture formatting/lint, Markdown/spelling/documentation checks and
`git diff --check` pass. The existing 33 release regression tests also pass.

Not demonstrated: live review enforcement, candidate-created hosted automation
PRs, end-to-end no-second-approval publication, actual template lock resolution,
real trusted publisher configuration or native tool-specific automation policy.
All finalists retain the same Forge policy adapter in this comparison; none gets
native-capability credit for that shared custom layer.
