# Generated consumer check execution

[Ticket 377](https://github.com/rm-industries/forge/issues/377) follows the
[consumer test disposition](consumer-test-disposition-367.md) and
[baseline inventory](ci-baseline-367.md). Consumer YAML remains editable owned source,
with no authoring files, new dependencies or regeneration obligation. Existing locks,
local commands, Dependabot, permissions, environments and artifact identities remain.

## Selection and cadence

| Input/event                                                               | Generated behavior                                                   | Reason                                                                                                                            |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Root site changes                                                         | All basic checks and build                                           | The repository is the site ownership boundary; unknown inputs remain broad.                                                       |
| Nested site directory                                                     | All basic checks and build                                           | Copied source, content, tests, locks and configuration affect delivered capabilities.                                             |
| Repository-root files, hidden directories, shared scripts/config/packages | All basic checks and build                                           | Shared tooling and uncertain root configuration must not silently bypass validation.                                              |
| Independent nested-site sibling directory                                 | Explicit successful no-op                                            | Initial generated sites have no external local source/build imports. Update conditions when adding dependencies outside the site. |
| GitHub unavailable/zero base SHA                                          | Broad validation                                                     | Initial pushes/manual events have no reliable comparison.                                                                         |
| GitHub diff execution failure                                             | Failed selection and failed Validation                               | A command error cannot report successful unaffected work.                                                                         |
| Normal PR/push                                                            | Chromium browser/accessibility                                       | Retained consumer tests scan current built public pages and exercise CMS/metadata/link contracts.                                 |
| Push                                                                      | Lighthouse before selected deployment                                | Protect performance, SEO and best-practice budgets without repeating the same audit on PR and merge push.                         |
| Weekly/manual                                                             | All checks, Lighthouse, Chromium/Firefox/WebKit                      | Catch engine differences and selection gaps; this uses committed locks, not lockless fresh installs.                              |
| Deployment                                                                | Existing primary-provider, source-branch push rules; smoke afterward | No production publication from PR, schedule or manual validation.                                                                 |

GitHub ships a weekly Tuesday project schedule with a repository-derived minute and manual dispatch.
GitLab YAML admits schedule/web pipelines and broad checks; the owner must create a weekly GitLab
pipeline schedule in repository settings. This change does not mutate those settings.

The measured baseline lists 12 generated validation jobs and complete three-browser PR execution.
Normal runs now install/run one browser instead of three, while keeping the full local command and
weekly/manual coverage. PRs omit one Lighthouse job. GitHub adds lightweight selection/result jobs;
GitLab adds a no-op job that is present only for unaffected work. These are execution-policy counts,
not measured live runtime savings. Browser accessibility and deployment smoke remain useful because
Lighthouse alone does not exercise navigation/link behavior or deployed wiring.

## Required results and deployment

GitHub retains existing job names and triggers every relevant branch PR/push without event path filters.
An inline, read-only selector diffs complete history with rename detection disabled so both sides of a
move are considered. All work depends on selection. An always-run `Validation` result expects success
for every selected prerequisite and permits only intentional skips (unaffected work and PR Lighthouse).
Selection failure, malformed output, cancellation and unexpected skipped prerequisites fail the result.
Consumers may require this additional result after inspecting their own runs; no protection settings change.

GitLab uses provider-native changes rules. Dependent work and deployment/smoke share the same input
selection, so unrelated changes do not leave mandatory needs pointing at absent jobs. Lighthouse is
excluded only for merge-request pipelines, where deployment is already excluded. Pipeline failure remains
native, with no allowed failures. The unaffected job skips installation and explicitly reports a no-op.
Scheduled/manual/parent pipelines select broad work. Multiple deployments retain branch-specific URLs
and primary-provider restrictions while composing those rules with input selection.

Builds still consume source quality gates once; verification downloads that build's `dist` artifact.
GitHub Pages consumes the same run's Pages upload; Cloudflare consumes the validated artifact with locked
Wrangler; GitLab Pages publishes the same configured directory. Smoke remains downstream of deployment.

## Evidence and limits

Existing parsed provider contracts cover selected runtime, standalone/nested paths, empty/native/Cloudflare
and multiple deployment plans, primary-provider restrictions, permissions and reports/artifact handoffs.
The emitted GitHub selector and required-result scripts run against real temporary Git histories and
prerequisite result matrices. The existing packed CLI harness executes emitted selection/result scripts
and its isolated consumer public commands; the harmless customization scenario remains unchanged from 376.

Actionlint checks emitted GitHub YAML with the checksum-verified pinned binary. Its constant-false
advisory is excluded only for the existing intentionally disabled inactive-provider
jobs/Pages upload. The baseline and changed GitLab-primary output each report exactly
three `if-cond` diagnostics: `constant expression "false" in condition`. The verification
command uses `-ignore '^constant expression "false" in condition'` and disables optional
ShellCheck/Pyflakes integration; other Actionlint diagnostics remain enabled. Provider schemas validate
GitLab YAML and dependency topology; this is not GitLab CI Lint or runner execution. No consumer branch
protections, schedules, live pipelines, deployment or production publishing are changed or claimed proven.
No live before/after timings are available. Preserve the previous YAML to roll back selection/cadence;
consumer owners can instead broaden input rules or run full browser/Lighthouse commands on every event.
