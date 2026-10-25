# Projen and fresh-resolution experiment fixtures

<!-- cspell:ignore Projen ERESOLVE -->

These are isolated evaluation tools, not production CI or consumer dependencies.
See the [evidence report](../../projen-lockless-combined.md) and
[approved design](../../../superpowers/specs/2026-10-25-projen-lockless-experiment-design.md).

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
