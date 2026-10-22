# Browser formatter release readiness

Tracking: [#349](https://github.com/rm-industries/forge/issues/349), part of
[#342](https://github.com/rm-industries/forge/issues/342).

Status: **not ready for publication or existing-site adoption**. This record
separates source/tooling readiness from remaining release and device gates.
Neither `@rm-industries/browser-oxfmt@0.1.0` nor
`@rm-industries/content-model@1.1.9` has been published by this work.

## Evidence available

- The [package contract](../../packages/browser-oxfmt/README.md) and maintained
  browser suite cover front matter, embedded languages, idempotence, preservation,
  installed consumers, worker recovery, CSP and the approved Tailwind limitation.
- [Ubuntu native build and packed browser run](https://github.com/rm-industries/forge/actions/runs/39551247357)
  passed Chromium 156.0.8078.4, Firefox 157.0, and WebKit 27.2. Each produced
  210 exact comparisons of 215, five approved Tailwind differences, and 215
  idempotence checks. Local packaged evidence includes Chromium 155.0.8059.85
  and WebKit 26.6. These are measured tested versions, not inferred browser
  minimums or actual Safari support guarantees.
- [Sveltia compatibility](sveltia-0.250-compatibility.md) records the bound native
  serialization callback and recoverable failures against Sveltia `0.250.0`.
- [Configuration](browser-oxfmt-configuration.md) documents the build helper
  and installed-consumer checks. Uniform CMS policy rejects filename exclusions
  because Sveltia supplies no filename to its global callback. The temporary
  template overlay and its harness were removed by maintainer request; template
  adoption and renewed end-to-end save/recovery checks follow npm publication.
- Full repository quality at `237d9e6` passed formatting, lint, types, 223 tests,
  builds, and all three package dry runs. The two-axis review found no blocking
  standards violations; its configuration exclusion finding was reproduced,
  fixed, and verified with a regression test and reviewer recheck.
- Historical [Linux candidate verification](https://github.com/rm-industries/forge/actions/runs/39633224804)
  passed all 30 actual CMS save and recovery scenarios: Chromium 156.0.8078.4,
  Firefox 157.0, and WebKit 27.2, with zero failures. The same run passed
  native rebuild reproducibility, package contracts and
  isolated packed consumers.
- The final dependency audit still fails its high severity threshold:
  seven advisories (three low, three moderate, one high), including
  `GHSA-gfr2-rv44-r23c` in `markdown-it`. This is an existing release blocker.
- Release tooling prepares browser-oxfmt independently using
  `browser-oxfmt-v0.1.0`, immutable tarball identity, changelog, protected manual
  publication, npm provenance, and registry-integrity verification. Automatic
  publication remains limited to existing peer/template bot flows.
- Prepare-only workflows passed for
  [browser-oxfmt at `237d9e6`](https://github.com/rm-industries/forge/actions/runs/39633255903)
  and [content-model at `30e2649`](https://github.com/rm-industries/forge/actions/runs/39632936454).
  Both publish jobs were skipped. Downloaded plan, release, pack metadata and
  actual tarball hashes agree. The browser archive contains its worker, WASM,
  identity manifest, declarations, license and dependency notices. Browser
  tarball integrity is
  `sha512-fj+cxNeRFLYQl4OVHYGnkElcfviz2D488vcHuza3VEpSwvusOj5qsmdg7IPZvZ7YN/zkkSYFB6b6+hq/AGxDDg==`.
  The content-model package did not change between these source commits.

## Gates still required

| Gate                   | Evidence required before approval                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security               | Resolve or explicitly disposition the seven recorded advisories, including the high severity markdown-it advisory. The final audit failed; passing CI or a dry run does not clear this release gate.                          |
| Actual macOS Safari    | Real OS/browser version, candidate source/package identity, real CMS saves, repeated/large edits, errors/recovery, background/resume, measured timings and resource observations. Pending by maintainer request.              |
| Actual iPhone Safari   | Real device/iOS/browser version and the same save/recovery/background coverage. Pending; Playwright WebKit and iPhone viewport emulation do not count.                                                                        |
| Browser minimum policy | Record the oldest successfully tested actual supported environments and actual WASM/loading requirements before declaring minimum supported Safari/iPhone versions. Do not extrapolate from WebKit engine versions.           |
| Publication controls   | Maintainer approval, `npm-release` tag allowlist for browser-oxfmt, npm trusted publisher identity, reviewed immutable tag and later registry/provenance verification. No shared settings, tags, or publication changed here. |

The [package README](../../packages/browser-oxfmt/README.md) remains authoritative
for WASM/worker asset layout, CSP and configuration/language boundaries. The
identity manifest records engine/source/toolchain and asset hashes. Rebuild
verification is within each canonical host; cross-host identical WASM bytes are
not claimed. Reconcile resource/timing observations from the final artifact and
actual devices rather than treating desktop responsiveness as an iPhone budget.

## Maintainer handoff

Use [package release procedure](../package-releases.md) to repeat preparation
when release inputs change. Do not mark #349
complete until the missing audit, real-device, and release gates
have evidence. Once publication and registry verification are complete, follow
[ordered adoption and rollback](../browser-formatter-adoption.md). A project-site
adoption requires its standalone lockfile/build boundary to pass separately.

Native build ownership now lives under `packages/browser-oxfmt/native/` and
generated artifacts are excluded from Git. The prepare-only runs above precede
that build change; repeat release preparation for the final source before
publication. Rust formatting, Clippy and CodeQL are included in verification.
