# Frontmatter plugin release readiness

Candidate: `@rm-industries/markdownlint-frontmatter@0.1.0`, prepared on
2026-10-21 for [#354](https://github.com/rm-industries/forge/issues/354).
This is release preparation. Publication, tag creation, and merging remain
separate maintainer actions. Normal generated sites do not yet enable ordering.

## Artifact and publication boundary

The package exports its ESM rule, structural model helper, and TypeScript
configuration type through `dist/index.js` and `dist/index.d.ts`. Its only direct
runtime dependency is YAML; Markdownlint `^0.42.0` is a required peer. The packed
allowlist is exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`, and
`dist/index.js`, `dist/index.js.map`, `dist/index.d.ts`. The map includes the
plugin source for debugging; no repository-only imports, tests, caches, model
runtime, credentials, or workspace links are shipped. License: MIT.

Local dry-run commands, after the quality gate:

```sh
mkdir -p /tmp/forge-354-release
npm pack --workspace packages/markdownlint-frontmatter --ignore-scripts --json \
  --pack-destination /tmp/forge-354-release > /tmp/forge-354-release/pack.json
npm run --silent release:prepare -- --package markdownlint-frontmatter \
  --sha "$(git rev-parse HEAD)" --pack-result /tmp/forge-354-release/pack.json \
  --output /tmp/forge-354-release/release.json
```

The reviewed local artifact has SHA-1
`e62dccabb71d2fcd48eff3661db57b89f2c8d1ef`, 7,807 packed bytes and 23,015
unpacked bytes. Its SHA-512 integrity is recorded in the local release manifest;
repacking after metadata changes requires reviewing a new digest. The manifest
records the checked-out commit; this local candidate includes the release-preparation
working changes. The final protected run must record the final reviewed commit.

Manual workflow dispatch selects `markdownlint-frontmatter` and skips publication.
The scoped tag is `markdownlint-frontmatter-v0.1.0`; a future authorized tag run
uses the existing protected `npm-release` environment, trusted publisher,
`id-token: write`, exact-artifact integrity verification, and `--provenance`.
Stable versions target `latest`, prereleases `next`. No automatic release source
or template synchronization event was added. Browser formatter #349 can extend
the same preparer registry independently.

## Verification evidence

On this final ticket change, `npm run quality` passed formatting, lint,
spelling, documentation links, typechecking, all 227 tests (65 root, 32
content-model, 112 generator, 18 plugin), builds, and workspace pack dry runs.
`git diff --check` passed. `npm audit --json` independently confirmed the eight
advisories listed below; quality does not include that separate security gate.

A registry-only copy at an OS temporary directory, outside every workspace,
passed `npm ci --no-audit --no-fund` followed by `npm run quality:core`: format,
code/CSS/Markdown lint, spelling, unused-dependency analysis, Astro checks,
40 coverage tests, build, and validation of 12 required outputs. This run used
the final tracked starter README, its own manifest/lock, and no plugin overlay.
Its log is `/tmp/forge-354-registry-starter.log`; the initial copy command was:

```sh
python3 - <<'PYTHON'
import shutil, tempfile
site = tempfile.mkdtemp(prefix='forge-354-registry-starter-')
shutil.copytree('templates/default', site, dirs_exist_ok=True,
                ignore=shutil.ignore_patterns('node_modules', 'dist', '.astro', 'coverage'))
print(site)
PYTHON
npm ci --prefix <printed-site> --no-audit --no-fund
npm run quality:core --prefix <printed-site>
```

The public release-plan tests first failed for an unsupported package and the
workflow tests first failed for absent tag/dispatch options. After implementation,
17 focused plan, workflow, and automatic-release tests passed. They cover scoped
manifest identity, version/tag mismatch, packed identity, protected publication,
manual dry-run behavior, provenance, and exclusion from automatic sources.

Commands for the plugin and consumer boundaries:

```sh
npm run quality
npm run test:packed --workspace @rm-industries/markdownlint-frontmatter
node scripts/verify-frontmatter-adoption.mjs
npm run test:frontmatter:cms
npm run verify:template:static
npm run test:generator:e2e
```

The packed consumer passes exact-content and dependency-boundary assertions,
strict TypeScript public-export compilation, LF/CRLF preservation, unknown and
optional fields, comments, scalar styles, nested mappings, ordinary body rules,
unsafe-YAML refusal, idempotence, and the public content-model/Sveltia projection.
Its temporary declaration consumer explicitly installs TypeScript 7.0.2 and
Markdown-it 15.0.2, matching Markdownlint's own declaration dependency; the plugin
adds neither as a runtime dependency.

CLI2 0.24.0 directly uses Markdownlint 0.42.0 without an override. The isolated
adoption proof first installs the starter's registry-only lock, then overlays the
packed plugin and verifies two model-derived collection orders, ordinary Markdown
scope, non-mutating check, fix exit behavior, preservation, and unsafe refusal.
This proves the handoff, not registry distribution.

Node 22.22.2 and 24.22.0 each passed all 18 public rule/model tests, packed
public-consumer tests, and the actual CLI2 adoption script, including native
TypeScript model configuration. Node 26.9.0 with npm 11.19.1 passed those same
boundaries. The supported engine ranges remain those in the
[support policy](support-policy.md). These focused probes are not a full root,
build, generator, and browser matrix for Node 22/24.

Integration verification before this ticket passed the complete template static
pipeline and nine defect fixtures, plus eleven generator fixtures. Native CMS
verification passed with Sveltia 0.245.1 and matching Chromium 156.0.8078.4:
metadata-only, raw Markdown and rich-text saves persisted valid ordering, and
rule/Oxfmt normalization converged on the second pass. The
[migration evidence](../fixtures/frontmatter-adoption/README.md) records value,
comment, draft, optional-field, and body-meaning limits.

## Unresolved release blockers

- The plugin is not published on npm (registry E404). Do not add an unavailable
  registry dependency, workspace link, or local tarball to the normal starter.
  After authorized publication, activate the documented overlay in a separate
  reviewed manifest/configuration/registry-lockfile change and rerun isolation.
- A live protected `Package Release` manual dry run and npm trusted-publisher
  configuration have not been verified here. Local commands cannot prove GitHub
  environment policy, OIDC provenance, or registry publication.
- Root audit currently reports eight advisories: five high through the single
  unpatched `braces <=3.0.3` path via micromatch/globby, and three low math-related
  advisories. These are release readiness blockers; no audit exception or broad
  dependency repair is included in this task.
- `npm run verify:template` stops at a pre-existing assertion requiring a literal
  URL while the template uses a deployment URL fallback. The same mismatch is on
  main. Standalone copied-starter evidence must be recorded separately and does
  not make that wrapper pass.
- Full supported-platform/runtime release-checkpoint CI, protected publication,
  provenance and registry-integrity checks remain maintainer release gates.

Follow [package releases](package-releases.md) and the
[selective migration and rollback](../fixtures/frontmatter-adoption/README.md).
The rule orders keys; Oxfmt formats text and Astro validates schema. No general
YAML formatting or schema validation is implied.
