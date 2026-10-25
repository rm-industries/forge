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

For the recorded npm matrix, set NPM_CLI to this directory's
`node_modules/npm10/bin/npm-cli.js` and then `node_modules/npm11/bin/npm-cli.js`,
running each once with strict peers and once without. Run
`node --test projen-policy.test.mjs` to reproduce the specialized Dependabot
component's policy mismatch. It synthesizes only into its own temporary directory.

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
