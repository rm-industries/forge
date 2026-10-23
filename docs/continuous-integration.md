# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks and migration

GitHub repository settings still require the 27 individual Tool and Generator
contexts recorded in the [baseline](reviews/ci-baseline-367.md). Their names and
runtime matrix entries remain intact. Unaffected required jobs start and report
successful no-ops; they do not disappear behind workflow path filters.

`Tool validation`, `Generator validation` and `Website validation` summarize the
complete corresponding graph on every PR. A failed selection, required prerequisite,
cancellation or unexpected skip fails the summary. Website intentionally accepts
unrelated site-job skips and PR/schedule/manual deployment skips; affected main
pushes must pass deployment and deployed smoke too. The new candidate frontmatter
check also gates the existing required Tool Pack context.

No protection or environment setting changed. To migrate safely after approval:

1. Publish the reviewed branch and inspect actual GitHub check runs, including
   unaffected work and deliberate failure/cancellation scenarios on a review branch.
2. Keep the 27 legacy requirements while verifying the three summaries report on
   all PRs, are GitHub Actions checks and reject necessary failures.
3. Separately approve replacing those legacy requirements with the three summaries.
   Preserve other review, environment and publication protections.
4. Only after that settings change, consider removing legacy no-op runner jobs in a
   separate reviewed change. This implementation retains them for compatibility.

Rollback before protection migration is a revert of the implementation. After
migration, restore the baseline context requirements before reverting workflows
that emit the summaries. Keep the corresponding protection/workflow states aligned;
no automatic settings synchronization is installed.

## Check execution

| Workflow            | Responsibility and selected inputs                                                                          | Broad coverage                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Project             | Root quality always; local package closure, inspected packs and candidate integrations                      | PR/main push; Monday 07:11 UTC; manual       |
| Generator           | Packed CLI, isolated generated consumers and provider/tool regressions for generator/template/shared inputs | PR/main push; Monday 07:23 UTC; manual       |
| Website             | Independent website plus docs content; build, accessibility, budgets and main-push deployment               | PR/main push; Monday 07:41 UTC; manual       |
| Browser Oxfmt       | Native reproducibility, packed browsers and CMS serialization for browser/model/template/shared inputs      | PR; Monday 07:53 UTC; manual                 |
| Automation/security | Workflow syntax/security, CodeQL and dependency review                                                      | Existing scoped/event and security schedules |
| GitLab mirror       | Supplemental selected native project/generator/website child pipeline                                       | MR/default push; schedule/web admission      |

Unknown paths, missing revisions or an empty change set select broad validation.
Actual diff failures fail selection. Mixed edits union actual consumers; deleted
paths and both sides of renames participate. Weekly/manual GitHub runs validate
all lanes, without production deployment or publication. GitLab needs a separately
configured weekly schedule; admitting schedule events does not create one.

See [package impact](reviews/package-impact-373.md),
[website coverage](reviews/website-ci-375.md), [GitLab routing](reviews/gitlab-impact-374.md)
and [generated CI](reviews/generated-ci-377.md) for the consumption and failure contracts.
The [test disposition](reviews/consumer-test-disposition-367.md) distinguishes durable
consumer checks from Forge-owned starter assertions. Existing consumer YAML remains
consumer-owned; no migration or regeneration is automatic.

## Runtime and evidence strategy

Project CI runs repository formatting, lint, spelling and documentation on Node 26.
Affected package work also runs root checks, then builds and packages the selected
local workspace closure once, without
repeating prepack hooks. The minimum Node 22 release and latest Node 22, 24 and
26 releases run selected package types and unit tests. When content-model is
selected, they also exercise its packaged exports. Build tooling itself uses the primary development runtime.

When generator/template/shared inputs change, Generator CI independently packages
create-forge once as fixture preparation.
Its four Linux Node lanes and Node 26 macOS lane install the same CLI package,
bootstrap one consumer per lane with the matching Node major, then run consumer
types, unit tests and a build. No candidate content-model package is substituted:
consumer npm ci uses the template lockfile, and a check verifies its content-model
entry and declared version remain unchanged. Generated source also retains
isolation checks for local dependencies, unresolved tokens and personal identifiers.

The primary Linux Node 26 consumer provides coverage, a source archive including
hidden configuration files, and its production artifact. Static quality,
generated CI syntax/security, build validation, browser/accessibility and
Lighthouse jobs restore those artifacts rather than bootstrapping or rebuilding.
Dependencies are installed per job because jobs have isolated filesystems.

Distinct CLI behavior scenarios run once with the shared package. Deliberately
invalid static-tool fixtures remain separate to prove that quality tools reject
bad input. Their isolated copies are intentional regression tests, not another
canonical consumer validation path.

Forge's `.github/workflows/website.yml` uses an independent selector and stable
summary. Docs-only Markdown changes retain Chromium/axe, build and Lighthouse;
other affected changes retain the full browser matrix. Generated consumers run
Chromium/axe on PRs and normal pushes, with the full matrix on weekly/manual runs;
Lighthouse runs after pushes, weekly and manually. All retain the same core
artifact ownership model:

| Stage              | Owner                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| Source checks      | Format, code/style/Markdown lint, spelling, Knip, and Astro diagnostics |
| Unit tests         | One coverage run alongside source checks                                |
| Build              | One production build and an immutable build artifact upload             |
| Artifact consumers | Build validation, selected browser tests, and Lighthouse                |
| Deployment         | The Pages artifact packaged by the build job                            |
| Live verification  | One Chromium smoke suite for routes, assets, and mobile overflow        |

Artifact consumers depend only on the build and download its immutable output;
they never rebuild or mutate it. Forge has no generated Markdown artifact, so a
post-build Markdown job would add no coverage. Source Markdown remains owned by
the source lint job. Package and generator compatibility jobs remain separate
because they intentionally exercise multiple supported runtimes.

Coverage and Lighthouse uploads run even when their producer fails. Lighthouse
uploads explicitly include the hidden `.lighthouseci` directory. Browser
website and generated-consumer evidence is uploaded even after successful runs. Playwright preserves failure
traces and screenshots. Artifacts are retained for seven days.

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
