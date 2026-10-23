# Continuous integration

Forge-owned GitHub workflows use native path filters and independent project checks.
The approved [workflow design](superpowers/specs/2026-10-23-github-project-workflows-design.md)
supersedes the earlier shared-selector and legacy no-op implementation.

## Required checks and migration

`Repository quality` is the sole proposed required CI context. It runs on every PR
and main push without path filters: root formatting, code/Markdown lint, spelling,
documentation, repository TypeScript and CI contracts. Package runtime tests and
builds belong to their own workflows. `npm run test:contracts` excludes the
cross-package model test; `npm run test:root` retains it for local and GitLab use.
`npm run typecheck:root` also retains integration types for local and GitLab use;
Repository quality uses direct `npx tsc --noEmit`.

No branch protection, environment or publication settings have been changed.
The historical 27 contexts and exact proposed removal map are in the
[migration map](reviews/github-workflow-migration-367.md). The branch removes their
legacy producer jobs; the functioning workflow/protection pair on main stays in
place until a coordinated, separately approved transition. Missing legacy checks
on this branch are expected until that transition and can prevent merging.

1. Review the complete workflow change and inspect hosted project checks and
   artifacts, including failed validation and non-production schedule/manual runs.
2. Obtain separate approval to replace the exact 27 old requirements with
   `Repository quality`, removing any old summary requirements if present.
3. Coordinate settings and workflow merge so missing legacy results do not strand
   PRs. Preserve unrelated review, security, environment and publication protections.
4. Roll back by restoring the matching historical workflows and required-context
   settings together. No automated settings synchronization is installed.

Project-specific checks must be reviewed before merge; an optional failed check
will not itself enforce branch protection. Native filters have GitHub path limits
and require explicit updates for new shared inputs. Unknown paths have no custom
broad fallback; weekly/manual validation provides a backstop.

## Check execution

| Workflow                  | Responsibility and primary inputs                                                                                                                | Broad cadence (UTC Monday)              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Repository quality        | Root static/docs/types/contracts; every PR/main push                                                                                             | 07:11; manual                           |
| Website                   | `website/**`, consumed `docs/**`, shared locks/setup; full browsers, build, budgets and main-push deployment                                     | 07:41; manual                           |
| Template                  | `templates/default/**`, starter fixtures and verification tooling; isolated source quality, runtime/build, full browsers, budgets, customization | 07:23; manual                           |
| Content model             | Own package, shared locks/config/setup; types, unit tests, inspected package and supported runtimes                                              | 07:17; manual                           |
| Create Forge              | Own package, bundled template and actual pin-source workflows; CLI scenarios and packed-generator smoke                                          | 07:23; manual                           |
| Browser Oxfmt             | Own package and formatter configuration inputs; native reproducibility, Rust quality, packed browsers and runtime checks                         | 07:53; manual                           |
| Markdownlint              | Own package and shared tooling; types, unit tests and publishable-file inspection                                                                | 07:29; manual                           |
| Model and CMS integration | Own tests/tooling and shared locks/setup; cross-package model agreement and focused CMS serialization/preservation                               | 07:59; manual                           |
| Automation/security       | Workflow syntax/security, CodeQL and dependency review                                                                                           | Existing events/schedules               |
| GitLab mirror             | Existing selector and native project/generator/website child pipeline                                                                            | MR/default push; schedule/web admission |

See the YAML for each complete input list. Published upstream source edits do not
fan out to downstream consumers: consumers validate when their manifests/locks
change. The CLI also validates template edits because it bundles that source.
Integration source changes run their own workflow; ordinary upstream package edits
do not select it. The focused CMS serialization check retains metadata/body,
delimiter, failure-preservation and retry coverage. The separately known failing
CMS ordering probe is not enabled and serialization success does not prove it.
GitLab still uses its existing selector and requires a separately configured schedule.

## Runtime and evidence strategy

Content Model and Markdownlint run source tests and typechecks on all four supported
Linux Node lanes independently of one build and publishable-file inspection. They do
not transport or unpack package tarballs between jobs. Browser runtime lanes restore native
assets from the inspected package instead of installing Rust. Create Forge's four
Linux Node lanes and Node 26 macOS lane consume one packed CLI for distinct behavior
scenarios and a default generated build. Consumers install committed registry locks;
no unpublished upstream source is substituted.

Template validates an isolated canonical starter through `scripts/test-template.ts`.
Its primary runtime publishes source and build archives, reused by static quality,
build validation, browser/accessibility and Lighthouse jobs. Customization runs with
`npm run test:template:customization`. Deliberately invalid static-tool fixtures
remain separate regression checks. Generated workflow scans belong to Create Forge.

Website source checks gate one production build. Build validation, all three
browser projects and Lighthouse download that same immutable `website-build`
artifact. Only main pushes upload the Pages artifact and deploy after every quality,
artifact, browser and budget check passes. Deployed smoke follows deployment with
its existing timeout and URL guard. PRs, schedules and manual runs do not deploy or
publish. Browser evidence and hidden Lighthouse reports retain seven-day retention.

Generated consumer CI keeps its existing cadence and provider builders: Chromium/axe
on PRs and ordinary pushes, full browsers weekly/manually, Lighthouse on pushes and
weekly/manual runs. Generated YAML remains consumer-owned after bootstrap.

Earlier [verification evidence](reviews/ci-verification-379.md) is historical.
Local graph/contracts and syntax/security checks do not establish hosted execution,
native toolchain success, deployment, or repository-settings migration for this revision.

## Security reporting and release gates

Security analysis stays separate from project correctness checks:

- CodeQL uploads source analysis results to GitHub code scanning;
- Zizmor uploads workflow analysis results to code scanning and fails `Workflow
  security` when it finds an insecure workflow;
- Dependabot alerts use the repository dependency graph as the canonical view of
  vulnerable npm dependencies;
- dependency review fails on newly introduced high or critical vulnerabilities,
  matching generated consumer CI; branch protection controls merge enforcement.

Normal project, generator, website and generated consumer CI do not run dependency
vulnerability audit jobs. The unused-code audit remains a correctness check.

Package publication does not run dependency vulnerability audits; Dependabot
and dependency review handle dependency findings. Repository checkpoint releases require
the documented root, template, and website audits to pass.

Both policies reject high and critical vulnerabilities. An exception must name
the exact GitHub Security Advisory ID, explain why the affected path is safe for
Forge's use, include an expiry date, and link upstream tracking when available.
Do not allowlist package names or severity classes. Expired entries must be
removed or re-evaluated in a dedicated pull request.

Run the repository audit locally with:

```sh
npm run audit
```

Run the template and website policies explicitly with:

```sh
npm run audit --prefix templates/default
npm run audit --prefix website
```

The normal `quality` commands deliberately exclude vulnerability audits because
quality is a pull-request correctness gate. Dependabot treats `/website` as an
independent npm ecosystem and submits reviewable lockfile updates without
regenerating owned website source.

## Negative verification

When changing job dependencies or artifact behavior, use a temporary review branch to
prove the failure path. An intentionally invalid workflow must fail `Workflow
syntax`; a Zizmor finding must fail `Workflow security` and upload to code
scanning. A Lighthouse run that omits `.lighthouseci` must make its upload
contract fail.
Remove the deliberate defect before merging and link both workflow runs in the
tracking issue.

## Generated project CI

Create-forge internally uses TypeScript builders and provider-specific rendering
to bootstrap consumer YAML. Generated sites own that YAML and edit it directly.
See [CI providers](ci-providers.md) for generation, dependency pins and
GitHub/GitLab support. Generated stable `Project` results reject selection/prerequisite failures and
accept only intentional unaffected or PR-Lighthouse skips. Nested-site routing
uses its repository-relative directory; shared workflow/setup inputs also select
validation. See [generated CI](reviews/generated-ci-377.md) for details.

## Native GitLab validation

Forge maintains `.gitlab-ci.yml` and its project, generator and website includes
as native YAML. These files are edited directly, without a TypeScript generation
step. The website graph matches consumer checks and artifact reuse; GitHub remains
the primary provider. GitLab website deployment and smoke jobs are present but
use `when: never`. Configure Pages and the canonical site URL before enabling them.

Project includes validate the tool and its supported Node versions. Generator
includes package one CLI candidate, bootstrap per Linux runtime and reuse the
primary consumer for quality and build-artifact checks. GitHub retains the macOS generator runner, CodeQL, dependency
review, workflow scans, mirror synchronization and release automation. GitLab
validation is supplemental and uses Linux container runners for isolated Node
images. Server-side CI Lint and a configured runner are still
needed to confirm it on the mirror.

A prepare job emits selected native jobs as a dynamic child configuration. The
shared ownership selector chooses package workspaces, generator consumers and the
website, while root static/documentation checks remain. The parent mirror trigger
propagates child failure and cancellation. GitLab 18.2 or later is required for
`strategy: mirror`; live server/runner behavior remains unverified. GitLab uses
[native child pipelines and needs](https://docs.gitlab.com/ci/yaml/) for composition.

GitLab stage names describe their purpose: `prepare` packages the generator
candidate, `validate` covers source checks, `build` produces artifacts, and
`verify` checks packages or built consumers. Deployment and live verification
use `deploy` and `smoke`. Native needs relationships preserve independent job
flows across these stages. Generated consumer pipelines start at `validate`.

### Native CI reporting

GitLab receives JUnit results from Vitest and Playwright, including failed runs.
Node compatibility lanes add the runtime to Vitest case identifiers so results
remain distinct. Website unit coverage uses Cobertura for merge request coverage
annotations, and Oxlint emits Code Quality JSON with repository-relative paths.
Generated GitLab CI includes the same reports for consumer projects. HTML coverage,
browser reports and traces remain downloadable artifacts.

Disposable generator consumers publish JUnit results but do not publish coverage
annotations or Code Quality findings against Forge source: their files belong to
the bootstrapped project rather than this repository. Their coverage remains a
downloadable artifact. Formatting, CSS/Markdown linting and Lighthouse still report
through job logs and their existing artifacts.

GitHub uses the built-in Vitest GitHub Actions reporter for failure annotations and
test summaries, explicit Oxlint GitHub annotations, and Playwright's GitHub
reporter. Coverage HTML remains an artifact; GitHub does not consume GitLab's
Cobertura report declarations. No additional reporting action, service or write
permission is required.

GitLab Lighthouse jobs select Playwright Chromium with `CHROME_PATH` and set these
flags to support root execution and limited shared memory in Node containers:

```yaml
LHCI_COLLECT__SETTINGS__CHROME_FLAGS: --no-sandbox --disable-dev-shm-usage --disable-gpu
```

These settings are scoped to the audit jobs, including generated consumer pipelines.

## Consumer deployment environments

Create-forge accepts bootstrap-only deployment inputs for a named native Pages
environment and source branch. Validation runs on the configured branches;
deployment is owned by the primary CI. Consumers edit the resulting native YAML
without keeping Forge configuration. See the
[initializer's deployment options](../packages/create-forge/README.md#ci-generation)
for the JSON input and target limitations. This does not change Forge's own website
deployment or internal workflow ownership.
