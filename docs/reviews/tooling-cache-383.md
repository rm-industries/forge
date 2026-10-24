# Task selection, caching, and CI evaluation

Evidence for [368](https://github.com/rm-industries/forge/issues/368) and
[383](https://github.com/rm-industries/forge/issues/383), collected October 23, 2026.
The source snapshot is `595a5e00d7e2fea04b26b54c7fb6bb7b6396f4e9` with a fresh,
locked root installation in an isolated checkout. Candidate: vite-plus 1.4.0;
macOS arm64, Node 26.9.0, npm 11.19.1. Node 24.22.1 was installed separately in
temporary storage for a genuine runtime switch. Production configuration stayed unchanged.

## Existing scripts and runtime identity

The public commands under test were content-model typecheck and build:

```sh
vp run --cache --filter @rm-industries/content-model typecheck
vp run --cache --filter @rm-industries/content-model build
```

| Probe                                          | Seconds | Outcome                          |
| ---------------------------------------------- | ------: | -------------------------------- |
| Typecheck, empty task cache                    |   0.918 | Executed, passed                 |
| Typecheck, unchanged repeat                    |   0.141 | Cache hit                        |
| Typecheck, PATH changed to actual Node 24.22.1 |   0.076 | Cache hit                        |
| Build, first execution                         |   0.724 | Executed, passed                 |
| Build, unchanged repeat                        |   0.148 | Cache hit                        |
| Build, dist deleted                            |   0.503 | Cache miss, rebuilt successfully |

The runtime switch proves that this invocation did not automatically partition
cached results by Node version. Both runtimes accept the source, so this does not
prove an incorrect diagnostic was returned. It does prevent treating an unqualified
cache hit as proof that the command ran on every supported runtime.
The pinned task-runner source represents programs outside the workspace by name;
see [cache metadata](https://github.com/voidzero-dev/vite-task/blob/a3c087a771a116f7c60220fc72738703eb45ac2e/crates/vt_plan/src/cache_metadata.rs).

## Explicit inputs and output ownership

A temporary root configuration made relevant ownership explicit:

```ts
export default {
  run: {
    tasks: {
      'poc:build-cached': {
        command: 'npm run build --workspace @rm-industries/content-model',
        cache: {
          env: ['FORGE_NODE_VERSION', 'NODE_ENV'],
          input: [
            { auto: true },
            { pattern: 'package-lock.json', base: 'workspace' },
            '!packages/content-model/dist/**',
          ],
          output: ['packages/content-model/dist/**'],
        },
      },
    },
  },
};
```

Set FORGE_NODE_VERSION from the actual selected Node executable before invoking
the task. A declared value that does not match the executable provides no protection.
The lockfile entry conservatively invalidates root-dependent tasks; it does not
replace npm ci when dependencies change. Source, configuration, and dependency files
actually read by commands remain covered by automatic tracking.

| Probe                                         |       Seconds | Observed result                                       |
| --------------------------------------------- | ------------: | ----------------------------------------------------- |
| Explicit task, cold / unchanged               | 0.838 / 0.141 | Execute / hit                                         |
| Delete all dist files                         |         0.158 | Hit, all 12 files restored with identical SHA-256     |
| Append source comment                         |         0.696 | Miss; output equals clean execution of changed source |
| Append lockfile newline                       |         0.688 | Miss; output equals clean execution                   |
| Append tsdown configuration comment           |         0.703 | Miss; output equals clean execution                   |
| Change tracked NODE_ENV                       |         0.689 | Miss, successful rerun                                |
| Select actual Node 24 and its tracked version |         0.516 | Miss, successful rerun                                |
| Throw from real tsdown configuration, twice   | 0.551 / 0.552 | Both exit 1; neither failure cached                   |

Clean comparisons used `vp run --no-cache poc:build-cached` and compared every
built file by path and SHA-256. Source and configuration mutations were restored
in finally blocks. Lockfile formatting, rather than an installed dependency version,
was changed: this establishes the declared input rule, not fresh dependency-resolution
compatibility. Environment/runtime probes establish rerunning, not equivalence for
all possible environment-dependent outputs. Timings are individual observations,
not controlled repeated benchmarks.

An explicit shared-producer graph also passed: two independent consumers (existing
npm pack dry-run and source typecheck) both depended on one build task. With a
concurrency limit of two, the graph executed the real build exactly once and both
consumers passed in 1.359 seconds. This establishes reuse of a declared prerequisite,
not automatic detection of arbitrary tasks writing the same directory. Avoid parallel
writers to dist, generated WASM, coverage, or shared report paths; declare one owner
and explicit consumers. Root quality scans already have separate ownership in
[the package experiment](tooling-package-381.md).

## Selection and independent roots

Name and path filtering can select existing npm workspace members. Neither the
installed CLI help nor the pinned
[filter parser](https://github.com/voidzero-dev/vite-task/blob/a3c087a771a116f7c60220fc72738703eb45ac2e/crates/vt_workspace/src/package_filter.rs)
provides Git revision based changed-project selection. Actual commands:

```sh
vp run --filter '[origin/main]' --fail-if-no-match typecheck
vp run --filter ./website --fail-if-no-match build
```

Both exited 1 with no matching packages. The website is intentionally excluded
from the npm workspace, so this is an ownership boundary, not a discovery bug.
A cold-cache changed-only pipeline still needs provider-native path rules or another
selector. Recreating the recently removed custom CI impact layer would add maintenance.
Cache hits skip previously completed work; they are not cold-cache change selection.
Always use --fail-if-no-match where an empty selection should be an error.

## Built-in commands are a separate migration

Bare vp check did not preserve formatting settings without a Vite+ configuration.
A temporary configuration importing the existing formatter config as fmt and linter
config as lint passed: 351 formatted files and 240 linted files. The pinned candidate
was temporarily linked into node_modules for configuration resolution, then removed.
Crucially, vp fmt and vp lint reported the existing locally resolved versions
0.72.0 and 1.88.0. This does not prove replacement with bundled tools.

The installed vite-plus 1.4.0 package declares Oxfmt 0.74.0, Oxlint 1.89.0 and
Vitest 5.0.5 among its dependencies. Eliminating Forge's separate dependencies would
require a distinct replacement/parity experiment, including its pinned native Oxfmt
engine. The mapped check did not configure or exercise all standalone TypeScript
projects, Markdown lint, spelling, documentation, Astro diagnostics, or Rust checks.
No configuration consolidation or equivalent removal of tools was demonstrated.

## CI and remaining evidence

[Official caching guidance](https://viteplus.dev/guide/github-actions-cache) labels
cross-run GitHub task caching experimental. Its cache directory is
node_modules/.vite/task-cache, restored after dependency installation. Cache transfer,
storage growth, OS/architecture/runtime/toolchain separation, output ownership,
and protection from untrusted writers become operating responsibilities.
The experiment used local disk only: no remote cache service, credentials, or CI
permissions were introduced.

The same runner commands can be invoked by a shell in CI, but no hosted candidate
workflow or cache trust configuration was executed. Baseline GitHub checks and local
experiments are different evidence. A future trial must preserve protected cache
writers, prevent untrusted contributions from poisoning privileged results, retain
GitLab protected/unprotected separation, and keep publication/deployment side effects
uncached. Provider cache transfer cost remains unmeasured.

[Native boundary evidence](tooling-boundaries-382.md) records successful reuse of
verified hosted assets and actual prerequisite failures. Fresh native compilation,
Rust/toolchain/input cache invalidation, native reproducibility under candidate
orchestration, and successful cross-engine candidate browser checks remain unverified.
No amount of JavaScript cache-hit evidence closes those gaps. No Nx, Turborepo,
remote caching, or custom changed-project framework was introduced to compensate.
