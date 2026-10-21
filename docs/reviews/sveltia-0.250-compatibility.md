# Sveltia 0.250.0 compatibility

Tracking: [#347](https://github.com/rm-industries/forge/issues/347), part of
[#342](https://github.com/rm-industries/forge/issues/342).

## Released API

Sveltia `0.250.0` is the minimum released version with the bound native
serialization callback. The preceding `0.249.0` release does not expose
`FileFormatterContext` or `serialize` in its published declarations. The npm
`0.250.0` tarball was published at `2026-10-21T00:19:35.690Z` (October 20 in
New York), with integrity:

```text
sha512-VDdYsC2zSiXGGvzgPIJMVyG9Yf3JsAFXr6OltZZnv7kTANHeOVS1hjuorUfa472rWO40l1bheKPOhEFtpdoNtg==
```

The published `types/public.d.ts` declares
`FileFormatter(value, { serialize })`, where `serialize(value)` returns a
`Promise<string>`. Register under a built-in format name with
`registerCustomFormat(name, extension, { toFile })`. The native callback keeps
the entry's output options, front matter delimiters, and field comments; it
copies the supplied content before removing the body. It does not accept the
second format argument available in the earlier local prototype. Returned
custom output is trimmed and receives a trailing newline.

## Save and failure evidence

The executable probe uses Forge's built content-model and Sveltia adapter to
create its collection, and loads the installed, released CMS browser bundle.
It uses an isolated browser origin and the local repository backend backed by
browser storage. Article content never leaves the browser. It checks metadata
edits, raw Markdown edits, rich text edits, custom front matter delimiters,
callback promise rejection, synchronous callback exceptions, and a native YAML
serialization error caused by a function-valued property.

Successful saves retain model-derived title, description, tags, draft, and body
content. Native serialization leaves the callback's input object unchanged.
Failures surface an error dialog, preserve the original file byte for byte,
and retain the edited description in the open editor. Sveltia awaits callback
completion and does not fall back to saving unformatted content. Dismissing the
error and retrying with a successful callback permits saving the retained edit.
This clears the upstream fallback concern for the tested version and backend.

Reproduce after installing root and template dependencies and Playwright's
Chromium browser:

```sh
npm run build --workspace @rm-industries/content-model
node scripts/verify-sveltia-serialization.mjs
```

The first optional argument is an installed Playwright module path; the second
is a Playwright browser channel, e.g. `chrome`. This allows an existing local
browser installation without adding a root browser dependency. The probe
asserts CMS `0.250.0` so a future upgrade must update this evidence deliberately.

## Compatibility release and adoption

Content-model `1.1.8` is a compatibility-only patch. The peer range preserves
`>=0.193.2 <0.237.0` and adds `>=0.250.0 <0.251.0`. Intermediate unverified
minor versions remain excluded. This deliberately narrows the continuous-range
proposal produced by `peer:prepare`; the adapter's API and runtime stay intact.
Existing consumers need no migration. Consumers needing native serialization
must install Sveltia `0.250.0` with content-model `1.1.8` after publication.

Local validation uses Node `26.9.0` on macOS and the committed npm lockfile:
content-model's 32 tests, type checking, build, and workspace pack dry run.
The local pack identity is `rm-industries-content-model-1.1.8.tgz`, 20,674
bytes, with integrity:

```text
sha512-WWy/KV5r3pIjWwrpMv0pA7PJB7/pcKtfViyP/cALUCsAEg/fC1UgSiG1CqBRy7RG2eI0NeaFhupQ4mAl7jQexQ==
```

Run the validation above before using `--ignore-scripts`, which keeps the
packing JSON free of test/build output.
The release plan can be generated from the dry-run JSON with:

```sh
npm pack --dry-run --ignore-scripts --json --workspace @rm-industries/content-model > /tmp/content-model-pack.json
npm run release:prepare -- --package content-model --sha "$(git rev-parse HEAD)" --pack-result /tmp/content-model-pack.json
```

The root dependency audit currently reports seven advisories, including the
existing `markdown-it` high severity advisory
[GHSA-gfr2-rv44-r23c](https://github.com/advisories/GHSA-gfr2-rv44-r23c).
The affected dependency is unchanged by this compatibility update. Publication
remains blocked until the release security gate passes.

This prepares a `content-model-v1.1.8` release identity; it neither creates a
tag nor publishes. The protected release workflow dry run, maintainer review,
publication, registry integrity/provenance verification, and verified
`published-*` handoff remain required by [release policy](../package-releases.md)
before template adoption. No formatter hook, formatter dependency, or template
version change belongs to this compatibility patch.

The save probe does not cover remote Git backends, Safari, or every supported
Node line. Their existing CI and integration gates remain required; the local
repository result establishes serialization failure behavior, not a blanket
browser or backend certification.
