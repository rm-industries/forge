# 0010: Retain locked template delivery after the freshness evaluation

- Status: Proposed
- Date: 2026-10-23
- Roadmap: [369](https://github.com/rm-industries/forge/issues/369),
  [389](https://github.com/rm-industries/forge/issues/389)

## Context

Forge evaluated bundled curated npm ranges without a shipped template lockfile.
The intended benefit is fewer reviewed lock refreshes and generator releases for
compatible updates inside unchanged ranges. The evaluation authorized a prototype,
not production lockfile removal. This dependency-delivery decision is independent
of the [authoring comparison](../reviews/template-authoring-388.md), task runners,
and release-tool selection.

## Decision

Retain the current bundled template lockfile and reviewed template-sync patch
releases. Do not adopt lockless delivery on the present evidence. This proposed
record awaits maintainer review; it neither supersedes existing ADRs nor changes
production policy. Fresh npm resolution works, but the complete working-bootstrap
and correction contract has not been demonstrated sufficiently to accept its new
operating responsibilities. This is a decision against rollout now, not a finding
that curated fresh resolution cannot work.

## Evidence and limits

The [baseline](../reviews/template-baseline-385.md),
[fresh-resolution experiment](../reviews/template-delivery-386.md), and
[failure rehearsal](../reviews/template-recovery-387.md) establish:

- An installed packed candidate outside repository workspaces resolves published
  packages, creates a consumer lockfile, and passes `quality:core` on Node 26:
  static checks, types, 39 tests with coverage, build, and output validation.
  Deleting its dependencies and repeating `npm ci` passes the same checks without
  changing the lock hash. Additional fresh packed-CLI bootstraps and the same
  complete `quality:core` pass on Node 22.22.2 and 24.22.1 with npm 11.19.1.
  These are macOS arm64 observations, not all operating systems or the minimum
  npm 10 lane. No local model overlay supplies missing dependencies.
- The manifest retains every baseline range and pin; 174 common lock entries
  resolve different versions. This is evidence that unchanged bundled metadata
  can deliver newer compatible resolutions, not a historical release-saving count.
- Actual failed network access, SIGINT, and existing destination conflicts preserve
  recoverable files and accurate failure status. Ordinary no-install creation
  followed by installation and checks passes. No-install output needs `npm install`
  before CI can use `npm ci`; Cloudflare still performs its existing networked
  lockfile-only preflight even with `--no-install`.
- A local fixture's allowed 1.0.1 update fails a deliberately added public contract
  test; exact 1.0.0 restores all 40 tests. The follow-up packs and invokes an old
  fixture generator and a corrected fixture generator; the corrected delivered
  pin restores all 40 tests and `quality:core`. This is a synthetic packed-release
  rehearsal, not an actual upstream regression or public publication. The original
  39 tests are not claimed to detect the injected fixture behavior.
- Both baseline and candidate fail the existing security audit in the Lighthouse
  CI dependency graph: three baseline advisories versus two candidate advisories.
  Freshness did not introduce that known baseline defect, and no audit exception
  was added. Neither result is a clean security gate.
- Model/CMS pins and tested peer constraints remain unchanged. Delivered tests and
  builds cover configuration and models. On the unmodified fresh Node 24
  consumer, all 26 Chromium browser cases and all 26 WebKit cases pass. Firefox
  cannot launch because its profile folder is not found, including a retry with
  a private temporary directory; this is an environment limit, not an established
  product failure. Browser-driven CMS editing/content preservation and Lighthouse
  behavior remain unverified here.
- Provider manifests parse and reference delivered commands, including standalone
  GitLab and nested dual-provider Cloudflare output. This is local evidence;
  hosted GitHub/GitLab execution, deployments, and hosted Dependabot updates were
  not demonstrated by this experiment.

The evidence supports npm resolution and consumer repeatability. It does not yet
establish Firefox/CMS preservation or live provider behavior.
The audit failures are a separate known problem requiring investigation rather
than evidence against the resolution mechanism. Hosted and runtime coverage must
be assessed proportionately; none of those omissions proves the candidate broken.

## Maintenance and release tradeoff

| Responsibility                                            | Current delivery              | Fresh-resolution delivery                                             |
| --------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Curate template source, ranges, exact pins and peers      | Retained                      | Retained; no automatic widening                                       |
| Review and ship ordinary bundled lock refreshes           | Existing template-sync work   | Potentially removed for updates inside unchanged ranges               |
| Publish template, range, pin and compatibility changes    | Existing generator releases   | Retained; corrective releases still required                          |
| Validate packed CLI, materialization and consumer scripts | Existing checks               | Retained, with fresh-resolution coverage                              |
| Preserve repository and consumer lock safeguards          | Existing checks and ownership | Retained; only shipped template lock omitted                          |
| Detect newly incompatible permitted upstream updates      | Reviewed snapshot validation  | Relevant-PR and daily default-branch fresh installs introduced        |
| Handle compatibility failures between generator releases  | Reviewed updates and releases | Failure-only notifications, triage and targeted correction introduced |
| Document bootstrap and no-install behavior                | Existing instructions         | Additional initial-install/CI and older-generator limitations         |

The prototype removes 19 lines of lock packing/materialization token handling and
the shipped-lock snapshot obligation for ordinary compatible resolutions. Those
are real simplifications. The repository template authoring lock remains, and
template-sync still reviews
published content-model identity, provenance, exact model/CMS compatibility and
release intent; it cannot simply be deleted. No historical dependency-only release
count, labor saving, or scheduled-run cost was measured. Fewer generator releases
are plausible, but neither all release work nor dependency stewardship disappears.
Monitoring can reuse existing packed-CLI and isolated-consumer checks; no new CI
framework is inherently required. Scheduling, failure notification, triage and
corrective-release ownership still need a concrete cost comparison. With no measured
release-frequency or operating-cost comparison, the net benefit is unproven rather
than established to be negative. Combined with incomplete integration confidence,
that is insufficient evidence to replace the working production policy now.

## Consequences and reconsideration

Keep editable consumer files, consumer lockfiles, security auditing, functional
Dependabot configuration, exact model/CMS pins and current reviewed synchronization.
Starter components/themes remain consumer-owned; replacing them does not waive
integration/content-preservation checks. A future corrective Forge release only
changes its own bundled ranges. Old generators retain their metadata and cannot
be remotely repaired; existing consumers must choose an update deliberately.

No migration, schedule, production lock deletion, publishing, repository setting,
or consumer migration is included. Adoption is not recommended, so conditional
rollout issue drafts are not activated or required. A reconsideration proposal
must first demonstrate CMS preservation and Firefox coverage, close proportionate runtime and
provider evidence gaps, and record an explicit disposition of the
existing audit findings without weakening the security gate. It should then
specify relevant-PR and daily default-branch fresh-resolution checks, quiet success
and failure-only notification, release/sync alignment, regression coverage, cleanup,
and rollback to a tested bundled lockfile. Narrow rollout must preserve existing
reviewed template-sync until its replacement passes and is approved.

Review any required replacement of ADR 0006's tested snapshot/model/peer contract
explicitly before adoption; preserve ADR 0004 materialization safety and ADR 0003
installation boundaries. No exact-pin widening follows from this experiment.
Budget roughly one further focused working day plus hosted runner time for the
missing Firefox/CMS proofs, runtime/provider review, and a concrete
operating-cost estimate; audit remediation may require separate upstream work.
That is an estimate, not authorization to extend. The shared two-working-day limit
was not measured as exhausted; this recommendation closes the current evaluation
without claiming it was. Authoring can reach its own decision independently.
