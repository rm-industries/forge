# Projen and fresh-resolution experiment fixtures

<!-- cspell:ignore Projen ERESOLVE -->

These are isolated evaluation tools, not production CI or consumer dependencies.
See the [evidence report](../../projen-lockless-combined.md) and
[approved design](../../../superpowers/specs/2026-10-25-projen-lockless-experiment-design.md).

Install the pinned fixture tools with `npm ci --ignore-scripts --workspaces=false`
in this directory. This lock belongs only to the private experiment package.

## Controlled npm peer resolution

Run `node --test peer-resolution.test.mjs` from this directory. Each test starts a
localhost-only registry, builds small real tarballs, resolves into a fresh temporary
consumer, and removes its own files/server afterward. Nothing is published publicly.

Set `NPM_CLI` to an absolute npm CLI JavaScript path to choose a version, and
`FORGE_PEER_STRICT=true` to exercise strict peer handling. Default is npm on PATH
and non-strict mode. No force, legacy peer handling or existing consumer lock is used.

The multiple-model test deliberately expects ERESOLVE: npm does not guarantee
backtracking to every older compatible model version. All other assertions exercise
the selected lock entries, absence of optional peers or a concrete conflict.

For the recorded npm matrix, create a separate temporary tooling directory and run
`npm install --ignore-scripts --no-audit --no-fund npm10@npm:npm@10.9.4 npm11@npm:npm@11.19.1`
there. Set NPM_CLI to its absolute `node_modules/npm10/bin/npm-cli.js` and then
`node_modules/npm11/bin/npm-cli.js`, running each once with strict peers and once without.
These pinned npm executables have known bundled dependency audit findings; use only for this
controlled localhost experiment, not as general-purpose package managers. They are excluded
from the committed fixture dependency graph, which audits clean. Run
`node --test projen-policy.test.mjs` to reproduce the specialized Dependabot
component's policy mismatch. It synthesizes only into its own temporary directory.

Repeat the peer command under the supported Node executables for the runtime matrix.
The two correction cases install and invoke old/corrected packed fixture generators;
they deliberately use a synthetic public behavior assertion, not the real CMS.

Set `FORGE_CLI_EXE` to the absolute installed candidate CLI JavaScript entry and run
`node --test recovery.test.mjs` for actual network-failure and SIGINT recovery.
Those integration cases are explicitly skipped if the entry is not supplied.

## Candidate reproduction

Export commit `adde4f1392a4911f1c73e9091a5f882f02cc9f80` into a new temporary source
directory using git archive. Install its authoring dependencies there with
`npm ci --ignore-scripts`; do not link those dependencies into a generated consumer.

Build with `npm run build --workspace @rm-industries/create-forge`, then
`npm pack --ignore-scripts --workspace @rm-industries/create-forge` to capture the
baseline tarball. Apply `lockless.patch` from this directory with `patch -p1`
inside the temporary source tree, then build/pack again for the exact-pin control.
Apply `ranges.patch` and repeat for the ranged candidate. Save each tarball under
a distinct filename before the next pack, since package identity is deliberately unchanged.

Only experimental source copies receive these patches. The packaging/materialization
changes omit the delivered lock; the other changes adapt snapshot-specific checks.
The end-to-end driver also deletes already-verified fixture installations before
creating the next large installation, bounding temporary disk use without skipping checks.

Run `npm test --workspace @rm-industries/create-forge` and
`npm run verify:package --workspace @rm-industries/create-forge` in the patched source.
Use `FORGE_CLI_TARBALL=/absolute/candidate.tgz npm run test:generator:e2e` for each
artifact. The package verifier applies to lockless candidates; use the unpatched
verifier for the locked baseline.

Install each tarball into a separate runner directory with npm install and invoke
its installed create-forge executable outside the source/workspace. Ordinary
no-install output has no lock: npm install must create one before npm ci can replay
it. Cloudflare retains its existing networked lockfile-only preflight.

The Projen gate is recorded separately in the report. No cosmetic synthesis adapter
or third Projen tarball is retained if no maintained policy/writer can be removed.

## Hosted rehearsal

Apply `hosted.patch` only on an isolated experimental branch after the candidate
patches. It temporarily replaces the existing Create Forge workflow that supports manual dispatch
workflow with a read-only packaging/consumer matrix. Dispatch create-forge.yml
against that branch; do not merge it. The evidence PR contains only patch files,
fixtures and reports, not active production workflow changes.

The hosted audit step captures the failing audit JSON as an observation; workflow
success does not imply a clean audit. No audit allowlist or severity threshold changes.
