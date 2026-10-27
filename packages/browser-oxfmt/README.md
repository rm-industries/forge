# Browser Oxfmt

Native Oxfmt 0.74.0 Markdown formatting in a reusable module worker. The package
ships precompiled WebAssembly and maintained wasm-bindgen bindings. Consumer
installation and website builds need no Rust toolchain.

```ts
import { format, engine } from '@rm-industries/browser-oxfmt';

const text = await format(source, 'article.md', {
  upstreamVersion: '0.74.0',
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

## Installation and compatibility

```sh
npm install @rm-industries/browser-oxfmt
```

The optional `oxfmt` peer dependency declares the exact supported version for
users of the Node `/build` configuration helper. Install that version alongside
this package when resolving project configuration. Browser-only consumers use
the bundled engine and do not need to install Oxfmt.

Each browser-oxfmt release supports one exact Oxfmt engine version. Keep the
consumer's repository formatter and browser package aligned; a version mismatch
fails rather than silently changing formatting policy.

Node helpers support Node `^22.22.2 || ^24.0.0 || ^26.0.0` and npm
`^10.9.0 || ^11.0.0`. Browser-only callers use the bundled worker and WASM.
The default Forge template now integrates this formatter for CMS saves; existing
sites adopt it deliberately, with build-time settings resolved from their own
configuration. See the [existing-site adoption guide](../../docs/browser-formatter-adoption.md).

Automated Chromium, Firefox and WebKit checks cover formatting parity, loading,
responsiveness and recovery. They do not establish an actual Safari or iPhone
minimum: real-device timing, background/resume and browser-floor evidence remain
tracked in [#407](https://github.com/rm-industries/forge/issues/407).

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
`requireUniformPolicy:true`. It rejects nonempty `ignorePatterns`, potentially
applicable Markdown overrides, EditorConfig sections other than `[*]`, and nested
Oxfmt/EditorConfig files throughout `cwd`. Standard dependency directories and root
build output directories are excluded; other symbolic links fail because their
configuration cannot be proven uniform. Use a standalone project root, not a
monorepo containing multiple independently configured sites. This mode must
succeed before applying one resolved policy globally.

Overrides whose filename patterns have a literal suffix incompatible with `.md`
are safe to skip: `src/content/experience/*.json` may retain `printWidth:1` while
Markdown uses the root policy. The proof covers possible future filenames, not
just existing articles. `*.json*`, broad wildcards and mixed Markdown/JSON rules
remain potentially applicable.

Complete exclusions are recognized when an include pattern is also excluded,
an exclusion covers all supported Markdown names (`*.md` or `**/*.md`) or all
paths (`**/*` or `**`), or a literal `directory/**` exclusion covers an include's
literal directory prefix. Wildcard/subtree exclusion proofs do not cover explicit
hidden path segments; identical pattern exclusions remain safe. Other include/exclusion relationships are conservatively
rejected when Markdown cannot be ruled out. Patterns and options in every rule
are validated even when the rule is irrelevant to Markdown. Filename-specific
resolution retains its existing ordered matching and exclusion behavior.
