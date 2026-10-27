# Forge

![Forge logo](docs/assets/forge-logo.svg)

Forge creates an Astro website you own: structured Markdown content, Sveltia CMS,
accessible components, native CI and deployment configuration, and quality checks.
It is maintained by [RM Industries](https://github.com/rm-industries).

Start with [getting started](docs/getting-started.md), then follow the
[configuration](docs/configuration.md), [content and CMS](docs/content-and-cms.md),
[deployment](docs/deployment.md), and [maintenance](docs/upgrades.md) guides.
The website presents the reviewed create-forge 2.0 documentation baseline;
writing that documentation does not publish 2.0. Check the
[available versions](https://www.npmjs.com/package/@rm-industries/create-forge?activeTab=versions)
and follow the reference matching the version you install.

```sh
npm create @rm-industries/forge
```

The create-forge 2.0 generator, repository tooling and new generated projects
support Node.js `^22.23.4 || ^24.0.0 || ^26.0.0` and npm
`^10.9.0 || ^11.0.0`. Git is optional with `--no-git`. The standalone Forge
website requires Node 26 for its tooling. Unchanged independently released
libraries retain their published Node 22.22.2 minimum; inspect each package's engines. See [compatibility and support](docs/support-policy.md)
for platform, browser and peer requirements, and [quality and troubleshooting](docs/quality-and-troubleshooting.md)
for installation or validation failures.

## Packages

Each package has its own semantic version, changelog, release tag and consumer contract:

| Package                                                                 | Responsibility                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [create-forge](packages/create-forge/README.md)                         | CLI, safe project creation, bundled template and native provider CI generation.           |
| [content-model](packages/content-model/README.md)                       | Integration-neutral models and matching Astro and Sveltia adapters.                       |
| [browser-oxfmt](packages/browser-oxfmt/README.md)                       | Browser worker formatting with one pinned native Oxfmt engine and configuration contract. |
| [markdownlint-frontmatter](packages/markdownlint-frontmatter/README.md) | Source-preserving key ordering and model-derived Markdownlint configuration.              |

Generated source belongs to its owner. Dependency updates use that project's
manifest and lockfile; template improvements require selective source migration.
Re-running the generator is never an upgrade mechanism. See [upgrades](docs/upgrades.md)
and the [browser formatter adoption guide](docs/browser-formatter-adoption.md).

## Architecture

Root npm workspaces discover `packages/*`. The root and standalone website
retain committed authoring locks. The independent `templates/default/` has no
committed or delivered lock; neither standalone project may depend on workspace
hoisting or unpublished local packages. From create-forge 2.0 the CLI bundles
versioned template source and reviewed ranges. Creation resolves published
packages freshly and validates the consumer-owned lock before optional Git
initialization. Ordinary `--no-install` leaves no lock; Cloudflare keeps its
networked lockfile-only preflight. Consumers commit and replay their own locks.

A generator version identifies source and range policy, not an immutable
dependency graph. Compatible resolutions within unchanged ranges need no
source commit or generator release. Source, range, corrective pin and runtime
changes require review and release assessment. Keep existing npm orchestration,
static template and typed CI builders; the discarded tooling experiments
introduce no supported replacement. The website is owned source,
not a second template or an installed generator dependency.

The generator validates inputs and destination boundaries before copying regular
files. Preserve symlink protections, overwrite confirmation, backups, rollback,
escaping and unresolved-token checks. Installation or Git failure must leave
recoverable source and actionable diagnostics. New inputs need a CLI flag,
interactive prompt, stable `--yes` default, validation, customization, examples
and fixtures together. Private template tokens have one declared meaning and
reviewed insertion sites; do not replace broad matching text.

Content-model releases its core and adapters together, with tested conservative
peer ranges. Its bundled ESM source uses relative imports without extensions, enforced
by Oxlint; published entry points remain the consumer boundary.
The browser formatter's package, engine version, source revision,
options and worker/WASM identity are separate contracts that must agree.
Frontmatter lint orders keys; Oxfmt formats text and Astro/model validation owns
schema semantics. Do not merge these responsibilities.

The website publishes only the canonical sources explicitly listed in
[`website/src/config/documentation.ts`](website/src/config/documentation.ts).
The registry owns routes, sections and reading order. New repository Markdown
remains unpublished until registered; this README and maintainer records are
not consumer documentation routes. Package READMEs are canonical references,
not duplicated website copies. Check links both locally and at `/forge/`.

### Visual identity

Keep the canonical anvil/sparks paths and complete transparent `160 × 160`
view box in the logo and favicon; navigation marks stay square and at least
`32 × 32`. Use Latte/Mocha text and Lavender sparks. Reuse DaisyUI primitives,
semantic theme tokens, Fira Sans prose and Fira Code technical labels; fixed
Catppuccin colors belong only in static assets. Illustrations show define,
generate and own as a numbered content pipeline, without relying on color alone.
Social cards retain the opaque Mocha `1200 × 630` canvas, mark and typography.
Provide meaningful accessible names or decorative empty alternatives, and check
themes, narrow overflow, reduced motion and intrinsic asset dimensions.

## Development and CI

Use the root `packageManager` version when writing locks. Preserve unrelated
source changes and review manifests and locks together. Install each project at
its own boundary:

```sh
npm ci
npm ci --prefix website
npm install --prefix templates/default
npm run quality
npm run verify:template
npm run test:template:customization
npm run verify:package --workspace @rm-industries/create-forge
npm run test:generator:e2e
npm run website:quality
```

Root quality covers native checks, formatting, lint, spelling, links, types,
tests, builds and package inspection. `test:contracts` checks root contracts;
`test:integration` checks cross-package model integration; `test:root` retains
both. Packed CLI fixtures validate actual installed output outside the workspace,
including failure preservation and provider configuration. CI shares one inspected
CLI through `FORGE_CLI_TARBALL` across runtime consumers. Template CI resolves
one fresh lock and shares it with downstream jobs for `npm ci` replay, without
committing that disposable authoring lock. Generated-project CI replays its own
consumer lock. The primary Node 26
consumer also supplies its build to static/browser/budget jobs. Cloudflare fixtures
verify the installed Wrangler command without contacting Cloudflare. Test each declared
peer and supported runtime when changing compatibility. Install the committed
Playwright Chromium, Firefox and WebKit builds for browser checks.

Forge-owned CI uses native project path filters and explicit consumed inputs,
with weekly/manual broad validation as a backstop. Package implementation edits
do not select downstream consumers unless they consume that source; the CLI
also owns template edits because it bundles them. Preserve runtime matrices,
standalone installation, artifact ownership, browser/accessibility checks,
coverage and Lighthouse budgets. Generated GitHub/GitLab YAML belongs to the
consumer after bootstrap; [CI providers](docs/ci-providers.md) covers that boundary.

`Repository quality` aggregates seven independent root checks and rejects
failures, cancellations and unexpected skips. Review affected project checks
before merge. Replacing the historical required contexts with this aggregate
is a separately approved repository-settings migration; local checks do not
prove those settings or hosted runs. Coordinate workflow/settings changes and
rollback together, preserving unrelated security and review protections.

GitHub remains the primary provider. Native GitLab includes provide Linux
validation and JUnit/coverage/Code Quality evidence; mirror runner setup,
server-side CI lint and schedules need separate verification. Forge-owned GitLab
website deployment remains disabled. When changing failure or artifact paths,
prove their rejection on a temporary review branch and remove the deliberate
fault before submission. Keep failed-run evidence and hidden Lighthouse reports.

### Documentation checks

```sh
npm run docs:check
npm run docs:validate
npm run docs:links:external
```

Internal validation checks surviving files, directory READMEs, anchors and
critical commands against their owning manifests. Update
`scripts/documentation-validation.config.ts` when canonical guidance moves;
do not remove command checks to accommodate deletion. External checks run
separately with retries and HEAD/GET fallback. Any exception must name an exact
URL, reason and expiry, never a whole domain.

### Website ownership and deployment

The static site remains at `https://www.rm-industries.com/forge/`, with its own
Node 26 tooling, lock and dependency updates. Preserve visitor browser targets
independently of the build runtime. See the [website README](website/README.md)
for local commands. Do not regenerate its customized source.

Source checks gate one production build; output validation, browsers,
accessibility, Lighthouse and deployment consume that same artifact. Only
validated main-push runs deploy through the protected Pages environment, then
run the live URL/asset/mobile smoke check. PRs, schedules and manual checks do
not deploy. Package/checkpoint tags never deploy the website. Roll back by
reverting the website change and deploying the revert, not by moving a tag.

## Package releases

Assess compatibility independently for each package. Before 1.0, breaking
changes require a minor and migration notes; after 1.0, breaking CLI/generated
contracts, model/adapter types, peers, runtime minimums or lint/fix guarantees
require a major. Compatible additions use minor releases and fixes use patches.
Upstream version labels do not replace that assessment. Each version needs a
matching newest changelog heading with migration or explicit no-migration notes.

Ordinary releases follow this procedure:

1. Prepare a focused version/changelog/lock PR and run quality plus affected
   packed, template, generator, browser, native and peer checks.
2. Dispatch **Package Release** for the package. Manual dispatch is prepare-only:
   it runs quality and inspects/uploads the tarball and release plan without
   publishing or requesting publication approval. Review the exact artifact,
   digest and recorded commit and link that evidence in the PR.
3. After review and merge, create the matching `<slug>-v<version>` tag at the
   exact reviewed main commit. The four slugs are `create-forge`, `content-model`,
   `browser-oxfmt` and `markdownlint-frontmatter`. Never move an existing pushed tag.
4. Confirm the [release prerequisites](#release-prerequisites), then approve
   protected `npm-release` publication. Verify the exact npm version and
   `next` prerelease or `latest` stable tag, integrity, provenance, GitHub release
   target and `published-*` evidence afterward.

GitHub is the sole publisher. Trusted publishers bind `rm-industries/forge`,
`package-release.yml` and the correct protected environment/tag policy. Only
publication receives OIDC permissions; no long-lived npm token is required.
Changing shared environment or publisher settings needs separate authorization.
Repository checkpoint `v*` tags record milestones and never publish packages.
Close a checkpoint only with scope, quality, security, documentation and release
evidence complete, including current required audits and affected support lanes.

### Release prerequisites

Quality and publication automation do **not** run dependency vulnerability
audits. Maintainers must run and disposition the relevant policies before
release approval; repository checkpoints require all three:

```sh
npm run audit
npm run audit --prefix templates/default
npm run audit --prefix website
```

Policies reject high and critical findings. Exceptions must name exact advisory
IDs, affected paths, rationale, expiry and upstream tracking where available.
Do not allowlist packages or severity classes. Remove or re-review expired
entries in a dedicated change. Prior release-specific waivers do not authorize
another package release or site deployment; current audit failures remain
blocking unless resolved or given a separately reviewed exception.

Inspect package identity, allowlist, licenses, declarations, workers/native
assets, trusted commit/tag and packed digest. Reconcile the inspected bytes
with registry integrity and provenance, not just a green workflow. The current
publisher does not independently bind every downloaded manifest field and
recompute its tarball digest before upload; reviewers must verify that handoff.
Post-publication registry comparison does not replace that missing check.

Browser formatter approval also needs native rebuild/reproducibility, exact
engine parity, idempotence, packed three-engine tests and CMS save/recovery
checks. Actual macOS Safari, detailed iPhone scenario/build evidence,
background/resume and measured support boundaries remain tracked in
[#407](https://github.com/rm-industries/forge/issues/407). Playwright WebKit is
not actual Safari certification; functional iPhone attestation does not supply
unrecorded timings, device identity or minimum-version guarantees.

Frontmatter changes must preserve public-rule, isolated packed-consumer,
CLI2 adoption and CMS ordering/preservation checks. The retained adoption verifier
currently expects a disposable local template lock; follow the
[fixture prerequisite](fixtures/frontmatter-adoption/README.md) before running it
from a clean checkout. This does not restore a committed template lock:

```sh
npm test --workspace @rm-industries/markdownlint-frontmatter
npm run test:packed --workspace @rm-industries/markdownlint-frontmatter
node scripts/verify-frontmatter-adoption.ts
npm run test:frontmatter:cms
```

Keep [`fixtures/frontmatter-adoption/`](fixtures/frontmatter-adoption/README.md)
and its callers. Publication and normal starter activation are distinct:
registry dependencies and configuration require their own reviewed adoption,
with a fresh template resolution and a committed lock in each generated consumer.
Do not add an unavailable registry version or local overlay to the normal starter.

### Recovery

Retry transient/configuration failures for the same immutable tag and version.
If npm already accepted identical integrity, the workflow can verify it and
recreate missing release metadata/evidence. Conflicting or unverifiable
registry identity fails closed. Source defects require a new reviewed version;
never replace a published version, silently move a tag, or unpublish as routine
recovery. Deprecation requires authorization, a safe replacement and verified
registry message. Generated-source fixes need manual remediation instructions
because newer generators do not modify existing sites.

### Corrective fresh delivery and rollback

A permitted upstream version can still regress public behavior. Reproduce the
failure through an isolated installed CLI, review temporary pins to known-working
published model/CMS or browser/Oxfmt versions, and state when those pins can be
removed. Pack and test the corrective generator itself; a manually repaired
consumer does not prove the delivered fix. Rerun peers, quality, CMS/formatter
checks and required audits. Old generators and existing sites retain their own
metadata and need deliberate owner action.

The locked create-forge 1.3.0 artifact is a fallback for new-project delivery only
after its actual packed artifact, security state and unchanged consumer lock
replay are reviewed. Returning a future generator to bundled-lock delivery needs
a reviewed source change, tested snapshot, semver assessment and protected
publication/audit gates. Never move public tags/dist-tags or rewrite consumer
files automatically. Recorded rehearsal artifacts are evidence, not publication
exceptions. Retain final prepare-only artifact identity, current quality and
security evidence before the first protected 2.0 publication; documentation and
monitoring setup do not authorize it.

## Dependency automation and monitoring

Maintainers review Dependabot alerts, CodeQL/Zizmor findings, failed scheduled
checks and dependency-update PRs; green correctness checks do not waive security
review. Keep action pins immutable, permissions least-privileged, secrets away
from untrusted PR code, and network findings separate from deterministic quality.
Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

Peer automation resolves exact registry versions, reinstalls the proposed root lock
and tests core/adapters before extending conservative peer bounds. An
incompatible peer update is rejected with a recorded reason, not a widened
range to force installation. API/migration changes need the appropriate manual
release. Compatible content-model/CMS and browser-oxfmt/Oxfmt publications resolve
inside the template's existing ranges during fresh installation and monitoring.
The template-sync workflow, preparer and automatic lock-only PR path are removed;
compatible publication needs no template commit or automatic generator release.
Template npm Dependabot updates are disabled; root, website, Cargo and action
updates remain active. Template source, range and corrective pin changes require
review and a generator release assessment. Package-owned peer and exact embedded
engine contracts remain enforced.

Peer automation converges on one branch/PR per update. Validation
must finish before creating the short-lived Contents/PR-scoped App token using
`PEER_UPGRADE_APP_CLIENT_ID` and `PEER_UPGRADE_APP_PRIVATE_KEY`; never expose it
to PR code or substitute a personal token. Retry registry, validation or API
failures rather than bypassing checks or creating competing branches.

Only reviewed merged same-repository App `automation/peer-*` content-model
patches qualify for publication without a second approval: exact merge SHA, expected file set,
consecutive stable patch, published predecessor and no unreviewed baseline
implementation changes. These use main-only `npm-release-auto`;
ordinary tags retain `npm-release` review. Create-forge, mixed features,
prereleases and browser/frontmatter releases stay manual. Preserve both trusted-publisher
identities and their separate permissions.

Browser Oxfmt Engine Updates coordinates npm Oxfmt, Rust revision, engine/options,
locks, package version and changelog. Review output changes after native and
packed parity/idempotence/recovery/CMS checks; failed checks require maintainer
attention. Compare engine changes through the maintained Markdown-case matrix;
review the approved Tailwind class-order differences rather than silently enabling
sorting. The adapter maps browser options to upstream Oxfmt instead of owning a
second formatter. Published consumers need no Rust; a fresh checkout needs the
pinned native toolchain:

<!-- cspell:ignore rustup clippy bindgen RUSTUP -->

```sh
rustup toolchain install 1.97.0 --profile minimal --component rustfmt --component clippy --target wasm32-unknown-unknown
cargo +1.97.0 install wasm-bindgen-cli --version "$(node packages/browser-oxfmt/native/build-wasm.ts --bindings-version)" --locked
RUSTUP_TOOLCHAIN=1.97.0 npm run build --workspace @rm-industries/browser-oxfmt
npx playwright install --with-deps chromium firefox webkit
```

Use
`npm run build:native --workspace @rm-industries/browser-oxfmt -- --force` and
`npm run quality:native --workspace @rm-industries/browser-oxfmt` for regeneration
and Rust checks, plus `npm run test:browser --workspace @rm-industries/browser-oxfmt`
for isolated packed Chromium/Firefox/WebKit verification. Preserve locked Cargo
resolution, source/toolchain/asset hashes and license notices. Reproducibility
checks compare canonical-host builds; they do not claim cross-host byte identity.

### Fresh consumer monitoring

The **Fresh consumer** workflow uses the packed candidate for relevant pull
requests. Daily and weekly stable runs resolve npm `latest` once, download that
exact published artifact, and record package/version/source identity with
SHA-512 integrity in `identity.json`. Every validation rechecks the artifact
hash. A registry/manifest mismatch fails; a failing stable is never replaced
with unpublished main. Stable monitoring activates only for a published stable
version at least 2.0.0. Earlier stable versions report `inactive`, which is not
freshness acceptance; a prerelease on `latest` fails selection.

Rehearse the manual workflow with candidate/stable selection and daily/weekly
coverage, or use new absolute output directories locally:

```sh
node scripts/fresh-consumer.ts select candidate /tmp/forge-selection /tmp/create-forge.tgz
node scripts/fresh-consumer.ts select stable /tmp/forge-stable-selection
node scripts/fresh-consumer.ts validate /tmp/forge-selection /tmp/forge-evidence
node scripts/fresh-consumer.ts plan weekly
```

The candidate command requires an inspected packed CLI. Select either candidate
or stable and validate its matching selection directory; these commands do not
publish or change tags. Selection may be shared across runtime lanes, but each
validation requires its own new output directory. Append `weekly` to validation
for the complete browser/Lighthouse probe, or `quality` for a runtime-only probe.

Validation installs the selected CLI outside the repository and invokes its
public command with normal installation. It verifies registry-only isolation,
model/CMS and browser/Oxfmt versions and peers with `npm ls`, removes installed
dependencies, and requires byte-identical lock replay with `npm ci`. Consumer
`quality:core` and the delivered Chromium CMS formatting/save/recovery tests
follow without local package overlays or substituted authoring tests.

Daily coverage uses Ubuntu Node 26/npm 11. Monday weekly coverage uses Ubuntu
Node 22.23.4/npm 10.9.0, latest Node 22/npm 11, Node 24/npm 11, Node 26/npm 11,
and macOS Node 26/npm 11. All lanes use the same selected artifact, record their
own lock/runtime identity, replay their locks and run consumer quality; failures
do not cancel remaining lanes. The primary Ubuntu Node 26 lane also runs all
three delivered browsers and Lighthouse. Browser and budget failures fail the
probe; `quality:core` is not an audit gate and monitoring never waives release audits.

Keep generator/runtime identity, commands, resolved pair versions, lock/hash,
browser failures and hidden Lighthouse reports. Hosted artifacts expire after
seven days; collect required evidence before expiry and remove local scratch
consumers after investigation. Rahul owns failure triage. Native GitHub failure
channel delivery was verified for PR 419 on 2026-10-25, not a scheduled
fresh-consumer failure. After the separately authorized first 2.0 publication,
observe the first active daily and weekly stable runs, verify their registry
identity, and confirm delivery of the first relevant failure. Record this
schedule-specific observation in release evidence; local tests cannot prove
notification receipt. No notification bot or settings change is implied.

## Contributing and support

Use [CONTRIBUTING.md](CONTRIBUTING.md) for the review workflow and
[GitHub Issues](https://github.com/rm-industries/forge/issues) for reproducible
bugs and proposals. Include versions and a safe minimal reproduction; remove
private content and secrets. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
Forge is licensed under the [MIT License](LICENSE).
