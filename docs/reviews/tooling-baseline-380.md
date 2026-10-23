# Tooling evaluation baseline

<!-- cspell:words clippy typechecks bindgen BINDGEN rustc -->

Evidence for [spec 368](https://github.com/rm-industries/forge/issues/368) and
[ticket 380](https://github.com/rm-industries/forge/issues/380), collected October 23, 2026
from `595a5e00d7e2fea04b26b54c7fb6bb7b6396f4e9`. The shared evaluation limit is two focused
working days across all tickets. This records the existing contract, not adoption approval.

## Boundaries and command graph

[ADR 0003](../decisions/0003-npm-workspaces.md) defines root `packages/*` workspaces;
[ADR 0007](../decisions/0007-project-website.md) keeps the website independent.
The actual four workspaces are browser-oxfmt, content-model, create-forge, and
markdownlint-frontmatter. Root, `website/`, and `templates/default/` each own a
manifest and lockfile. Root installation cannot substitute for either consumer install.
No internal workspace dependency currently declares a build-before-build relationship.
Template content-model is a registry dependency, not the local workspace.

```text
root npm ci
  quality (serial &&, fail at first failure)
    browser-oxfmt quality:native (Rust formatting and clippy)
    format (one repository-wide Oxfmt scan)
    lint:repo (code → Markdown → spelling → documentation)
    typecheck (root and verification projects → workspace typechecks)
    test (root tests → workspace tests)
    build (workspace builds)
    pack (workspace dry-run packs, executing prepack)
      each prepack: typecheck → test → build

browser-oxfmt typecheck / test / build
  verify native inputs + generated hashes; build if absent/stale
  build: tsdown → verify and copy native assets into dist/generated

create-forge build
  tsdown → write pinned CI versions → copy standalone template into dist/template

website npm ci → own static/type/coverage → Astro build → build validation
  built dist → Playwright preview tests / Lighthouse

verify:template
  copy raw template to OS temporary directory → reject local dependencies/tokens
  isolated npm ci → own quality:core (static → coverage → build → validate)
  always remove temporary directory
```

Focused commands remain `npm run typecheck --workspace <name>`,
`npm test --workspace <name>`, and `npm run build --workspace <name>`.
Root tests split into `test:contracts` and `test:integration`; the latter intentionally
checks content-model/frontmatter integration outside either package's source tests.
Full local quality differs from CI scheduling: GitHub root checks are seven parallel
jobs, and ordinary package workflows run source types/tests independently of a single
build and `npm pack --dry-run --ignore-scripts --json` inspection. GitLab has equivalent
native project rules and independent jobs. Native reproducibility and packed consumers
remain specialized checks. A faster monolithic command is not evidence of equivalent CI.

## Outputs and owners

| Scope                    | Inputs and public outputs                                                                | Contract to preserve                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| content-model            | TypeScript → `dist/index`, `astro`, `sveltia` JS and declarations                        | Three export entry points, neutral platform, source unit tests and types                                                    |
| markdownlint-frontmatter | TypeScript → `dist/index.js`, declarations; CHANGELOG shipped                            | Markdownlint rule and peer contract; no local content-model production dependency                                           |
| create-forge             | Node ESM CLI `dist/index.mjs`, pinned CI metadata, `dist/template`                       | Executable metadata, help/version, normalized generated project, dotfiles and template lockfile; isolated packed CLI checks |
| browser-oxfmt            | Browser worker and index, Node `./build` entry, declarations, WASM and NOTICE            | Worker/bundler consumer behavior, generated hashes, upstream identity, notices, browser coverage                            |
| website                  | Own lock/config/content → `.astro`, `dist`, coverage and browser/Lighthouse reports      | Standalone registry resolution, accessibility, budgets, owned source and deployment artifact                                |
| template                 | Raw standalone project copied/prepared outside workspace → own `.astro`, `dist`, reports | Registry lock resolution, template defaults/customization, generated consumer quality                                       |

Ordinary package source tests do not move into tarballs. Compare publishable file sets,
export targets, declarations and meaningful contents; tarball hashes alone are insufficient.
create-forge's copied template and browser-oxfmt's worker/WASM have real packaging boundaries.
Existing `verify:package`, generator end-to-end, packed-browser and standalone-template
checks are reusable evidence rather than a reason to create another validation framework.

Native build pins Rust 1.97.0, wasm32-unknown-unknown, Cargo.lock and exact wasm-bindgen
matching Cargo.toml. `build-wasm.ts` records SHA-256 of five native inputs, generated
assets and NOTICE; it validates existing assets before avoiding a rebuild. `--check`
always invokes Rust formatting/clippy; `--force` deliberately regenerates. `WASM_BINDGEN`,
`CARGO_HOME`, `CARGO_TARGET_DIR`, platform, architecture and toolchain identity matter;
path remapping is part of reproducibility. A task runner must preserve these safeguards,
not equate an existing generated directory with valid output.

## Candidate command comparison

Verified against current primary Vite+ documentation on October 23, 2026. The candidate
used by subsequent experiments is pinned `vite-plus@1.4.0` outside production dependencies.

| Current command                            | Preserving candidate path                                              | Replacement still requires proof                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| format / lint:code                         | `vp run format` / `vp run lint:code`                                   | Built-in `vp fmt` / `vp lint` use candidate tool versions/configuration                                 |
| lint:markdown / spellcheck / docs:validate | `vp run <script>`                                                      | No demonstrated removal of these specialized tools                                                      |
| typecheck                                  | `vp run typecheck`                                                     | Built-in check type path requires enabled options; standalone tsc projects and Astro diagnostics remain |
| test / test:contracts                      | `vp run <script>`                                                      | Built-in `vp test` runs bundled Vitest, not the package script                                          |
| build                                      | `vp run build`                                                         | Built-in `vp build` is Vite; package library bundling is `vp pack`; Astro build must remain explicit    |
| quality                                    | `vp run quality`                                                       | Existing serial shell stays serial unless tasks are decomposed and dependencies modeled                 |
| npm pack                                   | Retain npm pack and lifecycle/ignore-scripts choice                    | Built-in `vp pack` is tsdown library compilation, not npm tarball production                            |
| native / packed consumers                  | `vp run` existing scripts                                              | Explicit prerequisite, outputs, environment and failure behavior required                               |
| website / template                         | Run own scripts from independent roots, or explicit root wrapper tasks | Must not enroll either consumer as a root workspace or alter generated tooling                          |

[Run documentation](https://viteplus.dev/guide/run) distinguishes built-ins from scripts;
scripts are uncached by default, while dependency-aware tasks and opt-in caching are available.
[Check documentation](https://viteplus.dev/guide/check) describes combined formatting,
linting and optional type checks; it does not establish equivalence for our complete quality gate.
[Pack documentation](https://viteplus.dev/guide/pack) identifies tsdown compilation and
its configuration surface. Renaming commands does not remove their maintenance responsibilities.

## Measurement method and representative workflow

Host: Darwin arm64, Node 26.9.0, npm 11.19.1 (manifest requests npm 11.19.0), zsh.
Fresh isolated checkout; locked root `npm ci --cache /tmp/forge-368/npm-cache` took
10.732 seconds and passed. Cache directory was new for this experiment. Installs include
normal lifecycle and audit behavior; no remote service or new candidate dependency was
added to this checkout. Commands were sequential, measured with Python monotonic wall time,
with output redirected to scratch logs. First/repeat means first task execution and an
unchanged second invocation in the same installation, not two cold machines. Filesystem/OS
cache is uncontrolled; builds may retain generated outputs on repeat. These are observations,
not a statistically significant speed comparison. Shared host load can affect timings.

| Command (workspace names abbreviated)      | First seconds | Repeat seconds | Result                   |
| ------------------------------------------ | ------------: | -------------: | ------------------------ |
| content-model typecheck                    |         0.757 |          0.463 | Pass                     |
| content-model test                         |         0.996 |          0.680 | 32 tests pass            |
| content-model build                        |         0.624 |          0.521 | Pass                     |
| content-model pack dry-run, ignore scripts |         0.329 |          0.285 | Pass                     |
| markdownlint-frontmatter typecheck         |         0.340 |          0.337 | Pass                     |
| markdownlint-frontmatter test              |         0.743 |          0.732 | 27 tests pass            |
| markdownlint-frontmatter build             |         0.444 |          0.446 | Pass                     |
| root test:contracts                        |         1.069 |          0.964 | Pass                     |
| create-forge typecheck                     |         1.312 |          1.227 | Pass                     |
| create-forge test                          |         4.312 |          4.343 | 117 tests pass           |
| create-forge build                         |         0.833 |          0.826 | Pass                     |
| browser-oxfmt build:native                 |         0.338 |          0.340 | Fails: rustc unavailable |

Standalone installs also passed: website 5.795 seconds and template 5.508 seconds, using
the already populated task npm cache. First/repeat Astro builds passed: website
5.889/1.819 seconds; template 3.794/2.489 seconds. These ran in their separate project
roots with their own lockfiles and node_modules; first builds had no dist or .astro outputs.
Repeat builds retained those outputs. Installation and source/output state therefore differ
from the root fresh-cache install, and should not be compared as equal cold installs.

No successful full-quality or native build timing can be inferred from these measurements.
The representative first comparison is content-model types → source tests → build → npm
pack inspection. Capture file list, package metadata/exports and built-file hashes. Extend
with markdownlint-frontmatter, CLI copied-template output, native identity/assets and standalone
consumer installs. Keep npm commands as the clean reference for each candidate output.

For downstream tickets, compare fresh task/cache state, unchanged repeat, then source,
root lockfile, configuration, environment, toolchain and native changes one at a time.
Compare reused output with a clean execution after each mutation. Include deleted outputs,
a failed prerequisite, relevant/unrelated changed-project selection and two tasks writing
the same output. Avoid scheduling a nested root quality script alongside its child tasks.
Record task command, revision, dependency install state, cache state, exit, time and artifact
contents; a cache-hit message alone does not prove correctness.

## Maintenance accounting and stop conditions

Existing responsibilities include three lockfiles/install roots, root static-tool configs,
four package manifests/tsdown configs, source-specific TypeScript/Vitest configs, native input
and asset identity logic, template/CLI copying and pinning, consumer probes, and provider jobs,
matrices, path rules, permissions and artifact transfers. Native helper reuse already exists;
CI already parallelizes independent root checks and shares meaningful build artifacts.

Concrete remaining gaps: local aggregate shell is serial; npm workspace iteration is not an
explicit prerequisite graph; aggregate `pack` repeats validation through prepack after quality
already validated; generic task-result caching and local changed-project selection are absent.
These observations do not establish that another runner reduces total maintenance. Preserve
prepack safety for direct package users even if an aggregate avoids duplicate work.

Count tasks/configuration introduced, tool/version coordination, output declarations, invalidation
rules, cache storage/trust/cleanup and CI diagnostics against any removed shell or prerequisites.
No Nx, Turborepo, remote cache, credentials, release changes or generated-project tooling are
needed to establish this baseline. At the deadline, missing native/provider evidence remains
missing; retaining npm is the default unless equivalent behavior and a real maintenance reduction
are demonstrated. Candidate correctness, artifact equivalence, CI trust and adoption decision
belong to subsequent tickets rather than this baseline.
