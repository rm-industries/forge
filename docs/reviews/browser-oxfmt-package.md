# Browser Oxfmt package checkpoint

<!-- cspell:ignore bindgen -->

Tracking: [#345](https://github.com/rm-industries/forge/issues/345).

The installable `@rm-industries/browser-oxfmt@0.1.0` workspace uses maintained
wasm-bindgen 0.2.114 bindings around the shared native dispatch verified in
[#344](https://github.com/rm-industries/forge/issues/344). Precompiled assets,
source/toolchain identity, input hashes, and dependency licenses are included.
Consumer installation and website builds invoke no Rust tools.

## Local evidence

On macOS ARM64 with Node 26.9.0, the actual packed tarball was installed into
an isolated temporary consumer and tested in Chromium 155.0.8059.85 and WebKit
26.6. Each engine passed:

- 215 comparisons: 210 exact npm Oxfmt 0.72.0 matches and the five explicitly
  approved Tailwind sorting differences.
- 215 idempotence checks, positive native embed controls, unknown-language
  preservation, and version mismatch rejection.
- Worker reuse and continued UI timer progress during a large formatting job.
- Missing WASM and broken worker deployment errors, followed by successful
  recovery on the next request.
- Project-path URLs, an isolated Vite production build, optional cross-origin
  isolation, and a restrictive CSP permitting `wasm-unsafe-eval` without broad
  JavaScript `unsafe-eval`.

Firefox 155 failed before application startup with `Could not find profile
folder`. This reproduced with the cached browser, a fresh browser download,
canonical temporary paths, an explicit existing profile, and elevated launch
permission. The default test command still requires Firefox and fails when it
cannot launch; it does not silently skip that browser. The successful Linux run below supplies the required Firefox evidence.

The native build repeated from the fixed staging directory produced identical
asset hashes and identity JSON locally. The WASM contains no machine-local
`/Users`, `/private`, or `/home` paths. Cargo's local package identity affects
code layout across staging locations, so cross-host byte identity is not
claimed. CI rebuilds twice on its canonical Linux host, compares the results,
and tests the regenerated artifact. The Linux run below passed that remote gate.

The adjacent-release gate checks all 215 cases against npm Oxfmt 0.71.0 and
0.73.0, requires idempotence, and compares changed output hashes against the
committed reviewed report. These releases remain rejected by the public
runtime version contract.

## Linux packaged-artifact evidence

[Browser Oxfmt Package run 39551247357](https://github.com/rm-industries/forge/actions/runs/39551247357)
passed on October 21, 2026 at integration commit
`b515d7730fd0048c02d2ea6e2b64b8f46a3aadab`. The workflow rebuilt from pinned
upstream inputs twice, confirmed identical Linux assets, installed the actual
packed artifact into an isolated consumer, and ran the browser suite.

| Engine            | Tested version | Exact matches | Idempotent | Approved Tailwind differences |
| ----------------- | -------------- | ------------- | ---------- | ----------------------------- |
| Chromium          | 156.0.8078.4   | 210/215       | 215/215    | 5                             |
| Firefox           | 157.0          | 210/215       | 215/215    | 5                             |
| Playwright WebKit | 27.2           | 210/215       | 215/215    | 5                             |

All three engines also passed worker reuse, missing-asset and worker-failure
recovery, project-path deployment, optional isolation headers, restrictive CSP,
responsive UI timers, and the Vite production build. The adjacent-release checks
passed against the reviewed 0.71.0 and 0.73.0 reports.

Both Linux rebuilds produced WASM SHA-256
`7b3337736cbbd542c6096c87236e85d9b9549e80dd5b17d6c8542c2bc0d92b07`.
These are measured versions and observations, not oldest-browser guarantees.
Playwright WebKit does not establish actual macOS Safari or iPhone Safari
compatibility; those release gates remain open.

## Release boundaries

This is source, local packaging, and Linux CI evidence, not an npm publication or final
Safari/device readiness approval. The package documentation records the
supported asset layout, CSP, native option/language slice, Tailwind exception,
rebuild command, and reproducible test commands. Publication and final rollout
remain subject to the later release-readiness ticket.
