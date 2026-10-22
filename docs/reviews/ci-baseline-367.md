# CI coverage and ownership baseline

This is the pre-migration baseline for [spec 367](https://github.com/rm-industries/forge/issues/367)
and [ticket 371](https://github.com/rm-industries/forge/issues/371), observed October 22, 2026.
Source baseline: `9661fd7`. This document records observations separately from proposed routing.
Forge maintains its native workflows; generated consumers own their emitted YAML after bootstrap.
No repository settings, deployments, reference repositories, or pipelines were changed to collect evidence.

## Evidence and protection

Read-only GitHub REST requests inspected `branches/main/protection`, `rulesets`, `environments`,
each environment's `deployment-branch-policies`, and Actions runs/jobs. No repository rulesets were returned.
Main enforces protections for administrators; strict up-to-date checks, signatures, force pushes,
branch deletion, linear history, and conversation resolution are disabled. There are 27 required
GitHub Actions contexts (application ID 15368), listed in the migration table below.
The native Rust job is a build prerequisite but is not itself a required context.
Website, CodeQL, and workflow-scanning contexts are not in this required-check list.

| Environment        | Observed protection                                                                                                                                    | Workflow owner                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `github-pages`     | Custom branch policy: `main`; no reviewer rule                                                                                                         | Website deployment                   |
| `npm-release`      | Four tag policies: `content-model-v*`, `create-forge-v*`, `browser-oxfmt-v*`, `markdownlint-frontmatter-v*`; reviewer `rahul0705`, self-review allowed | Manual/tag package publication       |
| `npm-release-auto` | Custom branch policy: `main`; no reviewer rule                                                                                                         | Reviewed automatic patch publication |

All three environments allow administrator bypass. Environment secret values were not requested.
GitLab CI Lint, mirror runner execution, GitLab branch protection, and reference-site protections
were not inspected; native YAML and local contract tests cannot establish those live facts.
Consumer protections are repository settings and cannot be inferred from generated YAML.

## Responsibility and trigger matrix

The detailed job/command/artifact inventory follows later in this document. All root npm checks
use the root lock; website and generated consumers install their own committed lock.
Permissions start empty unless noted, and jobs request only their documented scopes.

| Source                                  | Owner and purpose                                                             | Current trigger                                                                                     | Concurrency and effects                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `.github/workflows/project.yml`         | Forge package/tool correctness and inspected candidate packs                  | Every PR to/main push                                                                               | Workflow/ref; cancels PRs only; read contents                                                   |
| `.github/workflows/generator.yml`       | Packed CLI, isolated generated consumer, tool regressions                     | Every PR to/main push                                                                               | Workflow/ref; cancels previous; read contents, generated security writes security events        |
| `.github/workflows/website.yml`         | Isolated website quality, browser/accessibility, budget, deployment and smoke | PR/main push affecting `website/**`, `docs/**`, its YAML or setup action                            | Workflow/ref; cancels PRs only; deploy writes Pages/OIDC                                        |
| `.github/workflows/browser-oxfmt.yml`   | Native reproducibility, packed browsers and CMS serialization                 | PR affecting native package, template, root lock, formatter/linter/spelling config or setup; manual | Browser/ref; cancel previous; read contents                                                     |
| `.github/workflows/documentation.yml`   | External documentation link health                                            | Tuesday 09:31 UTC; manual                                                                           | Workflow/ref; cancel previous; read contents                                                    |
| `.github/workflows/automation.yml`      | Forge workflow syntax/security                                                | `.github/**` PR/main push; Monday 05:43 UTC                                                         | Workflow/ref; cancel previous; security-events write for scanner                                |
| `.github/workflows/security.yml`        | CodeQL Actions/JS/Rust and PR dependency review                               | Every PR/main push; Monday 05:17 UTC                                                                | Workflow/ref; cancel previous; actions/contents read, security-events write                     |
| `.github/workflows/gitlab-sync.yml`     | Mirror main/tags, no production publication                                   | Main/tag push; manual; configured destination required                                              | Global serialized group; no cancellation; contents read plus mirror credential                  |
| `.github/workflows/package-release.yml` | Select approved release, validate exact commit, publish inspected artifact    | Package tags; main package manifest changes; manual                                                 | Ref group, no cancellation; prepare reads contents/PRs; publish contents/OIDC write             |
| `.github/workflows/peer-upgrades.yml`   | Reviewable peer compatibility update and supported CMS synchronization        | Friday 06:07 UTC; manual                                                                            | Global serialized group; read contents; synchronization actions write; App creates PR           |
| `.github/workflows/oxfmt-upgrades.yml`  | Reviewable coordinated native engine update                                   | Friday 06:23 UTC; manual                                                                            | Global serialized group; read contents; App creates PR                                          |
| `.github/workflows/template-sync.yml`   | Verify publication then update registry-pinned template                       | `content-model-published` dispatch; manual                                                          | Global serialized group; actions/contents read; App creates PR and enables checked auto-merge   |
| `.gitlab-ci.yml` and `.gitlab/ci/*.yml` | Supplemental native project/generator/website validation                      | Merge request; default-branch push; suppress duplicate branch/MR pipelines                          | Jobs interruptible; includes select generator/website changes; production deploy/smoke disabled |

There is no broad scheduled package/generator/website validation today. Security, automation,
external links and dependency-update schedules cover different responsibilities. Default proposal:
one weekly broad validation of all lanes, with manual dispatch for diagnosis; retain post-deployment smoke.
Daily fresh installs remain outside this spec and depend on the separate lockfile experiment.

## Consumption graph and proposed routing

| Input → consumer                                                                | Edge type                  | Consequence                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/*` → root workspaces                                                  | Local source/build         | Changed package tests, types, build and pack; actual dependents follow workspace imports                       |
| `templates/default` → create-forge distribution → generated project             | Copied output              | Generator build materializes template; packed CLI generation and consumer local commands protect shipped files |
| `packages/create-forge/src/ci` → consumer YAML                                  | Generated output           | Provider contracts, syntax/security, deployments and command/artifact behavior need generated validation       |
| Template `@rm-industries/content-model@1.1.7` → generated site                  | Published npm, lock-pinned | Local content-model source does not replace this dependency or imply consumer release                          |
| Local content-model → `test:frontmatter:cms`                                    | Explicit candidate build   | Protect model-derived field ordering and native CMS saves; not a registry compatibility claim                  |
| Local browser-oxfmt → isolated packed browser consumers and serialization probe | Candidate artifact         | Test WASM/worker package and native serialization integration separately from template adoption                |
| `docs/**/*.md` → website Astro glob loader                                      | Local content              | Documentation edits can alter website pages, links and budgets; preserve site validation                       |
| Website source/lock → website                                                   | Independent project        | Website has no local package dependency; package membership alone must not select website                      |
| Root config, setup action, scripts, lock, CI → their users                      | Shared tooling             | Select all affected jobs; uncertain ownership falls back to broad validation                                   |
| Native Cargo/WASM inputs → browser formatter build → tested tarball             | Local build output         | Include Rust formatting/linting, reproducible engine, package identity, supported runtimes and browser checks  |

Candidate overlays are intentional test setup, not release dependencies. Preserve the isolated
website boundary (ADR 0007), independent versions (ADR 0006), and frontmatter package boundary (ADR 0008).
The root lock changing does not modify website's lock, but shared root checks still use that lock.
Website checks consume docs at build time; a docs-only policy that skips every website check is unsound.

## Cost observations

Times below are observed UTC job durations, including setup but excluding time waiting for prerequisites.
Elapsed workflow time includes orchestration/queue time. Samples are successful runs, not statistical
medians, billed minutes, or a controlled before/after benchmark. Different runs can have different changes.

| Run                                                                                      | Event     | Jobs       | Elapsed | Expensive observations                                                     |
| ---------------------------------------------------------------------------------------- | --------- | ---------- | ------- | -------------------------------------------------------------------------- |
| [Project 39788493256](https://github.com/rm-industries/forge/actions/runs/39788493256)   | PR        | 14         | 6m 50s  | Rust 151s; build 207s; four compatibility lanes 24–32s each                |
| [Generator 39788493387](https://github.com/rm-industries/forge/actions/runs/39788493387) | PR        | 14         | 4m 22s  | Five consumer lanes 38–60s; browser 127s; Lighthouse 157s; scenarios 100s  |
| [Website 39787960075](https://github.com/rm-industries/forge/actions/runs/39787960075)   | Main push | 14         | 5m 26s  | Browser/accessibility 142s; Lighthouse 147s; build 29s; deployed smoke 56s |
| [Native 39788493244](https://github.com/rm-industries/forge/actions/runs/39788493244)    | PR        | 1 workflow | 5m 58s  | Native reproducibility, packed browsers, CMS; per-step timing not captured |
| [Security 39788493229](https://github.com/rm-industries/forge/actions/runs/39788493229)  | PR        | 1 workflow | 6m 39s  | CodeQL matrix and dependency review; job timing not captured               |

The first two workflows alone submit 28 jobs for every PR before security, native and website selection.
A website main push adds deployment and smoke; a PR skips those two jobs. A 40-run recent sample
included many cancelled main pushes; do not treat cancellation time as the cost of a successful run.
The older project run `39713028851` spans about 7.5 hours because it was updated later; created-to-updated
elapsed is unreliable as runner cost. Re-measure with job start/end times and identical change classes.

Overlap to remove carefully: project packages CLI while generator separately packages CLI; root static
checks and independent site static checks overlap file surfaces; generator scenarios and five consumer
lanes repeat installs/builds intentionally across runtime/OS; root native quality and native reproducibility
repeat Rust work for different contracts. Browser accessibility tests already use axe; Lighthouse's
accessibility score overlaps automated accessibility but also checks performance/SEO/best-practice budgets.
Build validation checks files/metadata without browser interaction; smoke catches deployed base paths,
assets and mobile layout after deployment, which local build/browser success cannot prove.

Existing optimization is retained: one canonical generated source and production build feeds downstream
consumer quality/browser/Lighthouse/build validation, with per-runtime builds reserved for compatibility.
The CMS native-save probes use focused Chromium and real serialization rather than a complete repeated
multi-browser CMS editing suite. They still verify save ordering/convergence; formatter serialization
probes additionally protect callback failures and unchanged input. No CMS protection is removed here.

## Delivered-test disposition

Decisions below guide the consumer slice; no tests are removed by this inventory. Paths are relative to
`templates/default`. Mixed files require splitting assertions, not deleting their durable protection.

| Existing file                                          | Purpose and proposed disposition                                                                                 | Retained protection                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/config/site.test.ts`                              | Durable, retain                                                                                                  | Canonical URL validation, controls/links, browser-safe config and CMS branding                |
| `src/config/deployment.test.ts`                        | Durable, retain                                                                                                  | Root and project base paths                                                                   |
| `src/lib/paths.test.ts`                                | Durable, retain                                                                                                  | Base-aware paths without double prefixes                                                      |
| `src/lib/navigation.test.ts`                           | Durable, retain                                                                                                  | Segment boundaries, root and external URL handling                                            |
| `src/lib/articles.test.ts`                             | Starter regression, move to Forge                                                                                | Draft filtering, order and pagination while article starter exists                            |
| `src/themes/site-theme.test.ts`                        | Starter regression, move to Forge                                                                                | Catppuccin flavors/default selection                                                          |
| `src/content.config.test.ts`                           | Durable, retain                                                                                                  | Every declared model reaches Astro collections                                                |
| `src/config/content-models/registry.test.ts`           | Mixed: move fixed article/tags assertion; retain duplicate model rejection at package seam                       | No duplicate collection names; starter registry stays covered in Forge                        |
| `src/integrations/sveltia/config.test.ts`              | Mixed: retain credential exclusion/serialization, move fixed article/tags shape                                  | Safe configuration and editing/build model agreement                                          |
| `src/integrations/sveltia/preview-collections.test.ts` | Durable, retain                                                                                                  | Rich-content collections register previews                                                    |
| `src/integrations/sveltia/previews.test.ts`            | Starter regression, move to Forge                                                                                | Example article preview rendering                                                             |
| `scripts/validate-build.test.ts`                       | Durable, retain                                                                                                  | Missing artifacts and unresolved generator tokens rejected                                    |
| `scripts/run-lighthouse.test.ts`                       | Durable, retain                                                                                                  | Audited URLs honor deployment base                                                            |
| `scripts/documentation-examples.test.ts`               | Example-only assertion, move to Forge and document pattern                                                       | Starter article avoids duplicate title heading                                                |
| `tests/routes.spec.ts`                                 | Mixed: move fixed article/routes/feed examples; retain CMS noindex, internal links and generic metadata contract | Configured output, safe admin indexing, broken links                                          |
| `tests/navigation.spec.ts`                             | Starter regression, move fixed links/article traversal to Forge                                                  | Mobile navigation behavior remains covered by accessibility checks                            |
| `tests/theme.spec.ts`                                  | Mixed: move named palette assertions; retain local fonts/visible keyboard focus                                  | Accessibility and local assets                                                                |
| `tests/accessibility.spec.ts`                          | Durable, retain and derive routes                                                                                | Serious/critical axe findings, landmarks/headings, skip link, mobile overflow, reduced motion |
| `tests/smoke/deployment.spec.ts`                       | Durable, retain and derive routes                                                                                | Live deployment URL/assets, navigation/mobile wiring                                          |

`tests/preview.ts` is support code, not an assertion suite. Preserve it wherever retained tests need it.
Routes/names/colors are replaceable examples; security, accessibility, content preservation and generic
CMS editing-to-build checks remain obligations. Document optional example patterns rather than shipping
assertions about a consumer's choice of content. Native CMS probes and packed generator end-to-end tests
stay Forge-owned even when consumer examples move.

## Required-check migration and rollback proposal

This is a proposal, not an applied protection change. Three always-created summaries keep the required
surface small while reporting explicit success for unaffected work. The routing selector must be a
prerequisite whose failure/cancellation cannot be interpreted as an unaffected lane.

| Existing required contexts (27 total)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Proposed stable required context |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `Tool Format`; `Tool Lint code`; `Tool Lint Markdown`; `Tool Spellcheck`; `Tool Documentation links and commands`; `Tool Type-check`; `Tool Test`; `Tool Build`; `Tool Pack`; `Tool Compatibility (minimum Node 22)`; `Tool Compatibility (latest Node 22)`; `Tool Compatibility (latest Node 24)`; `Tool Compatibility (latest Node 26)`                                                                                                                                                                                                                | `Forge project`                  |
| `Package generator candidate`; `Consumer compatibility (minimum Node 22 on Ubuntu)`; `Consumer compatibility (latest Node 22 on Ubuntu)`; `Consumer compatibility (latest Node 24 on Ubuntu)`; `Consumer compatibility (latest Node 26 on Ubuntu)`; `Consumer compatibility (latest Node 26 on macOS)`; `Consumer source quality`; `Consumer build validation`; `Consumer browser tests`; `Consumer Lighthouse budgets`; `Generated workflow security`; `Generated workflow syntax`; `Generator behavior scenarios`; `Consumer quality tool regressions` | `Forge generator`                |
| No existing required website context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `Forge website`                  |

Native verification must feed the project summary when selected. Security and automation keep their
responsibilities; their routing must not disappear accidentally behind package selection.
Final names may be coordinated by the workflow slice, but the operator must record the exact resulting map.

Deploy code first with both old checks and summaries observable. Collect real PR evidence for success,
unaffected lanes and failures before requesting authorization to change required contexts. Change settings
only after all new names exist; keep the previous context list for rollback. Do not remove old job contexts
while they remain required: skipped entire workflows can leave branch protection waiting forever.
If migration fails, restore the original workflow graph and 27 contexts together. Disable selective routing
or dispatch broad validation while diagnosing; never turn a missing result into success. Preserve exact
release-commit validation, inspected tarball handoff, immutable tags, provenance and environment approval.
No mirror production publishing or PR deployment may be introduced.

## Representative change and failure matrix

| Scenario                                                      | Required behavior to prove                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Documentation-only                                            | Root documentation/static checks plus website content/build impact; unrelated package builds unaffected                         |
| Website-only                                                  | Website static/build/browser/budgets; no unrelated local package checks                                                         |
| Each package                                                  | Its source/types/tests/build/pack and actual local consumers; registry-pinned template unchanged unless explicit candidate seam |
| Template or CI builder                                        | Packed CLI generates isolated project; local scripts and both providers remain valid                                            |
| Content/layout/CMS/dependencies/build config                  | Relevant browser/accessibility/Lighthouse and CMS integration selected                                                          |
| Root lock/shared config/setup/workflow                        | Every actual tooling consumer selected; broad fallback for uncertain scope                                                      |
| Cargo/Rust/WASM                                               | Native reproducibility/quality, packed browser identity, runtime/browser compatibility                                          |
| Addition/deletion/rename                                      | Classify both old and new paths; a deleted known input still selects its consumers                                              |
| Mixed changes                                                 | Union of affected responsibilities                                                                                              |
| Missing diff, unsupported event or unknown path               | Broad validation; selector execution failure makes summary fail                                                                 |
| Unaffected lane                                               | Summary is present and explicitly succeeds without expensive jobs                                                               |
| Failed prerequisite, cancelled work, mixed successes/failures | Required summary fails; no skipped dependency can hide failure                                                                  |
| Schedule/manual                                               | Broad validation without PR production deployment                                                                               |
| Main deployment                                               | Build verified artifact once, primary provider deploys, smoke verifies returned deployment URL                                  |

Provider-native negative execution remains required evidence for downstream work; static YAML checks
prove structure only. Record before/after job counts and timings for comparable representative changes,
separately from coverage decisions and authorized branch-protection migration.

## Workflow job inventory at baseline

Job IDs below are the stable dependency pointers; matrix names expand at execution. Commands are
listed by their public npm entry points or step purpose where shell orchestration is involved.
The linked source retains complete shell bodies, guards and action pins. Artifact names/paths identify
the existing handoffs; they are not interchangeable with a fresh build from another commit.

### Repository Automation Validation

Source: [automation.yml](../../.github/workflows/automation.yml).

| Job ID / check                 | Commands or action purpose | Needs | Artifacts | Permissions                                   |
| ------------------------------ | -------------------------- | ----- | --------- | --------------------------------------------- |
| `security` / Workflow security | Scan workflows             | —     |           | {"contents":"read","security-events":"write"} |
| `syntax` / Workflow syntax     | Validate workflows         | —     |           | {"contents":"read"}                           |

### Browser Oxfmt Package

Source: [browser-oxfmt.yml](../../.github/workflows/browser-oxfmt.yml).

| Job ID / check                                               | Commands or action purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Needs | Artifacts | Permissions         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- | ------------------- |
| `package` / Rebuild native assets and verify packed browsers | npm run build:native --workspace @rm-industries/browser-oxfmt -- --force; npm run build:native --workspace @rm-industries/browser-oxfmt -- --force; npm run quality:native --workspace @rm-industries/browser-oxfmt; npm run typecheck --workspace @rm-industries/browser-oxfmt; npm test --workspace @rm-industries/browser-oxfmt; npm run build --workspace @rm-industries/browser-oxfmt; npm ci --prefix templates/default --ignore-scripts; npm run test:browser --workspace @rm-industries/browser-oxfmt; npm run build --workspace @rm-industries/content-model | —     |           | {"contents":"read"} |

### External Documentation Links

Source: [documentation.yml](../../.github/workflows/documentation.yml).

| Job ID / check                    | Commands or action purpose  | Needs | Artifacts | Permissions         |
| --------------------------------- | --------------------------- | ----- | --------- | ------------------- |
| `external-links` / External links | npm run docs:links:external | —     |           | {"contents":"read"} |

### Generator CI Validation

Source: [generator.yml](../../.github/workflows/generator.yml).

| Job ID / check                                                            | Commands or action purpose                                                                                                                                                                | Needs                  | Artifacts                                                             | Permissions                                   |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `package` / Package generator candidate                                   | npm ci; npm run build --workspace @rm-industries/create-forge; npm pack --ignore-scripts --workspace @rm-industries/create-forge --pack-destination "$RUNNER_TEMP/forge-packages"         | —                      | generator-package                                                     | {"contents":"read"}                           |
| `consumer-compatibility` / Consumer compatibility (${{ matrix.runtime }}) | Bootstrap once on this runtime; npm ci; Verify locked content-model; npm run typecheck; npm run test:coverage; else npm test; fi; npm run build                                           | package                | generator-package; consumer-source; consumer-build; consumer-coverage | {"contents":"read"}                           |
| `quality` / Consumer source quality                                       | Restore the canonical consumer; npm ci; npm run format && npm run lint:code -- --format github && npm run lint:css && npm run lint:markdown && npm run spellcheck && npm run audit:unused | consumer-compatibility | consumer-source                                                       | {"contents":"read"}                           |
| `validate-build` / Consumer build validation                              | Restore the canonical consumer; npm ci; npm run validate:build                                                                                                                            | consumer-compatibility | consumer-source; consumer-build                                       | {"contents":"read"}                           |
| `browser` / Consumer browser tests                                        | Restore the canonical consumer; npm ci; Install supported browsers; npm run test:e2e                                                                                                      | consumer-compatibility | consumer-source; consumer-build; consumer-browser-results             | {"contents":"read"}                           |
| `lighthouse` / Consumer Lighthouse budgets                                | Restore the canonical consumer; npm ci; Install Chromium; npm run lighthouse:ci                                                                                                           | consumer-compatibility | consumer-source; consumer-build; consumer-lighthouse                  | {"contents":"read"}                           |
| `security` / Generated workflow security                                  | Restore the canonical consumer; Scan generated workflows                                                                                                                                  | consumer-compatibility | consumer-source                                                       | {"contents":"read","security-events":"write"} |
| `syntax` / Generated workflow syntax                                      | Restore the canonical consumer; Validate generated workflows                                                                                                                              | consumer-compatibility | consumer-source                                                       | {"contents":"read"}                           |
| `scenarios` / Generator behavior scenarios                                | npm ci; Exercise distinct bootstrap behaviors                                                                                                                                             | package                | generator-package                                                     | {"contents":"read"}                           |
| `static-tool-regressions` / Consumer quality tool regressions             | npm run verify:template:static                                                                                                                                                            | —                      |                                                                       | {"contents":"read"}                           |

### Sync GitLab

Source: [gitlab-sync.yml](../../.github/workflows/gitlab-sync.yml).

| Job ID / check | Commands or action purpose | Needs | Artifacts | Permissions         |
| -------------- | -------------------------- | ----- | --------- | ------------------- |
| `sync` / sync  | Push main and tags         | —     |           | {"contents":"read"} |

### Browser Oxfmt Engine Updates

Source: [oxfmt-upgrades.yml](../../.github/workflows/oxfmt-upgrades.yml).

| Job ID / check      | Commands or action purpose                                                                                                                                                                                                                                                                                                         | Needs | Artifacts | Permissions         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------- | ------------------- |
| `prepare` / prepare | Prepare coordinated engine update; npm ci; npm run quality; npm ci --prefix templates/default --ignore-scripts; npm run test:browser --workspace @rm-industries/browser-oxfmt; Verify GitHub App configuration; Create GitHub App token; Resolve GitHub App identity; Push engine upgrade branch; Open engine upgrade pull request | —     |           | {"contents":"read"} |

### Package Release

Source: [package-release.yml](../../.github/workflows/package-release.yml).

| Job ID / check                      | Commands or action purpose                                                                                                                                                                                                                                                                                                                                             | Needs   | Artifacts                                                                                                                            | Permissions                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `prepare` / Prepare package release | Identify configured automation App; Select reviewed automatic patch; Verify release npm version; npm run --silent release:prepare -- "${arguments[@]}" --output .release/plan.json; npm run quality; npm pack --workspace "$WORKSPACE" --ignore-scripts --json --pack-destination .release > .release/pack.json; npm run --silent release:prepare -- "${arguments[@]}" | —       | ${{ steps.plan.outputs.artifact-name }}                                                                                              | {"contents":"read","pull-requests":"read"} |
| `publish` / Publish package         | Ensure immutable package tag; npm publish "$tarball" --access public --tag "$NPM_TAG" --provenance; Verify registry publication; Create GitHub release; Dispatch published content model                                                                                                                                                                               | prepare | ${{ needs.prepare.outputs.artifact-name }}; published-${{ needs.prepare.outputs.package-slug }}-${{ needs.prepare.outputs.version }} | {"contents":"write","id-token":"write"}    |

### Peer Compatibility Updates

Source: [peer-upgrades.yml](../../.github/workflows/peer-upgrades.yml).

| Job ID / check                                                              | Commands or action purpose                                                                                                                                                                                                                                                                                                                                                                      | Needs   | Artifacts | Permissions                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ------------------------------------- |
| `prepare` / Prepare compatibility update                                    | Verify lockfile writer version; npm run --silent peer:prepare -- "${arguments[@]}"); then; Regenerate workspace lockfile; npm ci; Format compatibility manifests and notes; npm run quality; then; Verify GitHub App configuration; Create GitHub App token; Resolve GitHub App identity; Push compatibility branch; Open or update compatibility pull request; Report compatible current range | —       |           | {"contents":"read"}                   |
| `synchronize-compatible` / Synchronize an already supported Sveltia release | Trigger published template synchronization                                                                                                                                                                                                                                                                                                                                                      | prepare |           | {"actions":"write","contents":"read"} |

### Project Continuous Integration

Source: [project.yml](../../.github/workflows/project.yml).

| Job ID / check                                               | Commands or action purpose                                                                                                                          | Needs                                                                                | Artifacts        | Permissions         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- | ------------------- |
| `format` / Tool Format                                       | npm run format                                                                                                                                      | —                                                                                    |                  | {"contents":"read"} |
| `lint-code` / Tool Lint code                                 | npm run lint:code -- --format github                                                                                                                | —                                                                                    |                  | {"contents":"read"} |
| `lint-markdown` / Tool Lint Markdown                         | npm run lint:markdown                                                                                                                               | —                                                                                    |                  | {"contents":"read"} |
| `spellcheck` / Tool Spellcheck                               | npm run spellcheck                                                                                                                                  | —                                                                                    |                  | {"contents":"read"} |
| `documentation` / Tool Documentation links and commands      | npm run docs:validate                                                                                                                               | —                                                                                    |                  | {"contents":"read"} |
| `typecheck` / Tool Type-check                                | npm run typecheck:root                                                                                                                              | —                                                                                    |                  | {"contents":"read"} |
| `test` / Tool Test                                           | npm run test:root                                                                                                                                   | —                                                                                    |                  | {"contents":"read"} |
| `native` / Tool Rust quality                                 | npm run quality:native --workspace @rm-industries/browser-oxfmt                                                                                     | —                                                                                    |                  | {"contents":"read"} |
| `build` / Tool Build                                         | npm run build; npm pack --ignore-scripts --workspaces --pack-destination "$RUNNER_TEMP/forge-packages"                                              | format, lint-code, lint-markdown, spellcheck, documentation, typecheck, test, native | project-packages | {"contents":"read"} |
| `pack` / Tool Pack                                           | Inspect published package contents                                                                                                                  | build                                                                                | project-packages | {"contents":"read"} |
| `compatibility` / Tool Compatibility (${{ matrix.runtime }}) | Restore generated engine from the tested package; npm run typecheck:workspaces && npm run test:workspaces; Exercise candidate content-model exports | build                                                                                | project-packages | {"contents":"read"} |

### Security Analysis

Source: [security.yml](../../.github/workflows/security.yml).

| Job ID / check                                     | Commands or action purpose                                                                                | Needs | Artifacts | Permissions                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----- | --------- | -------------------------------------------------------------- |
| `code-analysis` / Analyze (${{ matrix.language }}) | npm run build:native --workspace @rm-industries/browser-oxfmt; Initialize CodeQL; Perform CodeQL analysis | —     |           | {"actions":"read","contents":"read","security-events":"write"} |
| `dependency-review` / Review dependencies          | Review dependency changes                                                                                 | —     |           | {"contents":"read"}                                            |

### Published Template Synchronization

Source: [template-sync.yml](../../.github/workflows/template-sync.yml).

| Job ID / check                                      | Commands or action purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Needs | Artifacts | Permissions                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | --------- | ------------------------------------ |
| `synchronize` / Synchronize published content model | Resolve verified publication; Read registry metadata; npm run --silent template:sync -- "${arguments[@]}"; npm run template:sync:lockfile; npm ci; npm ci --prefix templates/default; Install generated-project browsers; npm run quality; npm run verify:template; npm run test:generator:e2e; Verify GitHub App configuration; Create GitHub App token; Resolve GitHub App identity; Push synchronization branch; npm package: ${npm_url}" \; Report current template; Enable checked synchronization auto-merge | —     |           | {"actions":"read","contents":"read"} |

### Forge Website Continuous Integration

Source: [website.yml](../../.github/workflows/website.yml).

| Job ID / check                                    | Commands or action purpose                        | Needs                                                                                                                                            | Artifacts                           | Permissions                          |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------ |
| `format` / Format                                 | npm run format                                    | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `spellcheck` / Spellcheck                         | npm run spellcheck                                | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `lint-code` / Lint code                           | npm run lint:code -- --format github              | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `lint-styles` / Lint styles                       | npm run lint:css                                  | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `lint-markdown` / Lint Markdown                   | npm run lint:markdown                             | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `audit-unused` / Audit unused code                | npm run audit:unused                              | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `typecheck` / Type-check                          | npm run typecheck                                 | —                                                                                                                                                |                                     | {"contents":"read"}                  |
| `unit-tests` / Unit tests and coverage            | npm run test:coverage                             | —                                                                                                                                                | website-unit-coverage               | {"contents":"read"}                  |
| `build` / Production build                        | npm run build                                     | format, lint-code, lint-styles, lint-markdown, spellcheck, audit-unused, typecheck, unit-tests                                                   | website-build; website/dist         | {"contents":"read"}                  |
| `validate-build` / Validate build                 | npm run validate:build                            | build                                                                                                                                            | website-build                       | {"contents":"read"}                  |
| `browser-tests` / Browser and accessibility tests | Install supported browsers; npm run test:e2e      | build                                                                                                                                            | website-build; browser-test-results | {"contents":"read"}                  |
| `lighthouse` / Lighthouse budgets                 | Install Lighthouse browser; npm run lighthouse:ci | build                                                                                                                                            | website-build; lighthouse-reports   | {"contents":"read"}                  |
| `deploy` / Deploy GitHub Pages                    | Deploy GitHub Pages                               | format, lint-code, lint-styles, lint-markdown, spellcheck, audit-unused, typecheck, unit-tests, build, validate-build, browser-tests, lighthouse |                                     | {"pages":"write","id-token":"write"} |
| `smoke-deployed` / Verify deployed website        | Install Chromium; npm run test:smoke              | deploy                                                                                                                                           | website-deployed-smoke-results      | {"contents":"read"}                  |

### GitLab native jobs

Root pipeline rules and include scopes are described above; all includes run under the same pipeline.
Images select independent Node versions; no GitHub token permissions apply. GitLab CI job-token
access and protected variables are server settings whose live state was not inspected.

Source: [generator.yml](../../.gitlab/ci/generator.yml).

| Job ID                              | Commands                                                                                                                                                                                                                                                             | Needs             | Artifacts                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `generator-package`                 | npm run build --workspace @rm-industries/create-forge; npm pack --ignore-scripts --workspace @rm-industries/create-forge --pack-destination "$CI_PROJECT_DIR/.ci-packages"                                                                                           |                   | .ci-packages/create-forge.tgz                                                                                  |
| `consumer-primary`                  | mkdir -p "/tmp/forge-cli"; cd /tmp/forge-consumer; npm ci; node "$CI_PROJECT_DIR/scripts/verify-consumer-lock.ts" /tmp/forge-consumer; npm run typecheck; npm run test:coverage; else npm test; fi; npm run build                                                    | generator-package | .ci-consumer/consumer-source.tgz, .ci-consumer/dist, .ci-consumer/coverage, .ci-consumer/test-results/unit.xml |
| `consumer-compatibility`            | mkdir -p "/tmp/forge-cli"; cd /tmp/forge-consumer; npm ci; node "$CI_PROJECT_DIR/scripts/verify-consumer-lock.ts" /tmp/forge-consumer; npm run typecheck; npm run test:coverage; else npm test; fi; npm run build                                                    | generator-package | .ci-consumer/test-results/unit.xml                                                                             |
| `consumer-quality`                  | npm run format && npm run lint && npm run audit:unused                                                                                                                                                                                                               | consumer-primary  | —                                                                                                              |
| `consumer-validate-build`           | cp -R "$CI_PROJECT_DIR/.ci-consumer/dist" .; npm run validate:build                                                                                                                                                                                                  | consumer-primary  | —                                                                                                              |
| `consumer-browser`                  | cp -R "$CI_PROJECT_DIR/.ci-consumer/dist" .; npx playwright install --with-deps chromium firefox webkit; npm run test:e2e                                                                                                                                            | consumer-primary  | .ci-consumer/playwright-report, .ci-consumer/test-results                                                      |
| `consumer-lighthouse`               | cp -R "$CI_PROJECT_DIR/.ci-consumer/dist" .; npx playwright install --with-deps chromium; export CHROME_PATH="$(node --input-type=module -e 'import { chromium } from "@playwright/test"; process.stdout.write(chromium.executablePath());')"; npm run lighthouse:ci | consumer-primary  | .ci-consumer/.lighthouseci                                                                                     |
| `generator-scenarios`               | FORGE_CLI_TARBALL="$CI_PROJECT_DIR/.ci-packages/create-forge.tgz" node packages/create-forge/scripts/test-generator-e2e.ts                                                                                                                                           | generator-package | —                                                                                                              |
| `consumer-quality-tool-regressions` | npm run verify:template:static                                                                                                                                                                                                                                       |                   | —                                                                                                              |

Source: [project.yml](../../.gitlab/ci/project.yml).

| Job ID                  | Commands                                                                                                                                                                                                                                                                       | Needs                                                                                                                                                | Artifacts                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `project-format`        | npm run format                                                                                                                                                                                                                                                                 |                                                                                                                                                      | —                                                                                                  |
| `project-lint-code`     | mkdir -p test-results; npm run lint:code --silent -- --format gitlab > test-results/code-quality.json                                                                                                                                                                          |                                                                                                                                                      | test-results/code-quality.json                                                                     |
| `project-lint-markdown` | npm run lint:markdown                                                                                                                                                                                                                                                          |                                                                                                                                                      | —                                                                                                  |
| `project-spellcheck`    | npm run spellcheck                                                                                                                                                                                                                                                             |                                                                                                                                                      | —                                                                                                  |
| `project-documentation` | npm run docs:validate                                                                                                                                                                                                                                                          |                                                                                                                                                      | —                                                                                                  |
| `project-typecheck`     | npm run typecheck:root                                                                                                                                                                                                                                                         |                                                                                                                                                      | —                                                                                                  |
| `project-test`          | npm run test:root                                                                                                                                                                                                                                                              |                                                                                                                                                      | test-results/unit.xml                                                                              |
| `project-native`        | npm run quality:native --workspace @rm-industries/browser-oxfmt                                                                                                                                                                                                                |                                                                                                                                                      | —                                                                                                  |
| `project-build`         | npm run build; mkdir -p .ci-packages; npm pack --ignore-scripts --workspaces --pack-destination .ci-packages                                                                                                                                                                   | project-format, project-lint-code, project-lint-markdown, project-spellcheck, project-documentation, project-typecheck, project-test, project-native | packages/browser-oxfmt/dist, packages/content-model/dist, packages/create-forge/dist, .ci-packages |
| `project-pack`          | for candidate in .ci-packages/*.tgz; do                                                                                                                                                                                                                                        | project-build                                                                                                                                        | —                                                                                                  |
| `project-compatibility` | cp -R packages/browser-oxfmt/dist/generated packages/browser-oxfmt/src/generated; tar -xOf .ci-packages/_browser-oxfmt_.tgz package/NOTICE.md > packages/browser-oxfmt/NOTICE.md; npm run typecheck:workspaces && npm run test:workspaces; mkdir -p "/tmp/content-model-check" | project-build                                                                                                                                        | packages/*/test-results/unit.xml                                                                   |

Source: [website.yml](../../.gitlab/ci/website.yml).

| Job ID                   | Commands                                                                                                                                                                                                                | Needs                                                                                                                                                                                                                                            | Artifacts                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `website-format`         | npm run format                                                                                                                                                                                                          |                                                                                                                                                                                                                                                  | —                                               |
| `website-spellcheck`     | npm run spellcheck                                                                                                                                                                                                      |                                                                                                                                                                                                                                                  | —                                               |
| `website-lint-code`      | mkdir -p test-results; npm run lint:code --silent -- --format gitlab > test-results/code-quality.json \|\| status=$?                                                                                                    |                                                                                                                                                                                                                                                  | website/test-results/code-quality.json          |
| `website-lint-styles`    | npm run lint:css                                                                                                                                                                                                        |                                                                                                                                                                                                                                                  | —                                               |
| `website-lint-markdown`  | npm run lint:markdown                                                                                                                                                                                                   |                                                                                                                                                                                                                                                  | —                                               |
| `website-audit-unused`   | npm run audit:unused                                                                                                                                                                                                    |                                                                                                                                                                                                                                                  | —                                               |
| `website-typecheck`      | npm run typecheck                                                                                                                                                                                                       |                                                                                                                                                                                                                                                  | —                                               |
| `website-unit-tests`     | npm run test:coverage                                                                                                                                                                                                   |                                                                                                                                                                                                                                                  | website/coverage, website/test-results/unit.xml |
| `website-build`          | npm run build                                                                                                                                                                                                           | website-format, website-spellcheck, website-lint-code, website-lint-styles, website-lint-markdown, website-audit-unused, website-typecheck, website-unit-tests                                                                                   | website/dist                                    |
| `website-validate-build` | npm run validate:build                                                                                                                                                                                                  | website-build                                                                                                                                                                                                                                    | —                                               |
| `website-browser-tests`  | npx playwright install --with-deps chromium firefox webkit; npm run test:e2e                                                                                                                                            | website-build                                                                                                                                                                                                                                    | website/playwright-report, website/test-results |
| `website-lighthouse`     | npx playwright install --with-deps chromium; export CHROME_PATH="$(node --input-type=module -e 'import { chromium } from "@playwright/test"; process.stdout.write(chromium.executablePath());')"; npm run lighthouse:ci | website-build                                                                                                                                                                                                                                    | website/.lighthouseci                           |
| `website-deploy`         | test -f 'website/dist/index.html'                                                                                                                                                                                       | website-format, website-spellcheck, website-lint-code, website-lint-styles, website-lint-markdown, website-audit-unused, website-typecheck, website-unit-tests, website-build, website-validate-build, website-browser-tests, website-lighthouse | website/dist                                    |
| `website-smoke-deployed` | test -n "$CI_PAGES_URL"; npx playwright install --with-deps chromium; npm run test:smoke                                                                                                                                | website-deploy                                                                                                                                                                                                                                   | website/playwright-report, website/test-results |

## Generated provider inventory

The bootstrap authors [`github.ts`](../../packages/create-forge/src/ci/github.ts),
[`github-extra.ts`](../../packages/create-forge/src/ci/github-extra.ts),
[`gitlab.ts`](../../packages/create-forge/src/ci/gitlab.ts) and
[`model.ts`](../../packages/create-forge/src/ci/model.ts) are the authoritative source.
The default generated GitHub set is `project.yml`, `automation.yml`, `security.yml`;
a prefix names them for nested sites. GitLab emits `.gitlab-ci.yml`, or a prefixed include under `.gitlab/ci`.
Consumer YAML has no continuing generator requirement.

| Output                   | Jobs and commands                                                                                                                                                                                                                 | Trigger / authority / artifacts                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub project           | `format`, `spellcheck`, `lint-code`, `lint-styles`, `lint-markdown`, `audit-unused`, `typecheck`, `unit-tests`, `build`, `validate-build`, `browser-tests`, `lighthouse`; public siteWork commands match the native website table | PR/push configured branches; optional nested-directory paths; read contents; workflow-ref/ref concurrency; coverage, dist, Pages, browser and Lighthouse artifacts |
| GitHub deployment extras | `deploy`, `smoke-deployed` or environment-suffixed equivalents; Pages deploy or locked Wrangler, then `test:smoke`                                                                                                                | Primary-provider branch pushes only; Pages/OIDC write only where required; environment-scoped destination; consume inspected production build                      |
| GitHub automation        | `security`, `syntax`: Zizmor and actionlint                                                                                                                                                                                       | Workflow changes and weekly Monday schedule, manual; contents read, security-events write for scanner                                                              |
| GitHub security          | `code-analysis` Actions/JS matrix and `dependency-review`                                                                                                                                                                         | PR/push and weekly Monday; dependency review PR only; actions/contents read and security-events write                                                              |
| GitLab consumer          | Same siteWork quality/build/browser/Lighthouse responsibilities, provider-native reports; deployment and smoke only for selected primary target                                                                                   | MR/default or configured branch push; duplicate pipeline suppression; interruptible jobs; JUnit/Cobertura/Code Quality and build/browser/Lighthouse artifacts      |

Schedules use bootstrap-derived minutes to avoid identical timing across repositories. Primary GitHub
cannot deploy GitLab Pages and primary GitLab cannot deploy GitHub Pages. Cloudflare uses locked Wrangler,
environment secrets and account/project validation. Root/nested directory, selected Node major, provider,
source branch and multiple deployment environment combinations are validated through existing packed-CLI
scenarios and provider contracts. Generated workflow live protections and successful provider execution
remain unavailable until inspected in each consumer; emitted structure alone is insufficient.

During rollout retain every existing required job name above, reporting a successful no-op for unaffected
work. Add summaries alongside those contexts; the proposed migration table does not authorize renaming
or removing required jobs before the owner approves a protection change.
