# Consumer CI comparison

Internal review for PR #293, recorded October 12, 2026. This compares actual
bootstrap output with Forge's native YAML and the reference website, rather
than comparing only the TypeScript builders. No pipeline behavior was changed.

## Inputs

- Forge review branch commit `3ce4824`, based on merged PR #292.
- Fresh standalone bootstrap fixtures with both providers, selecting GitHub and
  GitLab separately as primary. Default Node major: 26.
- Reference repository main commit `2b08a7f40ffb0b9afee696a83f9ecf3b8ec56070`.
  Its current project, automation and security workflows were fetched for review;
  the local checkout was older by a CodeQL pin update.

[Reference project workflow](https://github.com/rahul0705/rahul0705.github.io/blob/2b08a7f40ffb0b9afee696a83f9ecf3b8ec56070/.github/workflows/project.yml),
[security workflow](https://github.com/rahul0705/rahul0705.github.io/blob/2b08a7f40ffb0b9afee696a83f9ecf3b8ec56070/.github/workflows/security.yml),
and [automation workflow](https://github.com/rahul0705/rahul0705.github.io/blob/2b08a7f40ffb0b9afee696a83f9ecf3b8ec56070/.github/workflows/automation.yml).

## GitHub comparison

| Area                  | Generated consumer                                                                            | Reference website / Forge                                                                                          | Assessment                                                            |
| --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Workflow boundaries   | Project, security, automation                                                                 | Same reference boundaries; Forge also has website, generator and maintenance workflows                             | Matches consumer scope                                                |
| Source validation     | Format, code/styles/Markdown lint, spelling, unused code, types, coverage                     | Reference has the same core checks with unit tests; Forge website uses coverage                                    | Matches Forge website; adds coverage relative to reference            |
| Build graph           | Eight source checks gate one build; browser, Lighthouse and build validation reuse it         | Same graph in reference and Forge website                                                                          | Matches                                                               |
| Site-specific output  | No generated resume Markdown check                                                            | Reference validates generated resume Markdown                                                                      | Intentional: template does not generate resumes                       |
| Dependency audit      | Additional advisory npm audit                                                                 | Forge website has advisory audit; reference project does not                                                       | Intentional inherited Forge policy                                    |
| Deployment gate       | Direct dependencies on all shared jobs, including advisory audit                              | Reference and Forge website directly depend on checks; neither has a project aggregate                             | Matches structure; consumer waits for audit completion too            |
| Production deployment | Main push only, validated Pages artifact, separate privileged deploy job                      | Same reference and Forge website behavior                                                                          | Matches                                                               |
| Smoke tests           | Deployment output URL, Chromium, failure artifacts, nonempty URL check and ten-minute timeout | Same reference safeguards; Forge website lacks the explicit timeout/URL check                                      | Matches reference in both providers                                   |
| Runtime setup         | Inline setup-node, npm cache/install; selected major 22/24/26                                 | Reference uses a local setup action with lts/*; Forge selects explicit versions and tests compatibility separately | Intentional single consumer runtime; no local action is required      |
| Artifact policy       | Seven days; browser/coverage/Lighthouse evidence uploaded always                              | Reference uses fourteen days, browser evidence only on failure                                                     | Intentional diagnostics/retention choice; more successful-run uploads |
| CodeQL                | Actions and JS/TS, no build, extended queries                                                 | Same reference and Forge security checks; current CodeQL pin matches reference v4.38.2                             | Matches                                                               |
| Dependency review     | High/critical findings fail the security check                                                | Matches reference; Forge itself still makes it advisory                                                            | Matched consumer policy; branch protection decides merge enforcement  |
| Project triggers      | All main PRs/pushes                                                                           | Reference same; Forge website is scoped to website/docs/setup inputs                                               | Intentional: standalone consumer is the entire project                |
| Security triggers     | Main PRs/pushes and weekly deterministic schedule                                             | Reference additionally covers dev; Forge covers main                                                               | Intentional default branch scope                                      |
| Automation triggers   | .github/** and deterministic weekly schedule                                                  | Reference additionally has manual dispatch and an automation summary gate; Forge has neither                       | Matches Forge; optional consumer convenience omitted                  |
| Aggregate checks      | No project or automation aggregate                                                            | Reference has no project aggregate but does have an automation aggregate; Forge root Project remains deferred      | Direct checks retained; branch protection is consumer-owned           |
| Pins and updates      | Immutable action SHAs with version comments; consumer Dependabot                              | Same action-update model; generator mirrors bundled tested Forge pins                                              | Matches; npm package releases carry bootstrap pin refreshes           |

Job IDs and command names differ where the template's npm interface differs:
`unit-tests` uses `test:coverage`, `lint-styles` uses `lint:css`, and
`browser-tests` uses `test:e2e`. These commands exist in the generated package.
They are naming differences, not missing checks.

## GitLab comparison

GitLab renders the same thirteen shared work jobs, plus deploy and smoke jobs.
It uses native stages and needs, passes the build artifact to downstream checks,
and publishes that artifact with Pages. The selected Node major is used in
container images. Main/default-branch deployment is restricted to pushes and
child pipelines; merge-request validation does not deploy. Inactive deployment
and smoke jobs use rules with when: never. Inactive GitHub jobs and Pages uploads
use if: false. Switching GitHub on also requires enabling its Pages upload step.

The providers are equivalent for project validation and deployment intent, but
not yet equivalent across the full security and maintenance surface:

- GitLab has advisory npm audit, but no generated CodeQL-equivalent source scan,
  dependency-review equivalent, or workflow security/syntax scanner jobs.
- The delivered Dependabot configuration targets GitHub Actions and npm. It does
  not provide automatic updates for GitLab Node image tags or a GitLab-hosted
  repository's dependencies. A GitLab-native updater remains a separate decision.
- GitLab does not configure a dependency cache. Browser jobs install their browser
  dependencies for each run. This affects duration, not validation coverage.
- GitHub scopes privileged permissions per job. GitLab access depends on runner,
  project and token configuration; matching job graphs does not establish matching
  security guarantees.
- GitLab currently emits one pipeline file, or a namespaced child pipeline file.
  It does not split security/automation into includes because those provider jobs
  have not been implemented.

## Review conclusions

The generated GitHub pipeline follows the reference's core design closely.
The major intentional differences are consumer runtime selection, coverage,
advisory audit, diagnostics retention and distributed schedules. Forge root's
compatibility, packaging and generator checks should not be shipped to consumers.

Before calling the providers fully equivalent, resolve GitLab security/updater
scope. Consumer dependency review now matches the reference: high/critical findings
fail the security check. Smoke timeout and empty-URL
validation now match the reference in both generated providers. Remaining policy
findings are documented for explicit review.

## Verification limits

Both primary-provider fixtures were generated successfully. Existing provider
schema tests, actionlint/security scans and hosted PR checks cover rendering and
GitHub validation. No live Pages deployment, GitLab server-side CI Lint, branch
protection configuration or GitLab runner setup was exercised for this comparison.
