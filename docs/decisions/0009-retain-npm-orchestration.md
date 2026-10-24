# 0009: Retain npm orchestration after the Vite+ evaluation

- Status: Proposed
- Date: 2026-10-23
- Roadmap: [368](https://github.com/rm-industries/forge/issues/368)

## Context

Forge evaluated vite-plus 1.4.0 and its Vite Task runner against npm at revision
595a5e00d7e2fea04b26b54c7fb6bb7b6396f4e9. Maintenance reduction was the primary
criterion; a faster command alone was insufficient. The scope authorized a bounded
experiment, not production adoption. The evaluation ends with a recommendation
within the shared two focused working day limit; that limit was not exhausted.

## Decision

Retain the existing npm scripts, workspace boundaries, specialized tools, and
provider-native CI selection. Do not adopt Vite+ or add another task runner on
this evidence. This proposed record awaits maintainer review through the PR;
it does not supersede [ADR 0003](0003-npm-workspaces.md) or
[ADR 0007](0007-project-website.md), and introduces no rollout.

Vite Task successfully scheduled explicit prerequisites and parallel work, cached
selected commands, and restored declared outputs. Public npm commands remained
usable, and measured package/site artifacts matched. Those capabilities are useful,
but the trial retained the existing tools and configuration. No material ongoing
responsibility was demonstrated to disappear.

| Responsibility                               | Current npm baseline                         | Candidate preserving tested behavior                                   |
| -------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Package commands and prepack safety          | Four package manifests                       | Retained                                                               |
| Formatting, lint, types, tests and builds    | Existing specialized tools/configs           | Retained; bundled replacement equivalence not established              |
| Website/template isolation                   | Two separate consumer installs and lockfiles | Retained; explicit invocation still needed                             |
| Native identity, reproducibility and notices | Existing pinned helper and toolchain         | Retained; generic task caching cannot replace validation               |
| Independent project CI selection             | Native provider rules                        | Retained; no demonstrated Git change selector                          |
| Local task graph                             | Serial aggregate scripts                     | Explicit task definitions introduced for scheduling                    |
| Cross-command cached results                 | No generic task cache                        | Cache input/output/environment ownership introduced                    |
| Runtime and CI cache trust                   | Existing runtime lanes and artifact handoffs | Additional cache partition, writer, transfer and cleanup policy needed |

The representative uncached package graph took 1.701 seconds against a 1.975-second
serial npm observation; a repeat took 1.693 seconds. Cache-enabled typecheck repeats
fell from 0.918 to 0.141 seconds. These are exploratory observations, not statistically
controlled repository/CI speedups. They do not establish reduced maintenance.
CI already parallelizes independent root quality jobs and shares selected artifacts.

## Evidence and limits

- [Baseline and command map](../reviews/tooling-baseline-380.md): four packages,
  independent install roots, existing prerequisites, outputs, repeated work and timings.
- [Representative package](../reviews/tooling-package-381.md): all 15 packed files
  equal, installed consumer runtime/declarations pass, real build failure blocks pack.
- [Remaining boundaries](../reviews/tooling-boundaries-382.md): package outputs equal,
  isolated website/template validation and all 143/394 built files equal; 57 native
  package source tests and packaging pass using verified baseline hosted WASM assets.
- [Selection and cache evidence](../reviews/tooling-cache-383.md): explicit ownership,
  invalidation, output restoration, failed-task reruns, runtime switch and shared producer.

Fresh pinned Rust compilation could not be completed locally: the existing toolchain
was unavailable and the isolated installation exhausted available disk. Reusing a
verified baseline native artifact does not prove candidate compilation or native cache
invalidation. A packed browser attempt failed at macOS Chromium process permissions.
Candidate cross-engine execution, hosted provider behavior/cache trust, dependency
version-change experiments, and full bundled-tool replacement remain unverified.
Equivalent behavior and safeguards therefore have not been demonstrated in full.
These limitations strengthen the decision to retain the baseline; they are not claims
that those capabilities are impossible with Vite+.

## Consequences and reconsideration

No production migration, shared repository settings, generated consumer tooling,
package-manager change, release-tool choice, publication, or template lockfile policy
change is authorized by this decision. Prototype configurations and installations
remain disposable experimental state, not a new supported interface. No migration,
CI rollout, cleanup, or rollback tickets are needed because adoption is not recommended.
The existing scripts remain the contributor and CI contract.

Reconsider only against a concrete maintenance problem with measurable responsibilities
removed, rather than command renaming or another orchestration layer. A future limited
trial would need a runner with sufficient native build storage, pinned native/toolchain
invalidation and reproducibility proof, provider/cache trust measurements, cross-engine
checks, and a replacement plan that removes existing responsibilities. Budget roughly
one additional focused working day plus hosted native build time for those missing
proofs, excluding a broader bundled-tool migration. This is an estimate, not a request
to extend or permission to resume the experiment. No extension is needed to recommend
retaining npm now. Nx, Turborepo, remote caching, and release/template evaluations remain
outside this decision.
