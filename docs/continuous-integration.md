# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks

Repository rulesets should require these check names on `main`:

- `Project` — aggregate repository, package, template, website, and generator
  correctness and quality.

`Project` runs on every pull request. Individual jobs remain visible for
diagnosis, but only the aggregate needs to be named in branch protection. If a
job is added to or removed from a required workflow, update its aggregate
`needs` list in the same pull request.

## Change routing

The `Classify changes` job compares the complete pull-request or push range and
emits only reviewed boolean outputs. Changed filenames are passed to the typed
classifier as NUL-delimited data; filenames never become workflow commands or
shell expressions. The classifier selects these job groups:

| Change class        | Selected validation                                                              |
| ------------------- | -------------------------------------------------------------------------------- |
| Documentation only  | Format, Markdown lint, spelling, and documentation links and commands            |
| Content model       | Repository/package checks and supported-runtime compatibility                    |
| Create Forge        | Repository/package checks, compatibility, and packed generator end-to-end        |
| Default template    | Package build/pack, every template check, and packed generator end-to-end        |
| Project website     | Website static, runtime, coverage/build, browser, and Lighthouse checks          |
| Area dependency     | The affected area above plus informational dependency auditing                   |
| Shared or ambiguous | Every repository, package, template, website, compatibility, and generator check |

Documentation inside the bundled default template follows the template route,
because it becomes part of generated projects. Root manifests and lockfiles,
`.github/**`, shared `scripts/**`, root tooling, mixed unclassified paths, and an
empty or unavailable comparison deliberately select the full suite. A newly
introduced path is therefore expensive until its ownership is reviewed and
added to the classifier. Security analysis remains independent and broad.
Website manifests and lockfiles stay on the website route and select its
standalone informational audit. They do not also run the root workspace audit.
Package-only changes do not select website browser or Lighthouse work.

Every job remains in the `Project` aggregate's `needs` graph. The aggregate uses
`always()` so jobs intentionally skipped by routing cannot leave the required
check pending. It accepts only `success` and `skipped`; any selected failure or
cancellation fails `Project`. The build retains its static-check dependency and
runs only when package work is selected and every prerequisite succeeded or was
intentionally skipped.

For a documentation-only pull request, expect `Classify changes`, `Format`,
`Lint Markdown`, `Spellcheck`, `Documentation links and commands`, and `Project`
to run. Package, compatibility, template, browser, Lighthouse, and generator
jobs should appear as skipped. This provides a quick review checklist for the
lightweight route without weakening the required aggregate.

`Automation` aggregates Actionlint workflow-syntax validation and Zizmor
workflow-security analysis, and runs only when workflow files change. Both must
pass: malformed or insecure workflow changes fail the aggregate, while Zizmor
also uploads its findings to GitHub code scanning. Do not configure `Automation`
as a globally required status check: unrelated pull requests would wait for a
path-filtered workflow that never started. Treat it as a conditional required
review signal for automation changes. The repository workflow watches both
`.github/**` and the generated template's workflow source under
`templates/default/.github/**`.

The generated template uses the same `Project` and conditional `Automation`
results. Generated repositories should require `Project` after enabling GitHub
Actions, while requiring a successful `Automation` result whenever it appears.
CodeQL, dependency review, and Dependabot alerts remain visible security signals
rather than required merge checks.

## Runtime and evidence strategy

The minimum Node 22 release and the latest Node 22, 24, and 26 releases each run
package type checks, tests, and builds. The standalone template uses the same
matrix, with one clean install per runtime. The project website is a deployed
application rather than a published compatibility surface, so it installs from
`website/package-lock.json` and runs its types, unit tests, build, and
generated-output validation once on the primary Node 26 runtime. The packed
generator compatibility suite runs on the four supported Linux runtimes and on
the current macOS runner with Node 26. Each lane records its operating system,
architecture, Node, npm, and Git versions before exercising the installed
generator executable.

Formatting, Markdown, spelling, package inspection, coverage, Lighthouse,
isolation, and the complete generated-project acceptance suite run once on the
primary Node 26 runtime because repeating them does not add compatibility
evidence. The blocking Playwright suite runs once in each of Chromium, Firefox,
and WebKit using the browser revisions associated with the committed Playwright
version.

The `Project` aggregate depends on all required jobs. A failure retains its
specific job name while preventing the aggregate from succeeding. Its log also
records the classifier's selected groups so unexpected routing can be audited
without opening every skipped job.

Coverage and Lighthouse uploads run even when their producer fails and treat a
missing report directory as an error. Lighthouse uploads explicitly include the
hidden `.lighthouseci` directory. Browser evidence is uploaded on failure, when
Playwright retains its report and trace directories. Artifacts are retained for
seven days.

## Security reporting and release gates

Dependency and source-code security analysis reports findings without joining
the stable `Project` or conditional `Automation` aggregates:

- CodeQL uploads source analysis results to GitHub code scanning;
- Zizmor uploads workflow analysis results to code scanning and blocks the
  conditional `Automation` aggregate when it finds an insecure workflow;
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
prove the failure path. An intentionally invalid workflow or Zizmor finding must
make `Automation` fail, with the Zizmor finding also uploaded to code scanning. A
Lighthouse run that omits `.lighthouseci` must make its upload contract fail.
Remove the deliberate defect before merging and link both workflow runs in the
tracking issue.
