# Reference consumer alignment and backport drafts

Assessment for [spec 367](https://github.com/rm-industries/forge/issues/367) and
[ticket 378](https://github.com/rm-industries/forge/issues/378), October 22, 2026.
The [inventoried standard](ci-baseline-367.md) distinguishes durable consumer checks,
Forge-owned starter regressions, independent dependency populations, and provider authority.
This assessment compares source wiring against that standard; it does not certify live runs.
All proposals below are repository-local issue drafts, not external consumer issues.

## Reproducible evidence

Read-only GitHub file and recursive tree requests used these revisions:

| Repository                                                                                                             | Revision                                   | Site root and workflow                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| [Personal site](https://github.com/rahul0705/rahul0705.github.io/tree/a185b1b5195e962b22fcc9952ed62da494d8d412)        | `a185b1b5195e962b22fcc9952ed62da494d8d412` | Root; `.github/workflows/project.yml`                       |
| [Company site](https://github.com/rm-industries/rm-industries.github.io/tree/61e87e68aadb49449c397aaa9409df27779972ec) | `61e87e68aadb49449c397aaa9409df27779972ec` | Root; `.github/workflows/project.yml`                       |
| [Etch](https://github.com/rm-industries/etch/tree/569429d81d71937ef2191cd57f9f16e476ada176)                            | `569429d81d71937ef2191cd57f9f16e476ada176` | `website`; `.github/workflows/website.yml`                  |
| Forge                                                                                                                  | `9661fd7`, inventoried in ticket 371       | Root tools, isolated website, template and packed consumers |

For each external revision the evidence includes the site's `package.json`, committed lockfile
presence, setup action, project/website and security workflows, GitLab include, Playwright and
Lighthouse configuration, and relevant scripts/tests. Package versions below are manifest
requirements; resolved lock versions, import coverage and successful runtime consumption were not verified.

## Package and command ownership

| Site         | Declared Forge packages                                                                                                             | Custom commands and constraints to retain                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal     | Production `browser-oxfmt ^0.1.1`, `content-model 1.1.9`; development `markdownlint-frontmatter ^0.1.0`, all under `@rm-industries` | `build` includes Pagefind; `lint:resume:markdown` validates generated output; `lint:code` syncs Astro before Oxlint; `typecheck` uses Astro check; Node 26 only           |
| Company      | Production `@rm-industries/content-model 1.1.7`                                                                                     | Build aggregates sitemaps; `lint:css`; typecheck plus separate Astro diagnostics; tested Lighthouse URL wrapper; coverage in CI; Node 22/24/26 engine range               |
| Etch website | No `@rm-industries/*` manifest dependency                                                                                           | Markdown/spelling also check documentation; explicit social-card asset generation; separate website lock; coverage and dependency audit in CI; Node 22/24/26 engine range |

None declares a continuing `create-forge` dependency. Generated YAML belongs to consumers after
bootstrap. Neither missing optional packages nor differing command names establish an alignment gap.
Etch uses a separate Astro Markdown integration; a documentation website without the CMS is a valid profile.
Forge's registry-pinned template content-model dependency and explicit local candidate probes are
separate consumption edges; upgrading local sources does not silently upgrade these consumers.

## Assessment against the baseline

| Obligation                                              | Personal site                                                       | Company site                                        | Etch website                                            | Forge monorepo                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Source quality, unused dependencies, types, unit checks | Wired as independent jobs                                           | Wired as independent jobs; coverage                 | Wired as independent jobs; coverage and audit           | Root/tool checks plus isolated website and generated consumers                          |
| Build once; downstream checks consume artifact          | Build feeds validation, browsers, generated Markdown and Lighthouse | Build feeds validation, browsers and Lighthouse     | Website build feeds validation, browsers and Lighthouse | Existing website/generator artifact contracts; packed package identity is also required |
| Accessibility and browser/performance checks            | Three browser engines and Lighthouse configured                     | Three engines and Lighthouse configured             | Three engines and Lighthouse configured                 | Consumer/browser and native CMS seams remain separately owned                           |
| Primary-provider publication and post-deploy smoke      | Main push, GitHub Pages, smoke after deploy                         | Main push, GitHub Pages, smoke after deploy         | Main push, website Pages, smoke after deploy            | Website publication separate from package publication and generated-provider contracts  |
| Durable tests separated from starter examples           | Site-specific content assertions are consumer-owned                 | Site-specific content assertions are consumer-owned | Documentation examples are consumer-owned               | Baseline identifies starter assertions to move into Forge; ticket 376 owns that work    |
| Broad scheduled validation                              | No broad schedule in project workflow                               | No broad schedule in project workflow               | No broad schedule in website workflow                   | Baseline confirms missing broad validation; this spec owns Forge scheduling             |
| Live branch protection and provider execution           | Unverified                                                          | Unverified                                          | Unverified                                              | 27 required contexts recorded; preserve until approved migration                        |

“Wired” means commands, prerequisites and artifacts exist in the inspected source. It does not
prove that they pass or that repository protections require them. The project workflows use
explicit permissions, pinned external actions and PR cancellation. Setup actions run `npm ci`;
Etch scopes cache and installation to `website`.

Both standalone sites disable GitLab deployment/smoke jobs with `when: never`. Validation remains
separate from publication; GitHub-primary operation does not require dual publishing. The personal
site explicitly admits GitLab merge requests/default-branch pushes, with a regression assertion.
GitLab runner behavior, live includes and settings remain unverified for all consumers.

Etch's Python engine has its own root workflow, Windows/provider regressions, template consumers
and release gating. A website assessment must preserve that boundary. Forge similarly owns package
build/pack/runtime matrices, generator scenarios, native Rust/WASM reproducibility, serialization,
release automation and documentation inputs beyond the standalone-site standard. Identical YAML,
package populations or a single shared quality command would erase these responsibilities.

The missing broad schedule is a confirmed website-workflow difference, not evidence that scheduled
security/dependency jobs are missing. Full dependency audit is wired in Etch's website workflow;
personal/company manifests declare audit commands without a corresponding project audit job.
The baseline does not require that exact job, so this is not classified as a blocking gap.

## Personal-site development and CI backport inventory

Source pointers below refer to the pinned personal-site revision above.

| Capability                                                       | Evidence                                                                                                                                     | Disposition against Forge baseline                                                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic workflow regression tests                               | `scripts/ci-workflow.test.ts` expands npm wrappers and checks once-only work, DAG, artifact downloads, deployment gates and GitLab admission | Extend existing Forge workflow/provider tests only where these assertions are absent; draft A                                                                       |
| Nonempty outputs, draft exclusion and unresolved-token rejection | `scripts/validate-build.ts` and `.test.ts`                                                                                                   | Missing-artifact/token checks already belong to durable Forge coverage; retain and adapt consumer content rules rather than copy resume paths                       |
| Preview process ownership                                        | `playwright.config.ts`, preview helpers                                                                                                      | `reuseExistingServer: false`, owned preview process and base-path-aware URL are worth a targeted comparison; draft B requires reproduction before changing behavior |
| Independent generated-content check                              | `package.json`, `lint-generated-markdown` job                                                                                                | General pattern is useful for custom output; preserve it in consumer alignment without adding resume generation to Forge                                            |
| Astro sync before lint and single diagnostic entry point         | `package.json`                                                                                                                               | Compare actual command coverage and output, not script spelling; no universal command replacement proposed                                                          |

These are development/CI capabilities. Pagefind search, resume exports and UI, table of contents,
content catalogs, theme, components and authored pages are optional product work. Company sitemap
aggregation and Etch social-card presentation are also consumer features. None is a prerequisite
for this spec and none is proposed for automatic backport.

## Draft A: strengthen semantic workflow contracts where missing

**Target:** Forge. **Status:** reviewable follow-up draft; first compare final tickets 372–377.

**Problem and evidence:** the personal site's
[single workflow contract](https://github.com/rahul0705/rahul0705.github.io/blob/a185b1b5195e962b22fcc9952ed62da494d8d412/scripts/ci-workflow.test.ts)
expands nested npm wrappers and checks GitLab MR admission in addition to artifact and gate edges.
Forge already has `scripts/website-ci-workflow.test.ts` and generated-provider tests. This proposal
covers only a demonstrated assertion gap after those tests and this spec's changes are inspected.

**Benefit:** catch accidental duplicate builds hidden behind aggregate commands and validation
jobs that exist in YAML but cannot run in merge requests, without introducing consumer tooling.

**Acceptance evidence:** extend the existing public workflow/provider seam; a duplicate build
through an npm wrapper, wrong artifact name, missing deploy prerequisite or blocked GitLab MR
rule must fail its focused test. Valid root/nested provider fixtures pass and retain custom commands.
Do not freeze starter route names or copy consumer resume jobs.

**Prerequisites:** final integration graph and command inventory from tickets 372–377; inspect
existing assertions first. Close this draft without code if that coverage already exists.

## Draft B: verify and, if needed, preserve local preview ownership

**Target:** Forge template browser support. **Status:** investigation before implementation.

**Problem and evidence:** the personal site's
[Playwright configuration](https://github.com/rahul0705/rahul0705.github.io/blob/a185b1b5195e962b22fcc9952ed62da494d8d412/playwright.config.ts)
starts its own preview, declines reuse and passes Astro's lock option. Forge's current preview
configuration and helpers must be tested before calling a difference a defect.

**Benefit:** browser validation observes the intended build and does not reuse or terminate a
developer's unrelated preview process.

**Acceptance evidence:** reproduce occupied-port/stale-server behavior on supported Astro and
Node versions; assert either a clearly reported conflict or a separately owned preview, correct
root/base-path URLs and cleanup of only the owned child. Preserve report artifacts and live smoke.

**Prerequisites:** ticket 376's retained support boundary; inspect current preview helpers/tests.
If existing behavior already provides this guarantee, record it and close without changing flags.

## Draft C: align existing consumers with the final durable standard

**Target:** separate future issues for the personal site, company site and Etch website.
**Status:** local drafts only; do not regenerate or deploy a consumer as part of this assessment.

**Problem and evidence:** all three inspected website workflows lack broad scheduled validation;
source wiring alone cannot prove live protections, execution or final durable coverage. Forge's
new scheduling/routing policy should be considered explicitly rather than copied wholesale.

**Benefit:** detect drift outside PR activity while retaining each site's own dependencies,
content checks, deployment authority and performance budgets.

**Shared acceptance evidence:** record the final durable-command mapping, first successful provider
run and protection/settings observations; propose one weekly broad validation plus manual dispatch
if the owner adopts the standard. Verify a scheduled run validates all intended jobs while
publication remains restricted to authorized branch pushes. Keep existing post-deploy smoke.
Preserve intentional provider differences and record unavailable live evidence as unverified.

| Future consumer issue                                    | Additional acceptance evidence                                                                                                                        | Prerequisites                                                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Personal site: adopt final scheduling and durable checks | Pagefind build and generated resume Markdown still consume the single artifact; retain Node 26, three browser engines and custom content validation   | Final Forge standard; inspect consumer protections and recent runs; owner approval before consumer mutation                     |
| Company site: adopt final scheduling and durable checks  | Sitemap aggregation, typecheck/Astro diagnostics, coverage and local Lighthouse budgets remain covered; do not require browser formatter/CMS extras   | Final Forge standard; inspect consumer protections and recent runs; owner approval before consumer mutation                     |
| Etch website: align nested website validation            | Nested installation/lock paths, documentation checks, dependency audit and website artifacts survive; Python engine/release checks remain independent | Final Forge standard; inspect website/Python trigger interaction, protections and runs; owner approval before consumer mutation |

## Verification limits and handoff

This assessment changed documentation only. No consumer code, external issue, repository setting,
workflow execution, package installation in consumers or deployment was created. Runtime imports,
resolved dependency versions, live smoke results, protection enforcement and GitLab execution are
unverified. Review drafts against the completed integration branch before opening external work;
package upgrades or optional website features require separate scope and compatibility evidence.
