<!-- cspell:ignore Unifont Miniflare -->

# Browser formatter release readiness

Tracking: [#349](https://github.com/rm-industries/forge/issues/349), part of
[#342](https://github.com/rm-industries/forge/issues/342).

Browser formatter **0.1.2 is published and registry-verified**. Template adoption
and the remaining browser evidence are separate from that publication. This
record does not close #349 or #342.

## Published artifact

The [0.1.2 release](https://github.com/rm-industries/forge/releases/tag/browser-oxfmt-v0.1.2)
was built from `58af0c66921402d9201cc676ad62e590023daed4` with native Oxfmt
`0.74.0`. The inspected release evidence includes:

- [Release preparation](https://github.com/rm-industries/forge/actions/runs/40100294472).
- [Native rebuild, packed browsers and Node runtime checks](https://github.com/rm-industries/forge/actions/runs/40100333736).
- [Protected publication](https://github.com/rm-industries/forge/actions/runs/40100715603).
- 57 package tests; Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2 each
  passed 210 exact comparisons and 215 idempotence checks, with five approved
  Tailwind differences. These are observed versions, not browser minimums or
  actual Safari certification.
- Native rebuild reproducibility, Rust formatting/Clippy, and minimum Node 22
  plus latest Node 22/24/26 checks passed. Cross-host identical WASM bytes are
  not claimed.
- Independent browser-test and release-preparation tarballs were byte-identical.
  Worker, WASM, declarations, notices and reviewed-source build-input hashes were
  checked. Published integrity and cryptographically verified provenance match
  the inspected digest, reviewed commit, tag, workflow and publication run.
  Registry signatures and attestations passed `npm audit signatures`.

The inspected tarball integrity is:

```text
sha512-tDvSsfhYRnDtEYFrmGSKjMP7N0cjiHpuyPGMOX4ycHBI7YFR7Usa4pWqHpyaXPWIrx+C8vfZ/IeEsCFN2cNWVQ==
```

## Publication exceptions and current security status

The maintainer explicitly waived actual macOS Safari and iPhone Safari device
checks for publishing **0.1.2 only**. Playwright WebKit was not substituted for
those checks, and the waiver establishes no Safari/iPhone minimum version.

The maintainer also approved a one-release disposition for the high severity
Undici advisory `GHSA-xjj6-f33q-929c` through Astro/Unifont and Wrangler/Miniflare.
Those dependencies are outside browser-oxfmt's declared runtime dependency graph,
which audited with zero vulnerabilities. The repository audit still fails its
high severity threshold; the global allowlist is unchanged. This disposition
must not be treated as approval for a later package release or site deployment.
The older unpublished 0.1.0 candidate and markdown-it audit record do not describe
this published artifact.

## Adoption and remaining evidence

Use the [ordered adoption and rollback guide](../browser-formatter-adoption.md)
for published browser-oxfmt `0.1.2`, Oxfmt `0.74.0`, content-model `1.1.10` and
Sveltia `0.251.0`. Package publication alone does not establish template or
existing-site integration. The [package contract](../../packages/browser-oxfmt/README.md)
remains authoritative for policy validation, language boundaries, lazy workers,
asset layout, CSP and the approved preservation of Tailwind class order.

The #348 integration uses `templates/default/scripts/sveltia-formatter.ts`,
its Astro configuration, and the admin page's native serialize-first callback.
The generated starter pins the published versions above. An isolated generated
installation completed `npm ci` without a Rust toolchain and passed
`quality:core`: formatting, lint, spelling, Knip, types, 100% coverage, build and
built-output validation. The isolated suite passed 45 tests across 17 files, with 100% statements,
branches, functions and lines in its configured coverage scope; development
HTTP asset handling was also checked. These checks do not deploy an existing site.

The implemented suite, `templates/default/tests/cms-formatting.spec.ts`, covers
CLI parity, lazy workers, CSP and MIME types, invalid policies, actual CMS
metadata/raw/rich-text saves, repeated and large edits, policy download/version/
configuration failures, module/worker/WASM load failures, and runtime traps.
It checks retained file bytes and unsaved body/metadata, then retry and reopen.
Local Chromium and WebKit runs passed 22 cases at the default base before the
final configuration/body assertions, then all 24 cases at `/forge/` (12 per
browser). A refined actual WASM-trap probe subsequently passed both focused
browser cases through the published worker's error/reset/retry path. These are
automated browser results, not actual Safari device evidence.

The implementation is commit `e9ce24e611df00bf1570a2c175e041eededa55f8`, integrated
at `322b286`. [Hosted template verification](https://github.com/rm-industries/forge/actions/runs/40115782703)
passed for that integration, including all five runtime jobs: minimum Node 22
and latest Node 22/24/26 on Ubuntu, plus latest Node 26 on macOS. Consumer source
quality, builds, customization, Lighthouse and browser checks passed.
The [browser job](https://github.com/rm-industries/forge/actions/runs/40115782703/job/120936849076)
passed all 159 tests with Chromium, Firefox and WebKit, including all 36 new CMS
cases (12 per browser), with no skips. This completes the current template's
automated CMS save/recovery gate.

Root validation passed 49 contract tests, type checks and packed CLI verification.
Generator end-to-end validation passed 11 isolated behavior fixtures and packed
consumer build validation. Existing-site deployment and actual-device checks
remain separate from these generated-consumer results.

Template dependency audits before and after adoption have identical advisory
objects: 26 findings, including 14 high and zero critical; production-only audit
reports zero. This is unchanged development-tooling debt, not a passing full
template audit or an extension of the package publication disposition.

The maintainer reports testing browser-oxfmt **0.1.1 on iOS 27**, and confirms
that macOS Safari was not tested. This is maintainer-attested iPhone validation
of the earlier formatter version; it does not establish actual-device coverage
for 0.1.2 or the current template candidate. Device model, site/build, detailed
scenarios, timings and resource measurements were not supplied.

| Remaining evidence                             | Current status                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Current template CMS saves and recovery        | Complete: hosted Chromium/Firefox/WebKit save and recovery cases passed; root and project-path local results are recorded above.                |
| Actual macOS Safari                            | No current actual-browser validation recorded. The publication-only waiver does not establish adoption coverage.                                |
| Actual iPhone details                          | Maintainer attests iOS 27 with 0.1.1; 0.1.2/current-candidate device coverage and detailed scenarios remain unverified.                         |
| Browser minimum policy                         | No new Safari/iPhone version floor declared. Establish it from actual tested environments and Forge policy.                                     |
| Device timings/resources and background/resume | No measurements or scenario-specific attestation recorded.                                                                                      |
| Existing-site deployment                       | Validate each site's own installation, lockfile, build, base path and CSP separately; root Forge checks do not establish project-site adoption. |

Keep #349 and #342 open for maintainer disposition of the remaining evidence.
Use the [package release procedure](../package-releases.md) for future releases;
0.1.2's publication evidence and exceptions are not blanket release approval.
