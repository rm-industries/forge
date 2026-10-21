# Browser Oxfmt

Native Oxfmt 0.72.0 Markdown formatting in a reusable module worker. The package
ships precompiled WebAssembly and maintained wasm-bindgen bindings. Consumer
installation and website builds need no Rust toolchain.

```ts
import { format, engine } from '@rm-industries/browser-oxfmt';

const text = await format(source, 'article.md', {
  upstreamVersion: '0.72.0',
  options: {
    printWidth: 120,
    tabWidth: 2,
    singleQuote: true,
    proseWrap: 'always',
    endOfLine: 'lf',
    useTabs: false,
    embeddedLanguageFormatting: 'auto',
    sortImports: true,
    sortPackageJson: true,
    trailingComma: 'all',
  },
});
```

Pass resolved options from the consuming project's authoritative Oxfmt policy.
Mismatched versions and unsupported options reject. The measured filename
contract is `.md`; MDX and filename-specific policy resolution are outside this
package. Supported native embeds are YAML, JavaScript, TypeScript, CSS, and
nested Markdown. Unsupported languages and malformed embedded programs follow
native preservation behavior. Markdown parse failures reject.

**Approved limitation:** browser formatting preserves Tailwind class order.
Repository Oxfmt can still reorder those classes. The exported
`engine.capabilities.tailwindClassSorting` is `false`; omit `sortTailwindcss`
from browser options and disclose this difference in build diagnostics.

`format` returns `Promise<string>` and rejects with `BrowserOxfmtError`, whose
`code` is `input`, `configuration`, `parse`, `load`, `runtime`, or `worker`.
Keep the original source when handling errors. Failed worker/load/runtime
requests reject; the next call starts a fresh worker. No source is transmitted
to a formatting service.

Serve the complete `dist` directory together: the ESM entry, module worker,
bindings, and `.wasm` asset resolve relative to their modules and work under
project paths. Serve JavaScript with a JavaScript content type and WASM with
`application/wasm`. Workers require a same-origin deployment and a policy that
allows module workers and WebAssembly. Cross-origin isolation is optional;
shared memory is not required. The packed consumer is tested with this CSP:

```text
default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'
```

Broad JavaScript `unsafe-eval` is unnecessary. With cross-origin isolation,
serve the worker with matching `Cross-Origin-Embedder-Policy: require-corp`
headers as well as the document. A bundler must preserve or emit the worker and
relative WASM/bindings assets; copying only the entry module is insufficient.

## Maintainer checks

```sh
npm run build --workspace @rm-industries/browser-oxfmt
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs npm run test:browser --workspace @rm-industries/browser-oxfmt
```

The browser check installs the actual tarball in an isolated temporary consumer,
then runs all 215 feasibility comparisons and idempotence checks in Chromium,
Firefox, and WebKit. Five Tailwind differences per browser are required and
reported. It also checks project paths, ordinary and isolated deployment
headers, UI responsiveness, worker reuse, missing assets, and recovery after
worker failures. `CHROMIUM_CHANNEL=chrome` can select installed Chrome locally.

Engine upgrades must rerun this packed suite and the retained feasibility fixture matrix, compare
against the adjacent npm Oxfmt releases, review every changed output, and update
the versioned options contract. The committed `adjacent-results.json` records
reviewed output hashes against npm 0.71.0 and 0.73.0; CI compares both with all
215 cases and requires idempotence. Run the same gate with installed module
paths:

```sh
npm run test:adjacent --workspace @rm-industries/browser-oxfmt -- /path/0.71.0/dist/index.js /path/0.73.0/dist/index.js
```

Use the comparison script's `--record` flag only to prepare reviewed evidence
when intentionally updating the engine. Adjacent versions are rejected at runtime; a
successful build does not establish parity. The current supported engine is
only 0.72.0.

## Build from source

Published npm packages include the generated worker bindings, WASM and license
notices. Consumers need Node and npm; they do not need Rust. Git tracks only the
native source, Cargo lockfile and TypeScript tooling. Generated files under
`src/generated/`, the verified upstream source cache and `NOTICE.md` are ignored.

Building a fresh Git checkout requires Rust 1.97.0 with the
`wasm32-unknown-unknown` target and wasm-bindgen-cli 0.2.114:

```sh
rustup toolchain install 1.97.0 --profile minimal --component rustfmt --component clippy --target wasm32-unknown-unknown
cargo +1.97.0 install wasm-bindgen-cli --version 0.2.114 --locked
RUSTUP_TOOLCHAIN=1.97.0 npm run build --workspace @rm-industries/browser-oxfmt
```

`build` and `typecheck` generate missing or stale native output automatically.
An unchanged verified artifact is reused without invoking Rust. Native generation
verifies the pinned upstream archive before writing or extracting it, uses the
committed Cargo lock, remaps build paths, records source/toolchain/asset hashes,
and generates dependency notices. Packaging verifies those hashes before copying
artifacts to `dist/generated/`. Missing tools produce setup instructions.

```sh
npm run build:native --workspace @rm-industries/browser-oxfmt -- --force
npm run quality:native --workspace @rm-industries/browser-oxfmt
```

The first command forces regeneration. The second checks Rust formatting and
runs Clippy for the actual WASM target with warnings denied. CI generates twice
in one canonical checkout and compares identities and notices before testing the
packed artifact. Cross-host byte identity between macOS and Linux is not claimed;
Cargo's local package identity can affect code layout even with remapped paths.
The generated identity records its build host. Release artifacts are built in CI,
then passed unchanged to protected publication and registry verification.

## Derive browser settings during a build

Use the Node-only `@rm-industries/browser-oxfmt/build` entry point to derive
settings from the consumer's installed Oxfmt version, authoritative configuration,
and nearest `.editorconfig`. Import it from your build or server configuration;
import the regular package entry point from browser code.

```ts
import { resolveBrowserOptions } from '@rm-industries/browser-oxfmt/build';

const { resolvedOptions, diagnostics } = await resolveBrowserOptions({
  cwd: process.cwd(),
  filename: 'src/content/articles/example.md',
});

// Report these during the build; serialize only resolvedOptions for browser use.
for (const diagnostic of diagnostics) console.warn(diagnostic.message);
```

Pass `resolvedOptions` as the third argument to browser `format(source, filename,
resolvedOptions)`. Do not pass the diagnostic wrapper. No executable configuration,
filesystem paths, parser, or Node module is needed in the browser. The installed
consumer Oxfmt must match the browser engine exactly; version mismatches and
unsupported options fail with configuration errors.

The helper resolves one physical Markdown filename at a time. All matching
Oxfmt overrides apply in declaration order, excluding `excludeFiles`, relative
to the authoritative configuration directory. Fenced languages inherit the host
Markdown policy; TypeScript overrides are not selected for TypeScript fences.
Explicit Oxfmt settings take precedence over EditorConfig fallback, then engine
defaults. Root and template EditorConfig therefore supply width 120.

The supported build contract is deliberately bounded:

- Discover the nearest `oxfmt.config.{js,mjs,cjs,ts,mts,cts}` or `.oxfmtrc.json`
  from `cwd` upwards, or specify `configFile`. JSONC and Vite+ configuration
  are unsupported. Multiple configuration files require an explicit selection.
- Use plain object exports with the runtime's supported options. `overrides`
  may contain `files`, optional `excludeFiles`, and `options`. Override patterns
  accept relative literals, `*`, `?`, and whole `**` path segments; braces,
  character classes, extended globs, negation, parent traversal, and hidden-path targets
  with overrides fail rather than risk different matching semantics.
- Ignore patterns support literal relative paths and literal `directory/**`
  exclusions. An ignored target fails; more complex ignore syntax is rejected.
- Use the single nearest EditorConfig from `cwd`, matching Oxfmt's selection.
  Descendant EditorConfig/Oxfmt files on a target's ancestor path are rejected.
  EditorConfig supports numeric widths, space indentation, explicit line endings,
  `quote_type=single|double`, and a final newline. Tab-based EditorConfig,
  `unset`, unsupported selector syntax, and hidden targets with selectors fail. Configured `useTabs:true` works
  when `tabWidth` is explicit. Charset and whitespace properties unused by
  Oxfmt do not become browser options.
- The ESM root configuration module is re-imported on each call. Start a fresh
  Node build process when CommonJS configuration or imported configuration
  dependencies change; Node caches those modules. The helper performs no persistent option caching.

`sortTailwindcss:true` produces the structured diagnostic
`tailwind-class-order-preserved`. It is the approved exception: browser formatting
preserves class order while native CSS formatting stays enabled, and repository
Oxfmt may reorder classes. Custom Tailwind configuration objects are unsupported.

For a CMS serializer without filename or collection context, request
`requireUniformPolicy:true`. It rejects nonempty `ignorePatterns`, filename overrides, EditorConfig sections
other than `[*]`, and nested Oxfmt/EditorConfig files throughout `cwd`. Standard
dependency directories and root build output directories are excluded; other symbolic links fail
because their configuration cannot be proven uniform. Use a standalone project
root, not a monorepo containing multiple independently configured sites. This
mode must succeed before applying one resolved policy globally.
