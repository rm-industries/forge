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

## Reproduce with the maintained package

These JSON files retain the historical feasibility observations, including the
original raw-ABI artifact's size and timings. They are not measurements of the
current packaged module. The obsolete raw-ABI build, client and probe have been
removed; the maintained package supersedes them.

The original inputs and configurations now live in the
[fixture matrix](../../../packages/browser-oxfmt/test/fixtures/cases.mjs).
The production formatter dispatcher lives directly in
[`packages/browser-oxfmt/wasm/src/formatter.rs`](../../../packages/browser-oxfmt/wasm/src/formatter.rs).
Use the package's verified native build and isolated packed-browser suite:

```sh
npm run build:wasm --workspace @rm-industries/browser-oxfmt
npm run test:browser --workspace @rm-industries/browser-oxfmt
```

See the [package checkpoint](../browser-oxfmt-package.md) for the pinned native
toolchain, browser prerequisites, asset identity and current CI evidence.
`inventory.json` remains a historical language inventory; its one-off scanner
has been removed. Rerun a fresh inventory before expanding the supported
language contract.
