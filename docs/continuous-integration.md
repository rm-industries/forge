# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks

Required checks are configured in GitHub repository settings. Use the individual
tool, package and consumer job names, including each compatibility lane.
Tool names are prefixed to distinguish them from website checks. Path-filtered
website/automation jobs are not globally required.

After the CI refactor merges, replace the legacy `Project` requirement with those
individual checks as a one-time repository administration step. Derive the names
from the workflows and their reported GitHub check runs. No branch-protection
payload or synchronization mechanism is stored in the repository.

## Check execution

Project and generator workflows run on every pull request and push to main, so
required results cannot disappear behind workflow path filters. Project owns tool
quality, package inspection and package compatibility. Generator owns packaged
CLI bootstrap, consumer compatibility and generated-output checks. Job graphs retain native dependencies and artifact reuse.

Repository automation scans only committed `.github` workflows/actions and is
path-filtered. Website validation is separately scoped to website/docs/setup
changes. Consumer projects also use direct job dependencies without an aggregate;
deployment waits for all project checks, then smoke-tests the deployed URL.

## Runtime and evidence strategy

Project CI runs repository formatting, lint, spelling, documentation and root
checks once on Node 26. It builds and packages candidate packages once, without
repeating prepack hooks. The minimum Node 22 release and latest Node 22, 24 and
26 releases run package types and unit tests and exercise the packaged
content-model exports. Build tooling itself uses the primary development runtime.

Generator CI independently packages create-forge once as fixture preparation.
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

The path-scoped `.github/workflows/website.yml` workflow intentionally mirrors
the generated template's workflow. It runs when website source, its workflow,
or its shared setup action changes. The two sites use the same ownership model:

| Stage              | Owner                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| Source checks      | Format, code/style/Markdown lint, spelling, Knip, and Astro diagnostics |
| Unit tests         | One coverage run alongside source checks                                |
| Build              | One production build and an immutable build artifact upload             |
| Artifact consumers | Build validation, three-browser tests, and Lighthouse                   |
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

This separation does not waive release security policy. Package
publication runs the root audit explicitly and also runs the standalone template
audit before publishing `create-forge`. Repository checkpoint releases require
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
GitHub/GitLab support. Repository checks run on every change; the previous change
routing no longer skips repository jobs.

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

Website includes are scoped to website, documentation and GitLab configuration
changes. Generator includes watch templates, package/scripts/configuration and
CI inputs. Root project checks run for every accepted pipeline. GitLab uses
[native includes and needs](https://docs.gitlab.com/ci/yaml/) for composition.

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
