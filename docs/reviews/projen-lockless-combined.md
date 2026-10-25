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

Further candidate, integration and maintenance results will be recorded below.
