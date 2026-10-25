# Combined Projen and lockless create-forge experiment

<!-- cspell:ignore Projen -->

Status: Proposed design; implementation awaits design review.

## Intent and agreed scope

Evaluate whether internal Projen authoring plus fresh dependency resolution reduces
create-forge maintenance while preserving working, editable generated projects.
The maintainer agreed to include bounded content-model and Sveltia ranges instead
of the current exact pins. This authorizes an experiment, not production adoption.

Use released create-forge 1.3.0 as the baseline. Build on the existing
[authoring evaluation](../../reviews/template-authoring-388.md) and
[dependency-delivery evaluation](../../reviews/template-delivery-386.md).
Their separate proposed recommendations remain unchanged pending new evidence.

## Approaches and comparison

Compare three candidates with the same starter source and runtime toolchain:

1. Current static/typed authoring, shipped template lock, exact model/CMS pins.
2. Existing authoring, no shipped template lock, bounded model/CMS ranges.
3. Internal Projen authoring, no shipped template lock, the same ranges as candidate 2.

The third candidate is the proposed combined experiment. Candidate 2 is necessary
to distinguish Projen's contribution from dependency-delivery changes. Report the
effect of widening pins separately from removing the lock: use an exact-pin fresh
resolution probe as a control rather than crediting all differences to lock omission.

## Dependency policy

Propose `^1.1.10` for content-model and `>=0.251.0 <1.0.0` for Sveltia in the
experimental consumers. Record the exact selected versions and published peer
metadata for every run. The wider Sveltia range deliberately permits future minor
lines; content-model's declared peer ceiling must still constrain the installed
combination. A caret such as `^0.251.0` alone would permit only patch updates.

Keep formatter/Oxfmt version coupling, other dependency ranges, action SHA pins,
engines and security policy unchanged. Do not generalize this permission to other
exact pins. Keep the repository's authoring lock and all generated consumer locks.

Exercise the supported npm 10 and 11 lanes with default and strict peer handling.
Test overlapping ranges with an older compatible host available, disjoint ranges,
and multiple allowed model versions with different host peer ranges. Include the
optional-peer shape used by content-model, with Sveltia explicitly installed.
Use packed synthetic packages to control future-release scenarios; also validate
real published model/CMS packages. Do not assume npm exhaustively searches every
possible version combination. Never use force or legacy-peer-deps to obtain green results.

If strict peer handling is required for the proposed consumer contract, demonstrate
it in the candidate and count the new configuration and consumer obligation as a cost.

## Authoring and delivery boundary

Use Projen only inside Forge's authoring/build process. Start with the dependency
manifest and directly related Dependabot and CI policy; generate only files where
there is a credible opportunity to replace existing maintained rules or writers.
Preserve provider schemas, formatting, permissions, action pins, artifact handoffs,
ownership comments and all materialization/collision/rollback safeguards.

Synthesize into an isolated stage and export an explicit allowlist. Consumers get
ordinary writable files, no Projen dependency, metadata or regeneration task.
Their edits must survive normal checks and builds. Projen must not run when an
installed create-forge CLI creates a project.

Remove only the delivered template lock. Initial installation writes the consumer
lock; subsequent CI uses npm ci. Document no-install behavior, including the existing
Cloudflare networked lockfile preflight, rather than claiming offline operation.

## Executable evidence

Invoke an installed packed CLI outside repository workspaces for each candidate.
Record source SHA, npm/Node versions, resolved dependency versions and artifact hashes.
Reuse existing generator fixtures, consumer quality/build commands and CMS/browser
checks instead of introducing a parallel verification framework.

Cover default GitHub, GitLab, and Cloudflare output, including a representative nested
layout; use a small matrix rather than every provider/runtime Cartesian combination.
Run the existing supported runtime lanes and browser preservation checks. Reuse baseline
evidence only when inputs are identical and label that reuse explicitly. Distinguish
rendered provider validation from hosted execution; trial hosted workflows only in an
isolated experimental branch or fixture repository, without production deployments.

Rehearse network failure, cancellation, destination collision and a permitted upstream
regression. Show a corrected experimental generator restores working bootstrap and that
existing consumer locks still replay. Never publish synthetic packages publicly.

Run dependency audits for comparison and disclose baseline/candidate findings. No new
allowlists, security threshold reductions or unsupported peer overrides belong here.

## Value, budget and stop conditions

Estimate 3–5 focused working days plus hosted runner time; this is not measured effort.
After the first focused day, identify specific production rules/writers the Projen
candidate can replace. If none can be removed, stop that portion and finish the
dependency-delivery comparison. Equivalent serialization alone is not adoption evidence.

Report maintained source/configuration deleted and added, policy duplication removed,
dependencies and export machinery introduced, corrective releases still required, and
which observed model/CMS synchronization releases range-based delivery could avoid.
Separate observed outcomes from projected future savings. Include the cost of daily
fresh-resolution validation, failure-only notifications, triage and correction ownership.
Prototype the validation command; do not enable a permanent production schedule.

Deliver one evidence report and a recommendation to adopt, reject or narrow each part.
Adoption requires working consumer evidence and a credible net maintenance reduction.
Unresolved material coverage or compatibility gaps must be visible, not counted as passes.

## Non-goals and rollback

No production template migration, existing-site regeneration, release-tool replacement,
public package publication, automatic peer widening or repository-setting changes.
Do not delete reviewed template-sync or production validation before a replacement is
demonstrated and separately approved. Audit remediation is separate from this time estimate.

Keep candidate changes on an isolated experiment branch. Rollback is retaining the
released locked baseline; any adoption needs a separate reviewed implementation and
explicit consideration of the existing snapshot, ownership and installation ADRs.
