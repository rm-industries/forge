# Package and independent consumer evidence

<!-- cspell:ignore rustc rustup -->

Evaluation for [368](https://github.com/rm-industries/forge/issues/368) and
[382](https://github.com/rm-industries/forge/issues/382), October 23, 2026.
All source comparisons use baseline `595a5e00d7e2fea04b26b54c7fb6bb7b6396f4e9`,
Node 26.9.0, npm 11.19.1, Darwin arm64, and externally installed `vite-plus@1.4.0`.
This extends the [baseline](tooling-baseline-380.md) and
[representative package proof](tooling-package-381.md). No production manifest,
lockfile, configuration, generated consumer tooling, or workflow changed.

## Remaining packages

In a clean source copy, install root dependencies from the committed lockfile.
For markdownlint-frontmatter and create-forge, execute each public command:

```sh
npm run typecheck --workspace @rm-industries/markdownlint-frontmatter
npm test --workspace @rm-industries/markdownlint-frontmatter
npm run build --workspace @rm-industries/markdownlint-frontmatter
npm pack --ignore-scripts --workspace @rm-industries/markdownlint-frontmatter
```

Repeat with create-forge. The candidate preserves those commands in temporary
`run.tasks` definitions with `cache: false`: types and source tests precede build;
pack depends on build. This avoids testing a bundled replacement compiler or test
runner. `--ignore-scripts` avoids repeating already executed prepack validation;
it does not remove the package's existing lifecycle hook.

Both packages passed source types, tests, builds, and packing through npm and the
candidate. The unpacked tarballs have equal file sets and SHA-256 for every file:

| Package                                            | Published files compared | Result         |
| -------------------------------------------------- | -----------------------: | -------------- |
| markdownlint-frontmatter                           |                        7 | Byte-identical |
| create-forge                                       |                       94 | Byte-identical |
| browser-oxfmt, using verified hosted native assets |                       20 | Byte-identical |

The CLI comparison includes its executable, declarations, CI pins, copied template,
dotfiles, and template lockfile. Both CLI paths also passed the existing installed
package verification. This compares meaningful contents rather than gzip timestamps.
No ordinary package source tests were moved into a tarball.

## Independent website and template roots

Copy website and raw template source into separate directories under an OS temporary
directory, outside the installed repository. Preserve their own package manifests
and lockfiles. The website copy needs the repository documentation at its expected
relative location, but not the repository's installation. Install each separately:

```sh
npm ci --no-audit --no-fund
npm run quality:static
npm run test:coverage
npm run build
npm run validate:build
```

From a second independently installed copy of each same source, run the corresponding
`vp run --no-cache quality:static`, `test:coverage`, `build`, and `validate:build`.
Run the commands sequentially so build validation consumes that copy's build.
The npm and candidate paths both passed static checks, coverage, build, and validation.
The website's 35 tests passed with its existing coverage requirements.

| Scope    | npm static / coverage / build / validation seconds | Candidate seconds              | Output comparison   |
| -------- | -------------------------------------------------- | ------------------------------ | ------------------- |
| Website  | 10.217 / 1.723 / 1.713 / 0.330                     | 11.195 / 1.715 / 1.768 / 0.305 | All 143 files equal |
| Template | 9.955 / 1.529 / 2.432 / 0.408                      | 10.093 / 1.460 / 2.396 / 0.364 | All 394 files equal |

These are single-run observations with warm npm downloads and uncontrolled host load,
not a speed claim. An initial website install suffered disk exhaustion despite npm
returning success; its resulting failed tests/build and timings were discarded.
The successful website baseline above was reinstalled and rerun after cleanup.

Astro resolved within each copy's own node_modules and was not a workspace symlink.
The template's published dependencies were installed from its own lockfile. An initial
probe requesting content-model's unexported package.json failed because the export map
correctly forbids that path; that failure is not evidence of a missing dependency.

For both sites, temporarily throw from site configuration and define an uncached
candidate validation task depending on an uncached build task. Both runs exited 1
at Astro build, and validation did not start, even with a previous dist directory
present. Restore source afterward. Dependency edges must be explicit; merely leaving
old output on disk must never authorize dependent validation.

## Native boundary and honest limits

Without generated assets, npm and `vp run --no-cache` both failed build:native,
quality:native, types, tests, and build at the real missing `rustc` prerequisite.
No successful native output or timing was inferred from those failures. A checksum
verified official `rustup` 1.28.2 installation was attempted with isolated temporary
Rust/Cargo homes for pinned Rust 1.97.0 and the WASM target. Extraction failed with
`No space left on device`. Only that experiment's partial installation was removed;
the user's existing toolchain was not modified.

To exercise the JavaScript/native artifact boundary without pretending to compile,
reuse the browser-oxfmt package from the successful baseline
[GitHub run 40034150274](https://github.com/rm-industries/forge/actions/runs/40034150274).
Its source revision is exactly the baseline above. Verify every recorded native input
hash against the scratch checkout before copying its generated engine assets and
NOTICE into that checkout. The existing build helper then validates generated assets
and notices before reusing them; no verification bypass was introduced.

With these verified assets, source types, all 57 browser-oxfmt source tests, build,
and npm pack passed under both npm and the uncached candidate graph. The candidate
requires successful types and tests before build, then build before pack. Every one
of the 20 packed files matched. Baseline types/tests/build/pack took
1.128 / 3.132 / 0.895 / 0.499 seconds; the candidate graph took 4.167 seconds.
This measures asset reuse and JavaScript packaging, not a native compilation speedup.
Its scratch dependency install used `--ignore-scripts --no-audit --no-fund` explicitly;
that is not a proposed contributor install policy.

The existing packed-browser check was attempted using already installed browser
binaries and failed when Chromium could not register its macOS Mach port
(`Permission denied`). It did not establish cross-engine candidate equivalence.
Successful pinned Rust compilation, native reproducibility, native cache invalidation,
and hosted candidate browser execution remain unverified. Existing baseline GitHub
success does not establish candidate provider behavior. These gaps prohibit an
adoption claim; the evaluation decision must account for them explicitly.
