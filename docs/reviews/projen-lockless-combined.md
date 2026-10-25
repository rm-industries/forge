# Combined authoring and fresh dependency experiment

<!-- cspell:ignore Projen ERESOLVE materializer -->

Status: Experiment in progress; no production adoption.

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
model/host versions. Six scenarios pass with npm 10.9.4 and 11.19.1, each in default
and strict-peer mode: 24 scenario executions on macOS arm64 / Node 26.9.0.

| Scenario                                                                  | Both npm versions, both modes                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Host ^1.0.0, model peer >=1.0.0 <1.5.0                                    | Select host 1.0.0 despite available host 1.5.0                               |
| Host ^1.5.0 with that peer                                                | ERESOLVE                                                                     |
| Optional peer absent                                                      | No host installed                                                            |
| Optional peer explicitly installed with overlapping range                 | Select compatible host 1.0.0                                                 |
| Optional peer explicitly installed with disjoint range                    | ERESOLVE                                                                     |
| Model ^1.0.0 offers 1.0.0 (host ^1) and 1.1.0 (host ^2); consumer host ^1 | ERESOLVE on model 1.1.0; no fallback to the available compatible model 1.0.0 |

This demonstrates constraint-aware host selection, not a complete solver for every
allowed model/host combination. A fresh install can fail after a permitted model
release changes its peer requirements even while an older satisfying model remains
available. Exact consumer locks avoid re-resolving that choice on later npm ci runs.

A real fresh lock with content-model ^1.1.10 and Sveltia >=0.251.0 <1.0.0 selected
content-model 1.1.10 and Sveltia 0.251.0. The published model peer was

> =0.193.2 <0.252.0. This is the currently available pair, not a simulated future upgrade.

## Packed delivery candidates

All three tarballs were built from the same released source and installed authoring
version set (Node 26.9.0, tsdown 0.23.1, Oxfmt 0.74.0). The baseline is a rebuild,
not a claim of byte identity with npm's published 1.3.0 artifact.

| Candidate        | Compressed bytes | Shipped lock | Model/CMS policy           | Installed CLI scenarios              |
| ---------------- | ---------------: | ------------ | -------------------------- | ------------------------------------ |
| Baseline         |          242,794 | Yes          | Exact pins                 | 11 scenarios and consumer build pass |
| Lockless control |          115,706 | No           | Exact pins                 | Same 11 scenarios and build pass     |
| Lockless ranges  |          115,714 | No           | ^1.1.10 / >=0.251.0 <1.0.0 | Same 11 scenarios and build pass     |

The candidate-only generator suite passed 118 tests in 14 files versus baseline 117. The new missing-lock materialization assertion first failed with ENOENT,
then passed after removing only the lock assumptions. Manifest token validation,
collision handling and rollback remain. The installed package verifier likewise
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
