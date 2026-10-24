# 0012: Retain Forge release orchestration after comparing metadata tools

- Status: Proposed
- Date: 2026-10-24
- Roadmap: [370](https://github.com/rm-industries/forge/issues/370),
  [395](https://github.com/rm-industries/forge/issues/395)

## Recommendation and scope

Retain Forge's current release preparation, reviewed automation and inspected-artifact
publisher. Do not adopt Changesets, Nx Release or release-please in this evaluation.
All three demonstrated useful independent metadata preparation; none demonstrated a
complete reduction in ongoing maintenance after integrating Forge's narrow automatic
patch exception, publication safeguards and release history. This is a decision to
retain the baseline within the bounded evidence, not a claim that its safety is
complete or that metadata tools must replace its publisher to be worthwhile.

This proposed ADR awaits maintainer review. It changes no accepted policy, workflow,
package, template, permissions or publisher settings. It neither supersedes
[ADR 0006](0006-versioning.md) / [ADR 0008](0008-frontmatter-package.md).
Merging the evaluation closes #370. No migration rollout or production publication
is authorized. Release tooling remains independent of the task-runner decision.

The [baseline and survey](../reviews/release-baseline-391.md),
[preparation comparison](../reviews/release-preparation-392.md),
[reviewed automation comparison](../reviews/release-automation-393.md) and
[artifact/recovery rehearsal](../reviews/release-publication-394.md) are the evidence.
They use pinned Changesets 3.0.3, Nx / `@nx/js` 24.0.1 and release-please 17.11.2.
Lerna, semantic-release and release-it remain credible surveyed alternatives; the
baseline records why their operating models did not warrant another full prototype
inside the same bound. The result is not determined by which tool worked first.

## Reconciled scenario and safeguard matrix

**D** means an observed public-entry-point result, **DOC** a documented or
source-inspected capability, **U** an unverified boundary and **R** an observed
rejection or limitation. Combined labels describe different layers, not a score.
**Shared** means the candidate retains Forge's unchanged policy or publisher;
it is not native candidate functionality. Full cases and caveats are in the linked
reports. No numeric weights are applied: an unmet safety gate is not compensated
by simpler changelogs.

| Requirement                                                              | Forge baseline                                                  | Changesets                                           | Nx Release                                                       | release-please                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| One/multiple independent releases                                        | D, manual reviewed metadata                                     | D, native changesets/version                         | D, native version plans/API                                      | D, native release PR candidates                                        |
| Docs/internal-only no release                                            | D, no intent/plan submitted                                     | D, empty status; version command without intent R    | D, empty version-plan result                                     | D, docs commit yields no candidate                                     |
| Pre-1.0 minor / stable major breaking policy                             | D, explicit reviewed edits                                      | D, reviewer chooses minor/major                      | D, zero-major adjustment and stable major                        | D, configured pre-major behavior                                       |
| Package changelogs and tag identity                                      | D, existing tag convention                                      | D, generated notes/native tags; Forge mapping needed | D, generated notes/tag candidates; project-name mapping needed   | D, configured Forge-shaped tag candidates                              |
| Concrete next and stable promotion                                       | D, public preparer next/latest                                  | D, native publish-plan plus shared preparer          | D, versions plus shared next/latest; native npm channel U        | D, explicit overrides plus shared next/latest; npm publishing external |
| No artificial downstream publication                                     | D, no inter-package runtime edges                               | D, unrelated fixture versions unchanged              | D, unrelated versions unchanged with dependent updating disabled | D, independent path candidates                                         |
| Future real runtime dependency ordering                                  | U, absent in current graph                                      | DOC native graph; real Forge case U                  | DOC native graph; safe future dependent config U                 | DOC optional workspace plugin; real Forge case U                       |
| Eligible peer/template patch; no second approval                         | D shared selector handoff; hosted path U                        | D shared handoff; native policy U                    | D shared handoff; native policy U                                | D shared handoff; native policy U                                      |
| Wrong App/SHA/branch/files/mixed/ineligible patch                        | D/R shared CLI selection                                        | D/R shared CLI selection                             | D/R shared CLI selection                                         | D/R shared CLI selection                                               |
| Extra candidate metadata files in eligible patch                         | Not applicable                                                  | R current allowlist                                  | R current allowlist                                              | R current allowlist                                                    |
| Current template-sync patch behavior                                     | D unchanged domain preparer; lock resolution U here             | D shared preparer                                    | D shared preparer                                                | D shared preparer                                                      |
| Wrong pack name/version or release-tag version                           | D/R public preparer                                             | D/R shared preparer                                  | D/R shared preparer                                              | D/R shared preparer                                                    |
| Existing tag points at wrong commit                                      | D/R actual workflow shell                                       | D/R shared shell                                     | D/R shared shell                                                 | D/R shared shell                                                       |
| Foreign SHA inside downloaded manifest                                   | R independent binding missing; trusted job SHA still used       | R shared limit                                       | R shared limit                                                   | R shared limit                                                         |
| Exact inspected path supplied for publication                            | D, original tarball path                                        | D shared; D native artifact path                     | D shared                                                         | D shared                                                               |
| Local digest check before upload                                         | R missing; tamper attempted then caught after upload            | R shared; R native artifact digest not enforced      | R shared                                                         | R shared                                                               |
| Existing identical version / conflicting registry digest                 | D idempotence / D/R conflict                                    | D shared / D/R shared                                | D shared / D/R shared                                            | D shared / D/R shared                                                  |
| Registry version/digest/read failure blocks verified completion and sync | D/R actual shell with controlled registry                       | D/R shared shell                                     | D/R shared shell                                                 | D/R shared shell                                                       |
| Interrupted verification and partial-package retry                       | D, independent package jobs; not atomic                         | D shared                                             | D shared                                                         | D shared                                                               |
| Exactly-once downstream sync                                             | U; retry may dispatch again                                     | U shared                                             | U shared                                                         | U shared                                                               |
| GitHub sole publisher, job permissions, provenance request               | DOC source                                                      | DOC retained source                                  | DOC retained source                                              | DOC retained source                                                    |
| Live GitHub environment policy                                           | D read-only configuration; hosted enforcement U                 | Same inherited evidence                              | Same inherited evidence                                          | Same inherited evidence                                                |
| Current npm trusted-publisher bindings / live OIDC and provenance        | U configuration/exchange; historical provenance metadata D only | U same live boundary                                 | U same live boundary                                             | U same live boundary                                                   |
| Real hosted artifact transport / GitHub release creation and upload      | U in rehearsal                                                  | U shared                                             | U shared                                                         | U shared                                                               |

Preparation ran 24 approach/scenario combinations. Automation ran 170 controlled
cases across four approaches and two lanes: 8 eligible handoffs and 162 visible
rejection/failure cases. Publication ran actual workflow shell bodies with controlled
registry and mutation commands, plus Changesets native artifact packing/publication
interception. These are real public command/API outcomes against isolated inputs;
they do not establish live review, authenticated artifact transfer or npm publication.

The four actual packages currently have no direct runtime dependency on one another.
Local integration imports and copied template inputs do not add such edges. The
model can publish independently while downstream compatibility validation continues.
A future real dependency requires fresh range/order/release assessment; the Nx
fixture's `updateDependents: never` is not permission to ignore required range repairs.

## Maintenance and operating consequences

| Approach       | Demonstrated work it can replace                                                                                                      | Work retained or added before safe adoption                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current Forge  | No migration or new metadata state; existing reviewed edits, patch preparers and retry path                                           | Manual ordinary version/changelog editing; existing domain/publisher code, operating procedures and shared safety gaps                                                                                                          |
| Changesets     | Ordinary version calculation, independent change-intent collection and generated changelogs; native pre-mode and packed artifact plan | Reviewed intent/state lifecycle, existing tag mapping, notes/manifest handoff, narrow-patch metadata policy bridge, tool upgrades; retain compatibility/template policy, App PR flow, publisher integrity/retry/permissions     |
| Nx Release     | Ordinary version calculation and project changelogs from reviewed plans; explicit independent configuration                           | Project discovery/configuration, matching plugin upgrades, lock update integration, plan consumption/promotion steps, tag mapping and narrow-patch bridge; retain domain policy and publisher; no task runner or Cloud required |
| release-please | Proposed independent versions/changelogs/manifest updates and Forge-shaped release tag candidates                                     | GitHub API/history/labels/token operations and release PR lifecycle, explicit prerelease overrides, merged metadata handoff and no-second-approval exception bridge; retain domain policy and npm publisher                     |

The baseline ordinary path reviews version/notes, validates and packs its exact
commit, approves the manual environment and verifies npm completion. Its automatic
path prepares one narrow peer/template patch, merges reviewed intent, selects that
exact commit and publishes without another environment approval. Candidate metadata
can shorten ordinary file editing, but adds intent/state generation and consumption.
The default release-please release PR adds another review/operating step unless
integrated with the already-reviewed patch path.

Candidate intent/manifest files fail today's eligible-file policy. Adoption needs
reviewed metadata preparation/consumption within the allowed shape or a narrow
adapter with equivalent rejection coverage; broadening the allowlist is not proven.
The 8 eligible synthetic handoffs do not demonstrate that end-to-end adapter.

No production policy, validator, workflow or custom implementation was deleted.
Compatibility/template selection, App identity, exact merge/file/version eligibility,
artifact inspection, immutable identity, publication permissions, registry equality,
retry and downstream handoff retain owners. Recorded checksums do not replace
registry recovery. Metadata tools may legitimately retain Forge's publisher;
repacking defaults are not the reason for this recommendation.

The experiments show operations that tools can automate, not measured staff time saved.
Source counts are not labor. Adding a metadata/state/API upgrade surface for
unmeasured ordinary-edit savings has not demonstrated substantial net maintenance
reduction within the current four-package workload. Reconsider with concrete
maintained work removed or measured operating reduction and equivalent safeguards.

## Policy and history to preserve

Preserve independent versions, explicit ordinary reviewed intent, per-package
changelogs/tags, pre-1.0 breaking minors with migration notes and stable breaking
majors. Prereleases select `next`; stable releases select `latest`. Upstream bump
labels do not substitute for compatibility assessment.

Only reviewed merged content-model peer patches and create-forge template-sync
patches receive no second approval, retaining the current App, exact merge SHA,
repository/branch/file restrictions and exact next stable patch. Mixed features,
prereleases and other packages retain ordinary release review/environment approval.
Observed `main` protection does not establish mandatory human PR approval.

GitHub remains sole publisher with protected manual and main-only automatic
environments, least-privilege permissions and OIDC/provenance/registry requirements.
Retain bundled locks and template-sync: #369 did not adopt fresh resolution. If
separately adopted later, an upstream release inside unchanged compatible ranges
alone need not release create-forge; changed templates, pins, ranges or compatibility
rules still require release assessment. Copied pins are not runtime dependencies.

The 2026-10-24 [inventory](../reviews/release-baseline-391.md) records model 1.1.10,
generator 1.2.0 and frontmatter 0.1.0 as published, with browser 0.1.2 prepared in
source but registry latest 0.1.1 and no 0.1.2 tag. Pending browser source is not
publication approval and must not be double-bumped by migration. Existing model
`next` 1.0.0-rc.1 and generator `next` 1.0.0-rc.2 are historical channel state, not
current stable identities. Preserve each `<slug>-v<version>` tag, its exact commit
and changelog; do not rewrite old package or repository milestone tags. Recheck
remote refs, registry versions/dist-tags, open release work and pending intent before
any future migration. There is no current migration action under this recommendation.

## Shared limitations and bounded follow-up

The controlled publisher accepted a foreign manifest SHA when trusted job/tag SHAs
matched. Altered tarball bytes reached intercepted upload before registry equality
rejected completion; native Changesets artifact mode also passed altered bytes
with a stale recorded digest. These missing independent checks are shared limits,
not demonstrated production exploits or proof that Actions authentication fails.
Separate hardening should bind downloaded package/version/commit/tag to trusted
job/event values and hash bytes before upload, preserving registry equality and
retry. Include tampering, both approval lanes, interruption and partial-success
regressions; repeated dispatch remains a separate exactly-once concern.

The initial evaluation shares **two focused working days across #391–#395**, not
per tool or ticket. The initial comparison completed within that shared bound: survey, isolated
preparation, shared policy handoff and controlled recovery on the recorded date. No stopwatch-based
labor measurement or claim that the entire two-day allowance was exhausted is made.
The evidence supports retaining the baseline now; no extension is required to make
that bounded recommendation.

Reconsideration estimate: **one focused day** for one candidate's minimal reviewed
metadata/automation/history adapter and regression coverage; **another focused day
plus hosted runner/access time** for artifact/recovery rehearsal and operating-step
comparison. These are planning estimates, not measured costs or extension permission.
Show removed maintenance rather than build another complete competing migration.
Cover native Nx channels, Changesets only-prerelease history and real runtime-edge
behavior if the selected integration relies on them.

Shared hardening estimate: **half to one focused day** for manifest/digest checks
and controlled regressions. Separately obtain read-only npm trusted-publisher
repository/workflow/environment bindings for both environments. Real OIDC/provenance
and authenticated artifact transport require explicitly authorized hosted rehearsal;
settings and any test publication need separate permissions. Access-dependent elapsed
time is not estimable from the available evidence. These shared gaps do not count as
tool-specific rejection reasons.

Because adoption is not recommended, conditional migration, CI integration, cleanup,
regression and rollback issue drafts are not required. A later adoption proposal
must supply those bounded issues, current-to-target history/state mapping, an
incremental rollback to retained Forge preparation/publishing and explicit amendments
to affected accepted ADRs before rollout. No follow-up issues, parent-specification
changes, shared settings, production tags or publications are created here.
