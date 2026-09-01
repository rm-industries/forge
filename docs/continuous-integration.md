# Continuous integration

Forge separates repository quality, workflow validation, and security analysis
so each required result has one stable purpose.

## Required checks

Repository rulesets should require these check names on `main`:

- `Project` — aggregate repository, package, template, and generator quality;
- `CodeQL` — aggregate JavaScript/TypeScript and GitHub Actions analysis.

`Project` runs on every pull request. Individual jobs remain visible for
diagnosis, but only the aggregate needs to be named in branch protection. If a
job is added to or removed from a required workflow, update its aggregate
`needs` list in the same pull request.

`Automation` aggregates workflow syntax and workflow-security validation, but it
runs only when workflow files change. Do not configure it as a globally required
status check: unrelated pull requests would wait for a path-filtered workflow
that never started. Treat it as a conditional review signal for automation
changes. The repository workflow watches both `.github/**` and the generated
template's workflow source under `templates/default/.github/**`.

The generated template uses the same `Project` and conditional `Automation`
results. Generated repositories should require `Project` and `CodeQL` after
enabling GitHub Actions, while reviewing `Automation` whenever it appears.

## Runtime and evidence strategy

The minimum Node 22 release and the latest Node 22, 24, and 26 releases each run
package type checks, tests, and builds. The standalone template uses the same
matrix, with one clean install per runtime. Formatting, Markdown, spelling,
package inspection, coverage, browser tests, Lighthouse, isolation, and packed
generator acceptance run once on the primary Node 26 runtime because repeating
them does not add version-compatibility evidence.

The `Project` aggregate depends on all required jobs. A failure retains its
specific job name while preventing the aggregate from succeeding.

Coverage and Lighthouse uploads run even when their producer fails and treat a
missing report directory as an error. Lighthouse uploads explicitly include the
hidden `.lighthouseci` directory. Browser evidence is uploaded on failure, when
Playwright retains its report and trace directories. Artifacts are retained for
seven days.

## Dependency audits

The root `Dependency audit` job applies `audit-ci.jsonc` to the root lockfile and
npm workspaces. The standalone template owns a separate lockfile and
`templates/default/audit-ci.jsonc`, so its static-quality job enforces that
policy independently.

Both policies reject high and critical vulnerabilities. An exception must name
the exact GitHub Security Advisory ID, explain why the affected path is safe for
Forge's use, include an expiry date, and link upstream tracking when available.
Do not allowlist package names or severity classes. Expired entries must be
removed or re-evaluated in a dedicated pull request.

Run the repository audit locally with:

```sh
npm run audit
```

Run the template policy from `templates/default` with the same command.

## Negative verification

When changing aggregate or artifact behavior, use a temporary review branch to
prove the failure path. An intentionally invalid workflow must make `Automation`
fail. A Lighthouse run that omits `.lighthouseci` must make its upload contract
fail. Remove the deliberate defect before merging and link both workflow runs in
the tracking issue.
