# Browser formatter configuration evidence

Issue #346 adds the Node-only `@rm-industries/browser-oxfmt/build` subpath.
The public helper derives serialized settings from the consumer's actual Oxfmt
installation and authoritative configuration, including EditorConfig width 120.
It reports the approved Tailwind exception separately from runtime options.
See the [build contract](../../packages/browser-oxfmt/README.md#derive-browser-settings-during-a-build)
for the deliberately bounded resolution and uniform-policy rules.

## Verified candidate behavior

Fourteen package tests cover the public configuration and runtime boundaries.
Configuration cases include ordered matching/excluded filename overrides,
quote preferences, width, wrapping, configured tabs, line endings, nearest
EditorConfig fallback, authoritative-module edits, incompatible consumer
versions, invalid settings, malformed EditorConfig, ignored filenames, and
uniform-policy rejection of nested configuration outside the representative
file's path. Accepted wildcard/literal patterns are compared with the actual
matching Oxfmt CLI, using absolute physical Markdown filenames. Fenced code
inherits the host Markdown settings.

An isolated consumer installs the candidate tarball and Oxfmt 0.72.0. Its build
imports the package's public Node subpath and derives settings from the unchanged
default template configuration and EditorConfig. A real browser passes those
settings to the installed runtime; the result matches that consumer's real CLI
byte for byte. No browser configuration discovery or second handwritten policy
is involved.

On macOS ARM64 with Node 26.9.0, Chromium 155.0.8059.85 and Playwright WebKit 26.6
passed that new configuration check, alongside the existing 215-case packaged
suite: 210 exact matches, five approved Tailwind diagnostic differences, and all
215 outputs idempotent. Worker reuse, UI responsiveness, missing-asset and worker
failure recovery, project-path loading, and a Vite production build also passed.
The new build dependency is confined to the Node entry point; browser runtime
entry points contain no EditorConfig parser or Node imports.

Local Firefox still fails during browser startup on this host, before formatter
execution. The default CI browser matrix remains Chromium, WebKit, and Firefox;
`BROWSER_OXFMT_ENGINES=chromium,webkit` selects the measured local subset only.
This report does not substitute Playwright WebKit for actual Safari or iPhone
release evidence. No package or release tag was published.

## Reproduce

```sh
npm ci
npm test --workspace @rm-industries/browser-oxfmt
npm run typecheck --workspace @rm-industries/browser-oxfmt
npm run build --workspace @rm-industries/browser-oxfmt
npm run test:browser --workspace @rm-industries/browser-oxfmt
```

The packed-consumer test needs the same Playwright/Vite setup as the package
browser test. It verifies the public build export and declarations are packed,
installs a matching Oxfmt in the isolated consumer, and compares the generated
browser policy with its CLI. Exact unsupported settings fail during the build;
none are silently removed except the explicitly approved Tailwind sorting
exception, which always emits a structured diagnostic when enabled.
