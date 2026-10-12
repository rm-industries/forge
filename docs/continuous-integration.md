# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks

The proposed required checks are listed in
[required-status-checks.json](../.github/required-status-checks.json). They cover
individual tool, copied-template and generator checks, including compatibility
lanes. Tool job names are prefixed to distinguish them from website checks.
Advisory audits and path-filtered website/automation jobs are not globally required.

Main currently requires `Project`. This PR removes that aggregate and prepares
its replacement policy. Before merging, apply the reviewed individual checks
through the repository branch-protection settings, after they have reported on
the PR head. Do not leave the removed `Project` context required. The JSON is a
reviewable payload for the required-status-checks API, not an automatic settings
change. Existing branch-protection settings outside required checks stay intact.

## Check execution

Project and generator workflows run on every pull request and push to main, so
required results cannot disappear behind workflow path filters. Project owns tool
quality, package inspection and runtime compatibility. Generator owns copied
consumer templates, packed bootstrap tests, compatibility and disposable-output
syntax/security scanning. Job graphs retain native dependencies and artifact reuse.

Repository automation scans only committed `.github` workflows/actions and is
path-filtered. Website validation is separately scoped to website/docs/setup
changes. Consumer projects also use direct job dependencies without an aggregate;
deployment waits for all project checks, then smoke-tests the deployed URL.

## Runtime and evidence strategy

The minimum Node 22 release and the latest Node 22, 24, and 26 releases each run
package type checks, tests, and builds. Standalone-template compatibility keeps
the same matrix because generated projects declare those runtimes. The primary
site quality jobs run once on Node 26. Generated workflows use one bootstrap-selected Node major; Forge tests the
supported runtime range in its own compatibility jobs. The packed generator
compatibility suite runs on the four supported Linux runtimes and on the current
macOS runner with Node 26. Each compatibility lane records its operating system,
architecture, Node, npm, and Git versions before exercising the installed
generator executable.

Formatting, Markdown, spelling, package inspection, coverage, Lighthouse,
isolation, and the complete generated-project acceptance suite run once on the
primary Node 26 runtime because repeating them does not add compatibility
evidence. The blocking Playwright suite runs once in each of Chromium, Firefox,
and WebKit using the browser revisions associated with the committed Playwright
version.

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

The repository's clean-copy template verification follows the same pattern on
its primary Node 26 lane: `Template production build` creates one artifact for
both template browser tests and Lighthouse. The template compatibility matrix
still builds once per supported runtime because those builds prove a different
contract and cannot share a Node 26 result.

Coverage and Lighthouse uploads run even when their producer fails. Lighthouse
uploads explicitly include the hidden `.lighthouseci` directory. Browser
website evidence is uploaded even after successful runs; template browser
evidence retains its existing failure-only policy. Playwright preserves failure
traces and screenshots. Artifacts are retained for seven days.

## Security reporting and release gates

Security analysis stays separate from project correctness checks:

- CodeQL uploads source analysis results to GitHub code scanning;
- Zizmor uploads workflow analysis results to code scanning and fails `Workflow
security` when it finds an insecure workflow;
- Dependabot alerts use the repository dependency graph as the canonical view of
  vulnerable npm dependencies;
- dependency review fails on newly introduced high or critical vulnerabilities,
  matching generated consumer CI; branch protection controls merge enforcement; and
- root, template, and website dependency-audit jobs retain audit output and job
  summaries but tolerate findings during pull-request sequencing.

This separation allows two independently owned lockfiles or dependency paths to
be remediated in sequence. It does not waive release security policy. Package
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
includes validate copied templates, packed bootstrap behavior and Linux runtime
compatibility. GitHub retains the macOS generator runner, CodeQL, dependency
review, workflow scans, mirror synchronization and release automation. GitLab
validation is supplemental; server-side CI Lint and a configured runner are still
needed to confirm it on the mirror.

Website includes are scoped to website, documentation and GitLab configuration
changes. Generator includes watch templates, package/scripts/configuration and
CI inputs. Root project checks run for every accepted pipeline. GitLab uses
[native includes and needs](https://docs.gitlab.com/ci/yaml/) for composition.
