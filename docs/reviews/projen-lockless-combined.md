# Combined authoring and fresh dependency experiment

<!-- cspell:ignore Projen ERESOLVE ENOENT materializer unallowlisted mrhx Miniflare rustc -->

Status: Bounded experiment complete; recommend a separate lockless/ranges adoption
proposal, without Projen. No production adoption is authorized by this report.

Baseline: create-forge 1.3.0, commit `adde4f1392a4911f1c73e9091a5f882f02cc9f80`.
Scope: [approved design](../superpowers/specs/2026-10-25-projen-lockless-experiment-design.md).

## Policy ownership inventory

| Current owner                                     | Maintained responsibility                                                | Effect of fresh resolution                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Starter package.json (77 lines)                   | Scripts, runtime/tooling ranges, engines and Knip policy                 | Model/CMS pins become ranges; remaining rules still required                                         |
| Starter Dependabot (51 lines)                     | Ecosystems, groups, cooldown, labels and CMS exclusion                   | Consumer update policy remains necessary after initial bootstrap                                     |
| CI writer (87 lines), provider models and schemas | Provider behavior, permissions, comments, formatting and validation      | Consumer CI still replays a lock; provider writers remain necessary                                  |
| Consumer-lock verifier (33 lines)                 | Snapshot identity and registry isolation                                 | Snapshot equality changes to peer/range checks; isolation remains                                    |
| Template-sync preparation (203 lines)             | Published model identity/provenance, template updates and release intent | Potentially fewer range-compatible bootstrap refreshes; reviewed compatibility and correction remain |

Counts are source surface, not labor savings. No deletion is credited yet.

## Peer-resolution evidence

The committed localhost registry fixture supplies actual package tarballs with controlled
model/host versions. Eight scenarios pass with npm 10.9.4 and 11.19.1, each in default
and strict-peer mode on Node 22.22.2, 24.22.1 and 26.9.0: 96 scenario executions on
macOS arm64. The overlapping-host and generator-correction assertions were observed
failing before their fixture implementations; the other npm cases characterize the resolver.

| Scenario                                                                                       | Both npm versions, both modes                                                |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Host ^1.0.0, model peer >=1.0.0 <1.5.0                                                         | Select host 1.0.0 despite available host 1.5.0                               |
| Host ^1.5.0 with that peer                                                                     | ERESOLVE                                                                     |
| Optional peer absent                                                                           | No host installed                                                            |
| Optional peer explicitly installed with overlapping range                                      | Select compatible host 1.0.0                                                 |
| Optional peer explicitly installed with disjoint range                                         | ERESOLVE                                                                     |
| Model ^1.0.0 offers 1.0.0 (host ^1) and 1.1.0 (host ^2); consumer host ^1                      | ERESOLVE on model 1.1.0; no fallback to the available compatible model 1.0.0 |
| Packed fixture generator 1.0.0 allows model ^1.0.0; 1.1.0 violates a public behavior assertion | Install succeeds, consumer contract fails                                    |
| Corrected packed fixture generator 1.0.1 pins model 1.0.0                                      | Consumer contract passes                                                     |

This demonstrates constraint-aware host selection, not a complete solver for every
allowed model/host combination. A fresh install can fail after a permitted model
release changes its peer requirements even while an older satisfying model remains
available. Exact consumer locks avoid re-resolving that choice on later npm ci runs.
The synthetic model's public assertion represents metadata preservation; it is not
the real content-model implementation. Both generator versions and model tarballs
are installed and executed from the local registry, not published publicly.

A real fresh lock with content-model ^1.1.10 and Sveltia >=0.251.0 <1.0.0 selected
content-model 1.1.10 and Sveltia 0.251.0. The published model peer was
`>=0.193.2 <0.252.0`. This is the currently available pair, not a simulated future upgrade.

## Packed delivery candidates

All three tarballs were built from the same released source and installed authoring
version set (Node 26.9.0, tsdown 0.23.1, Oxfmt 0.74.0). The baseline is a rebuild,
not a claim of byte identity with npm's published 1.3.0 artifact.

| Candidate        | Compressed bytes | Shipped lock | Model/CMS policy           | Installed CLI scenarios              |
| ---------------- | ---------------: | ------------ | -------------------------- | ------------------------------------ |
| Baseline         |          242,794 | Yes          | Exact pins                 | 11 scenarios and consumer build pass |
| Lockless control |          115,863 | No           | Exact pins                 | Same 11 scenarios and build pass     |
| Lockless ranges  |          115,871 | No           | ^1.1.10 / >=0.251.0 <1.0.0 | Same 11 scenarios and build pass     |

Local comparison artifact identities after the rollback correction:

- Baseline (242,794 bytes): `sha512-lhrq5Rd4lIIbaGtiWa7qyUsLTvHAAYoy6dkYcDGCC8ED5E3X8OiV8ndMDQichun9sQ5vMWIolrg6UFZqM+XJHQ==`
- Control (115,863 bytes): `sha512-jqa0+PjTJo5moZnmKUel8cozSVHUpJkkjv2hkNFvbwf7v6Jj1RuGYSZF6aicUNRzYBA+zh8lZH0pW6xhCIn2qA==`
- Ranged (115,871 bytes): `sha512-joCbt5U0ssweh5fu3tDRGVUYvINC9PfVCpBFzDRaRAxSlUp/0EnSYkC0lghriGhipW8Swdn5jRPFrtksVZb6Vw==`

The candidate-only generator suite passed 120 tests in 14 files versus baseline 117. The new missing-lock
materialization assertion first failed with ENOENT,
then passed after removing only the lock assumptions. Manifest token validation,
collision handling and rollback remain. Independent review found that the first candidate
omitted Cloudflare's generated lock from rollback tracking. Two regression cases failed
before the correction: a newly created lock survived a later renderer failure, and an
existing lock was not restored. The corrected candidate validates the lock destination
and registers its backup or creation before resolution; both cases now pass. The installed package verifier likewise
first failed on its snapshot-specific lock expectation, then passed with the
explicit no-shipped-lock contract.

An initial baseline scenario run exhausted available temporary disk space during
Cloudflare installation. The experimental driver now removes each already-checked
fixture installation before creating the next large one. Its baseline rerun passed;
no validation was skipped and no production test driver was changed.

A separately generated ranged consumer passed quality:core, including 40 tests,
coverage, types, static checks, build and output validation. Fresh resolution changed
176 common package versions relative to the shipped lock. Deleting its installed
dependencies and replaying npm ci preserved consumer lock SHA-256
`7be12e20ea45b3733175afb2981ab35665db72e19a09ce6ae52204771fb9114c`.

Additional integration, Projen gate and maintenance results follow below.

## Projen checkpoint: stop the cosmetic authoring candidate

The approved stop condition applies: this bounded slice exposes no existing policy
or writer that Projen can remove without moving the same maintained rules into a
new representation. The model/CMS ranges already have one starter-manifest owner;
published content-model peer metadata owns a different, tested compatibility rule.
CI consumes npm commands and consumer locks rather than duplicating those ranges.
Dependabot's CMS grouping exception is review policy, not another version-range owner.

A fresh executable probe of Projen 0.104.14 requested the specialized Dependabot
component's INCREASE strategy and weekly updates. Its synthesized file still used
lockfile-only and included only the npm ecosystem. Preserving Forge's existing
manifest updates and GitHub Actions policy requires overrides or generic YAML,
retaining the policy objects and adding synthesis/export responsibilities. This is
a result about the pinned component and bounded slice, not all possible Projen uses.

No third Projen CLI tarball, cosmetic adapter, synthesis framework or claimed
production-code deletion was produced. The committed private fixture lock and
policy probe make the observation reproducible; Projen is absent from production
dependencies. Lockless/range validation continues independently. This checkpoint
was reached before the estimated first focused day; the budget was not exhausted.

## Hosted runtime and consumer evidence

[Corrected hosted run 40151392110](https://github.com/rm-industries/forge/actions/runs/40151392110)
passed on experimental branch commit `56f2039`. It repeats the initial
[successful rehearsal](https://github.com/rm-industries/forge/actions/runs/40149801110)
after the Cloudflare rollback correction.
That branch is a disposable validation input, not a merge candidate. The evidence
branch keeps production source and workflows unchanged.

| Environment actually executed | npm     | Fresh install, 40 consumer tests, quality:core and lock replay |
| ----------------------------- | ------- | -------------------------------------------------------------- |
| Ubuntu / Node 22.22.2         | 10.9.4  | Pass                                                           |
| Ubuntu / Node 24.21.0         | 11.19.0 | Pass                                                           |
| Ubuntu / Node 26.12.1         | 11.20.0 | Pass                                                           |
| macOS / Node 26.12.1          | 11.20.0 | Pass                                                           |

All lanes install the same uploaded packed CLI outside the checkout, generate both
provider configurations without a lock, resolve dependencies, and replay the new
lock without changing its hash. Version output above is observed, not inferred
from the matrix's floating Node labels. The hosted artifact independently verified
the intended ranges, exact browser-oxfmt 0.1.2/Oxfmt 0.74.0 coupling, no template
lock, and no Projen consumer dependency. Its SHA-512 is
`sha512-meKbMnwq8qKkQbLkiOU6RzmBnOgI4qXsK/Ak9rYqh98oDRbW88tuV8jZCZMJBAqJ2bG8LO3Cg+yhTkN/M+XU7w==`.

The Ubuntu Node 26 lane passed all 114 delivered browser cases across Chromium,
Firefox and WebKit, including actual CMS save/preservation/recovery paths, and
all Lighthouse budget assertions over three URLs and nine runs. Generated GitLab
configuration and nested/Cloudflare behavior pass local generator contracts and
packed scenarios; actual hosted GitLab pipelines, remote CMS backends and production
deployments were not exercised. No real-device evidence is claimed by this trial.

Local Chromium and WebKit checks passed after normal browser installation and
execution outside the command sandbox. Initial Chromium launch was denied by the
command sandbox; local Firefox still failed before tests on its profile-folder
lookup. Hosted Linux Firefox supplies the missing browser execution evidence,
not proof that the local macOS launch issue is fixed. The first hosted attempt
failed because the temporary workflow omitted action version comments required
by Forge's pin resolver; restoring those annotations passed the existing build.

Actual failed registry access and SIGINT during npm resolution preserve the installed
CLI's generated source and return exits 1 and 130. Existing packed destination-conflict
checks preserve sentinel files. Cloudflare no-install still performs networked lock
resolution, selecting Wrangler 4.152.0 in the observed run. A deliberately failed
Cloudflare preflight rolled back its materialization; retry with a writable task
cache completed. This is not offline no-install behavior.

Consumer-owned manifest script and GitHub configuration comments survived normal
formatting and another full quality:core pass. No regeneration or Projen step ran.

## Security observations and verification limits

| Dependency graph                                       | Raw affected packages | High | Critical |
| ------------------------------------------------------ | --------------------: | ---: | -------: |
| Locked default baseline                                |                    25 |   13 |        0 |
| Fresh default candidate, local and hosted              |                    22 |   13 |        0 |
| Fresh default candidate, production-only               |                     0 |    0 |        0 |
| Fresh Cloudflare candidate, including Wrangler tooling |                    25 |   14 |        0 |

These are raw npm audit package counts, not unique advisory counts or clean gates.
The default candidate introduces no advisory IDs absent from its locked baseline
in this observation. Lighthouse tooling still includes unallowlisted
GHSA-c475-qrg2-pj4r and GHSA-mrhx-c7xc-m3w5. Cloudflare's Wrangler/Miniflare path
still includes GHSA-xjj6-f33q-929c. Existing audit allowlists and expiry dates remain
unchanged. The hosted audit step intentionally records the failing JSON as evidence;
the green workflow is not a green audit.

The evidence branch's whole-repository npm test passed 50 root contract, 32 model,
117 generator and 27 Markdownlint tests, but the browser package's native build
could not start because rustc is unavailable in this local environment. The overall
npm test command therefore failed; no fresh native-source suite pass is claimed.
The experiment exercises the published formatter through real consumer browser tests.
Tracked-file formatting, focused Markdown/spelling and documentation-link validation
are checked separately from pre-existing untracked machine metadata.

## Maintenance result and operating cost

Lockless packaging/materialization removes 1 net production source line in the
candidate: copy-template changes by +2/-1 and materialize by +13/-15. Two manifest
values change. Snapshot-specific verifiers need replacement assertions; registry
isolation, materialization safety, provider writers and consumer validation remain.
The private experiment tooling/lock is measurement infrastructure, not a proposed
ongoing Projen dependency or CI framework. Projen contributes zero credited policy
or writer deletions and no third artifact under the approved stop condition.

Widening pins changes the earlier lockless evaluation's release argument. The
observed generator 1.1.1 and 1.1.2 changes are only model/CMS synchronization:
model 1.1.5 → 1.1.6 → 1.1.7 and CMS 0.228.0 → 0.235.1 → 0.236.0. Published
model 1.1.6 and 1.1.7 peer ceilings are <0.236.0 and <0.237.0 respectively.
Had analogous bounded ranges been adopted with the then-current floors, these two
bootstrap-only releases are plausible savings. This is a counterfactual based on
reviewed diffs and published peer metadata, not replayed historical registry states,
measured staff time, or a claim that today's 0.251.0 floor admits those old versions.
Behavior releases such as 1.2.0 and 1.3.0 remain necessary.

A rehearsal of the existing packed-generator validation command against the ranged
artifact took 82.20 seconds on this macOS host with a warm npm cache. It performed
the eleven scenarios and consumer builds; this is not a cold hosted-run forecast
or the cost of the full runtime/browser/Lighthouse matrix. It establishes a usable
command for future fresh-resolution monitoring without enabling a schedule.

An adoption proposal should run fresh packed bootstrap on relevant PRs and daily
on the default branch, retain broader runtime/browser coverage, stay quiet on
success, and notify only on actionable failures. A named maintainer must own
upstream triage and reviewed pin/range corrections. Reviewed template-sync can
continue updating the authoring lock and verifying published model identity and
provenance; compatible bootstrap updates need not automatically bump the generator.
Compatibility tests, corrections, major/range/source changes and their releases
remain work. Existing consumers keep their own locks and choose updates deliberately.

## Recommendation and rollback

Narrow the next proposal to lockless delivery plus bounded model/CMS ranges using
existing static configuration and typed provider generation. The executable evidence
supports that mechanism more strongly than the earlier exact-pin trial, and the
two pure synchronization releases show a concrete potential benefit. It does not
establish measured labor savings or justify adding Projen to this authoring slice.

Do not change production delivery from this evidence-only branch. A separate reviewed
adoption must settle monitoring and correction ownership, template-sync/release
alignment, the snapshot-contract ADR change, hosted GitLab evidence and disposition
of known audit findings. Preserve exact formatter pairing and do not widen other
pins automatically. No consumer migration or regeneration follows from this report.

Rollback retains the currently released locked generator. Old published generators
cannot be remotely repaired by a new Forge release; a permitted upstream regression
may require an upstream fix, a corrected generator or deliberate consumer pinning.
The packed synthetic correction rehearsal proves a targeted response, not automatic
recovery or prevention of every possible upstream regression.

## Independent review boundaries

The single final review requested changes for Cloudflare rollback, corrected with two
regression tests. It also requested retained local artifact hashes and an inline peer
range; both are corrected here. No second review is claimed.

Review declined to judge full Projen synthesis (the approved early stop), generated hosted
workflow operational permissions/deployments/CMS/devices (outside the consumer rehearsal),
local Firefox/native Rust checks (unavailable as noted), and exploitability of npm tooling
findings. These remain explicit limits, not passing evidence. The temporary npm 10/11
tooling graph had 24 affected packages (17 high, one critical); moving those executables
to scratch does not remove their vulnerabilities. The committed Projen-only fixture graph
has zero audit findings. No production dependency or audit exception was changed.

Raw whitespace checking of the branch reports blank context lines inside the retained
unified patch. Those single-space context prefixes are required patch syntax; checks of
the applied candidate and non-patch changes pass. No production whitespace failure is waived.
