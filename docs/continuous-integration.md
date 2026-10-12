# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks

Repository rulesets should require these check names on `main`:

- `Project` — aggregate repository, package, template, and generator
  correctness and quality.

`Project` runs on every pull request. Individual jobs remain visible for
diagnosis, but only the aggregate needs to be named in branch protection. If a
job is added to or removed from a required workflow, update its aggregate
`needs` list in the same pull request.

## Check execution

Every repository check runs on each pull request and push to `main`. There is no
change-classification job. The `Project` aggregate uses `always()` and requires
every prerequisite to succeed; a failure, cancellation or skipped prerequisite
fails the aggregate. The build retains its static-check dependencies.

`Workflow syntax` runs Actionlint and `Workflow security` runs Zizmor. Both run
only when workflow files change, and both must pass before merging an automation
change. Zizmor also uploads its findings to GitHub code scanning. Do not
configure either check as globally required: unrelated pull requests would wait
for a path-filtered workflow that never started. Treat them as conditional
required review signals for automation changes. The repository workflow watches
both `.github/**` and the generated template's workflow source under
`templates/default/.github/**`.

Generated GitHub projects also expose a `Project` aggregate. It includes source
checks, build consumers and runtime compatibility, and runs after failed jobs so
the required result cannot disappear. Deployment depends on that aggregate.
CodeQL, dependency review and Dependabot alerts remain visible security signals.

## Runtime and evidence strategy

The minimum Node 22 release and the latest Node 22, 24, and 26 releases each run
package type checks, tests, and builds. Standalone-template compatibility keeps
the same matrix because generated projects declare those runtimes. The primary
site quality jobs run once on Node 26. Generated workflows also
exercise the supported Node versions in a separate compatibility job. The packed generator
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

The `Project` aggregate depends on all required jobs. A failure retains its
specific job name while preventing the aggregate from succeeding. Its log reports prerequisite results for diagnosis.

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
evidence is uploaded on failure, when Playwright retains its report and trace
directories. Artifacts are retained for seven days.

## Security reporting and release gates

Dependency and source-code security analysis reports findings without joining
the stable `Project` check or the conditional workflow checks:

- CodeQL uploads source analysis results to GitHub code scanning;
- Zizmor uploads workflow analysis results to code scanning and fails `Workflow
security` when it finds an insecure workflow;
- Dependabot alerts use the repository dependency graph as the canonical view of
  vulnerable npm dependencies;
- dependency review annotates introduced dependency risk without blocking a
  remediation pull request; and
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

When changing aggregate or artifact behavior, use a temporary review branch to
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
