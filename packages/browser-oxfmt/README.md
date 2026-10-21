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

Engine upgrades must rerun this packed suite and the feasibility probe, compare
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

To regenerate the checked precompiled release assets, install Rust 1.97.0 with
`wasm32-unknown-unknown` and wasm-bindgen-cli 0.2.114, then run:

```sh
npm run build:wasm --workspace @rm-industries/browser-oxfmt
```

The script verifies the pinned upstream archive, uses the committed Cargo lock,
remaps build paths, records source/toolchain/asset hashes, and generates license
notices. CI rebuilds twice in a fixed staging path and compares both results
on its canonical Linux builder, then tests that generated artifact. Cross-host
byte identity between macOS and Linux is not claimed; Cargo's local package
identity can affect code layout even after source paths are remapped. The asset
identity records its build host. `build` and `prepack` verify shipped asset hashes
and copy them without invoking Rust. The tracked WASM and generated bindings
are an explicit package release asset exception to ignoring generated output.
Review identity and notices whenever regenerating them.
