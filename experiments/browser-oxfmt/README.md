# Browser formatting feasibility

Issue #344 has a **GO with a documented Tailwind sorting limitation**, explicitly
approved by the maintainer. Native embedded formatting works. The pinned upstream
pure Rust build has no Tailwind sorter, so `sortTailwindcss: true` cannot be honored
for CSS code fences containing `@apply`. CSS formatting remains enabled. This
exception must be disclosed by the production integration; full Oxfmt policy
parity is not claimed.

## Evidence

The unmodified upstream formatter crates are pinned to Oxfmt 0.72.0, Oxc revision
`2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609`. The wrapper only maps options and
routes embedded requests through public native formatter APIs; it contains no
formatting algorithms. No Prettier dependency or remote formatter was added.

`results.json` records a real headless Chrome 155 run on macOS ARM64:

- 215 comparisons: the original 22 inputs and 21 additional inputs, each under
  the original four configurations and the actual Forge policy.
- Embedded formatting is `auto` throughout. YAML frontmatter and YAML, TypeScript,
  CSS, and nested Markdown fences have positive controls that change their input
  and match the npm API byte for byte.
- 210 exact matches and 215 idempotent outputs. All five differences are the
  CSS Tailwind diagnostic under five configurations, expected under the approved exception. Native import sorting is
  enabled through upstream `SortImportsOptions` and matches the API.
- Malformed YAML, malformed TypeScript, unclosed fences, BOM, Unicode, CRLF, and
  ignore directives are included. Unknown languages preserve their code content.
  Oxfmt itself trims trailing fence whitespace; preservation assertions allow
  that observed normalization and check interior spacing and Unicode exactly.
- The module is 2,917,867 bytes; gzip is 967,929 bytes. Initialization took 5.2 ms.
  Linear memory remained 5,570,560 bytes before and after 1,000 additional calls.
  These are single-run observations, not performance guarantees or a leak proof.

The browser receives the same source strings as the npm API. No rich-text editor
participates in this experiment, so editor serialization and normalization cannot
account for these results. This does not establish compatibility with editor save
hooks or prove their asynchronous/error behavior.

## Language inventory and limits

`inventory.json` records every labeled backtick/tilde fence declaration in Markdown
and MDX files under the default template, Forge project site, and adopting site.
It includes nested declarations; counts represent declarations rather than parsed
outer documents. Dependencies, build outputs, and Git metadata are excluded.

Native required languages are `ts`, `css`, `md`, `markdown`, and `yaml`.
The npm API preserves `sh`, `bash`, `python`, `text`, `plain`, `mermaid`, and
`astro`; browser preservation controls cover each. The inventory found no
additional required language. A synthetic CSS `@apply` case demonstrates the
policy gap even though existing inventoried files do not currently use it.

The adapter deliberately implements only this measured language and option
matrix. It is not a replacement for Oxfmt's complete dispatcher. JSON, GraphQL,
HTML, custom import groups, arbitrary options, and nested CSS-in-JavaScript are
outside this slice. Production must not assume those work.

The precise missing service is visible in upstream
`apps/oxfmt/src/core/embed/services.rs`: the pure build supplies
`tailwind_sorter: None`; the npm build binds the external JavaScript sorter.
`sortPackageJson` has no effect on the physical `article.md` input; all tested
`trailingComma` settings are `all`. The four historical configurations retain
their original widths, quotes, wrapping, and line endings.

## Reproduce

Use Node.js with the pinned `oxfmt` 0.72.0 npm API and Playwright with installed
Chrome. The measured toolchain was Rust 1.97.0 with the
`wasm32-unknown-unknown` target. Rust, Chrome, and Playwright are experiment
prerequisites, not new production dependencies.

```sh
sh experiments/browser-oxfmt/build.sh
OXFMT_MODULE="$PWD/node_modules/oxfmt/dist/index.js" \
PLAYWRIGHT_MODULE="/absolute/path/to/playwright/index.mjs" \
node experiments/browser-oxfmt/probe.mjs
node experiments/browser-oxfmt/inventory.mjs /absolute/path/to/adopting-site
```

The build fetches the pinned upstream archive and verifies its SHA-256 before
extracting it. Cargo uses the committed lockfile. `source`, generated WASM,
archives, and target directories are ignored. For a clean reproduction, start
without an existing `source` directory; an existing source directory is reused.
The tested source crates were compared against the verified archive with no
changes. Upstream's repository toolchain currently requests a newer compiler;
the explicit `+1.97.0` invocation records the compiler actually tested here.

`baseline.json` preserves the original inputs once each; historical expected
outputs with embedded formatting disabled are regenerated against the npm API
with embeds enabled. The probe records mismatches rather than hiding them and
exits nonzero if positive controls, idempotence, or preservation fail. A passing
probe means the recorded experiment ran successfully, **not** a claim of Tailwind sorting parity.

This repository contains the harness and evidence, not vendored upstream code or
binary distributions. Preserve upstream MIT and dependency license notices if
packaging the generated artifact later.
