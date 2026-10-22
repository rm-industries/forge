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
then runs all 215 supported-version comparisons and idempotence checks in Chromium,
Firefox, and WebKit. Five Tailwind differences per browser are required and
reported. It also checks project paths, ordinary and isolated deployment
headers, UI responsiveness, worker reuse, missing assets, and recovery after
worker failures. `CHROMIUM_CHANNEL=chrome` can select installed Chrome locally.

Each browser-oxfmt release targets one exact Oxfmt version and source revision.
The build helper rejects a consumer Oxfmt version that differs from that engine,
preventing the browser and repository formatter from silently following different
policies. The pin is updated as part of a new browser-oxfmt release.

An Oxfmt upgrade requires a coordinated PR:

1. Update the root npm Oxfmt dependency and the Rust Git revision together.
2. Update the engine identity, version checks, option mapping and tests for that release.
3. Regenerate native artifacts and run parity against the newly supported npm
   version, plus idempotence, browser loading, recovery and CMS save tests.
4. Review output changes, increment browser-oxfmt's package version, update its
   changelog and use the protected package release workflow.

During an upgrade, compare the old and proposed engines using the maintained
`test/markdown-cases.ts` matrix. CI verifies the selected supported version;
unsupported neighboring releases do not have permanent fixtures or snapshots.
The weekly **Browser Oxfmt Engine Updates** workflow (also available manually)
resolves the registry release to its upstream Git tag, updates coordinated pins,
regenerates both lockfiles, and prepares a browser package patch and changelog.
It opens a PR only after repository quality, packed browser parity and CMS
serialization checks pass. Existing update branches are preserved for review.
It reuses `PEER_UPGRADE_APP_CLIENT_ID` and `PEER_UPGRADE_APP_PRIVATE_KEY`.
Review supported options and formatting changes before merging; publication
continues through the protected release process. Dependabot handles other npm
and Cargo dependencies. Failed engine checks require maintainer intervention.

`test/sveltia-serialization.ts` verifies the native CMS serialization contract.
The temporary template overlay and its integration harness have been removed.
Default-template adoption follows package publication in a separate reviewed
change; end-to-end CMS save and recovery coverage must be restored with that wiring.

`native/build-wasm.ts` compiles the Rust adapter, generates browser bindings and
license notices, and verifies cached output. It derives the engine version from
Cargo's release tag and the exact source commit from Cargo metadata. The Node
configuration helper is implemented in `src/resolve-options.ts` and remains
available to consumers at `@rm-industries/browser-oxfmt/build`.

## Build from source

Published npm packages include the generated worker bindings, WASM and license
notices. Consumers need Node and npm; they do not need Rust. Git tracks only the
native source, Cargo lockfile and TypeScript tooling. Generated files under
`src/generated/`, `NOTICE.md` are ignored.

Building a fresh Git checkout requires Rust 1.97.0 with the
`wasm32-unknown-unknown` target and wasm-bindgen-cli 0.2.114:

```sh
rustup toolchain install 1.97.0 --profile minimal --component rustfmt --component clippy --target wasm32-unknown-unknown
cargo +1.97.0 install wasm-bindgen-cli --version "$(node packages/browser-oxfmt/native/build-wasm.ts --bindings-version)" --locked
RUSTUP_TOOLCHAIN=1.97.0 npm run build --workspace @rm-industries/browser-oxfmt
```

`build` and `typecheck` generate missing or stale native output automatically.
An unchanged verified artifact is reused without invoking Rust. Native generation
uses Cargo to fetch the pinned upstream Git revision and registry dependencies,
uses the committed lockfile, remaps build paths, records source/toolchain/asset hashes,
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

## Dependency and adapter ownership

`native/src/markdown_adapter.rs` maps browser options and embedded-language
requests to upstream Oxfmt crates. It contains no independent formatting
algorithm. `native/src/lib.rs` exposes that adapter through WASM bindings.

Dependabot checks Cargo registry dependencies, including transitive dependencies,
weekly. The wasm-bindgen CLI version is read from Cargo.toml so binding updates
keep the generator and library aligned. Oxfmt's Git dependencies remain pinned:
changing them requires the matching npm engine, supported policy and parity
fixtures to be reviewed together.
