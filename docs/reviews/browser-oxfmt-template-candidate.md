# Gated template formatting candidate

The reviewed [candidate patch](../../experiments/browser-oxfmt/template-candidate.patch)
prepares the default template's CMS integration for browser Oxfmt. It is kept
outside generator output because content-model 1.1.9 and browser-oxfmt 0.1.0
are not published. The default template's manifest and registry lock remain
installable with their existing published versions.

## Apply only after the release handoff

Require the protected package release gates, verified npm integrity/provenance,
and published compatible content-model, browser formatter and CMS versions.
No local tarball or workspace dependency belongs in the default template.
After that handoff, review and apply the patch, update the registry lock and run
the full template/generator checks:

```sh
git apply --check --directory=templates/default experiments/browser-oxfmt/template-candidate.patch
git apply --directory=templates/default experiments/browser-oxfmt/template-candidate.patch
npm install --prefix templates/default --package-lock-only --ignore-scripts
npm run verify:template
```

Refresh and review the patch if intervening template updates make it conflict;
do not bypass the release or compatibility gate. This candidate is not an
npm publication, live website change, or completed default adoption.

## Behavior

The build helper derives options from the consuming project's Oxfmt and
EditorConfig policy, rejects unsupported or nonuniform settings, and reports
the approved Tailwind sorting exception. A Vite compile-time value passes those
resolved options to the CMS without an executable inline script or another
configuration file.

Sveltia's released callback has neither a filename nor a collection identity.
The candidate requires uniform policy across the project because all
collections sharing its built-in format use one callback. A synthetic `.md`
filename identifies the measured Markdown input type after that guard; no
entry path is guessed from its title or slug. MDX formatting is not claimed.

The callback awaits the bound native serializer before invoking the packaged
worker. Native model metadata and field order remain authoritative. The measured YAML
front matter delimiters are `---`/`---` and `---`/`...`; npm Oxfmt recognizes
both and the browser must retain them. Arbitrary custom Sveltia delimiters
are outside this candidate's supported serializer contract and need separate
verification before use.
Errors stay rejected and surface actionable text; the callback never returns
unformatted text after a formatter failure. Existing model validation,
Markdown linting and field-order requirements remain separate checks.

Browser formatting preserves Tailwind class order. Repository Oxfmt may still
sort those classes; build diagnostics disclose that deliberate difference.

## Concrete isolated verification

```sh
node scripts/verify-template-browser-formatting.mjs
```

The harness copies the actual default template, applies the candidate patch,
explicitly installs the two local package tarballs and released CMS 0.250.0
only in that temporary project, and runs type checks, complete unit coverage,
an Astro production build and build-output validation. It also verifies that
a filename override prevents the uniform-policy build.

It loads the actual compiled `/project/admin/` application, creates an isolated
local repository through browser storage and exercises metadata, raw Markdown,
rich text, custom delimiters, a large article and repeated saves. It compares
actual saved bytes with npm Oxfmt applied to the captured native serialization
and checks metadata/body retention explicitly.

Failure controls cover missing WASM, a broken worker, an actual trap in the
valid native WASM module, stale resolved versions and invalid options. Each
must display an error, retain the unsaved field and original file, and permit
a successful retry after repair. Native output capture and stale deployment
injection exist only in the temporary test build, not in the candidate patch.

The production server uses self-hosted worker/WASM assets with the correct
MIME types and a CSP allowing `wasm-unsafe-eval` without broad JavaScript
`unsafe-eval`. Necessary CMS styles, images and preview frames have separate
directives. No Rust, remote formatting service, hook or post-save commit is
required to install or build the candidate.

The default harness requires Chromium, Firefox and WebKit and retains evidence
on failure. The Browser Oxfmt CI job runs it after the package's three-engine
gate. Actual Safari/device checks remain a later readiness gate.

## Local checkpoint

On macOS ARM64 with Node 26.9.0, the isolated production candidate passed all
ten actual save and recovery scenarios in Chromium 155.0.8059.85 and Playwright
WebKit 26.6 (20 scenarios total). Type checking, all unit coverage thresholds,
the Astro build and build-output validation passed. WebKit uses a fresh
persistent profile per scenario because its ephemeral contexts cannot provide
the local repository fixture's browser file storage; a minimal storage probe verified
that difference before changing the harness.

Local Firefox still fails during profile initialization before the application
loads. The required Linux CI run must verify all three browsers before this
integration gate is complete. The harness retains that failure rather than
skipping Firefox. Actual Safari and iPhone evidence remain pending.
