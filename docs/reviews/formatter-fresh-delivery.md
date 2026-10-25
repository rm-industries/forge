# Fresh formatter dependency delivery

<!-- cspell:ignore projen -->

The delivered template declares browser-oxfmt `^0.1.2` and Oxfmt
`>=0.74.0 <1.0.0`. The earlier combined experiment kept both formatter
consumer declarations exact; its results are prior art, not proof of this expansion.

Each browser package still owns an exact optional Oxfmt peer. Optional means the
CLI need not be installed for standalone browser use; an explicitly installed CLI
must satisfy that peer. The package's installed-engine equality check, supported
options, asset identity and embedded engine are unchanged. The consumer lock
verifier checks both declarations and exact peer equality. The delivered browser
suite derives its expected engine from the installed CLI package and checks the
deployed browser engine against it, rather than assuming every permitted patch
will embed Oxfmt 0.74.0 forever.

## Evidence

The packed public CLI was installed outside the authoring workspace and created a
fresh consumer with real published packages, without package overlays or a reused
consumer lock. The selected pair was browser-oxfmt 0.1.2 and Oxfmt 0.74.0.
The browser engine reported source commit
`07ed78f4abde4020ca7919381ffea4da8616b78a` and WASM SHA-256
`e250e6ba4599ecdfb9d092164ec6f01f2725a787d1482b32b10c659aee042355`.
The installed published package also rejected a deliberately mismatched installed
CLI version through its public build API.

The packed CLI assertion first failed on exact consumer formatter declarations;
the lock contract first failed because a mismatched CLI engine was accepted.
After the changes, the focused lock tests cover exact peer rejection, a later
paired browser patch with a different exact engine, and exclusion of browser 0.2.
The existing packed CLI suite checks 13 generator scenarios, consumer core quality
and unchanged lock replay. Package verification, root/generator typing and focused
peer-upgrade tests also pass.

The real consumer's `quality:core` passed. Its delivered CMS formatter suite checks
actual CLI/browser output parity, article and embedded-language formatting,
idempotence, configuration rejection, metadata/raw/rich saves, persistence and
retry after policy/module/worker/WASM failures. Browser results and final
integration checks are recorded with the implementation handoff.

The separate `formatter-peer-resolution.test.mjs` uses the existing localhost
registry and real synthetic tarballs. Seven cases characterize compatible exact
peers, absent/explicit optional peers, a later allowed patch, exclusion of 0.2,
no-backtracking failure, behavior-breaking output and a corrected packed fixture
generator. They pass on Node 22.22.2, 24.22.1 and 26.9.0 with npm 10.9.4 and
11.19.1, both default and strict peer handling. These fixtures do not replace the
real browser/CMS evidence. Run them with:

```sh
node --test docs/reviews/fixtures/projen-lockless/formatter-peer-resolution.test.mjs
```

## Limits and correction

A browser 0.2 release is outside `^0.1.2` and requires a reviewed consumer range
change. A newer permitted patch can require its own exact tested engine inside
the Oxfmt range. npm may reject a newer package instead of backtracking; force or
legacy peer bypasses are not supported. Matching peers alone do not prove behavior.

A reviewed corrective generator release may temporarily pin a tested working pair.
It cannot repair metadata in an already published generator or alter existing
projects and their locks. No package publication, native formatter rebuild or Rust
installation was performed for this declaration change. Release audit requirements
remain unchanged; a successful install is not a security waiver.
