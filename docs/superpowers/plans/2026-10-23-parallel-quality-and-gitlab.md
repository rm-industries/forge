# Parallel repository quality and native GitLab workflows

Approved direction: independent native-filtered project workflows, source tests for
ordinary packages, artifact checks for Browser Formatter and Create Forge, full
site validation owned by Template/Website, and explicit model/CMS integration.

## Scope

- GitHub: seven independent root jobs (format, code lint, Markdown lint, spelling,
  documentation, types, tooling tests). A single `Repository quality` gate requires
  success from every job, including rejecting cancellation and unexpected skips.
- GitLab: native local project includes and `rules:changes`, with broad schedule/web
  execution. Parallel root jobs remain unconditional. Ordinary packages build/inspect
  once and test source on minimum/latest Node 22, 24 and 26 Linux lanes. Template
  owns full site checks; CLI owns packed smoke/scenarios. Browser Formatter owns
  native reproducibility/packed browsers; integration owns model/CMS probes.
- Delete the impact selector/adapter and obsolete tests. Do not replace them with
  a generated pipeline or new selection script. Use existing public commands.
- Preserve GitLab reporting, immutable build reuse and disabled GitLab deployment.
  No generated consumer CI, release/protection settings, merge or production actions.
- Preserve unrelated `.serena/` and `docs/specs/`.

## Work and validation

1. Implement the GitHub parallel jobs and gate; execute the actual gate command
   against success, failure, cancellation and skipped prerequisites.
2. Translate GitLab ownership into independent native YAML. Validate native rules,
   producer/consumer dependencies, Linux runtimes and reporting. Remove the old
   selector/child pipeline and selector-specific tests.
3. Update current CI documentation, run applicable root/package types/tests,
   Actionlint, Zizmor and YAML/shell checks, review the integrated diff, then push
   the existing PR. Distinguish local evidence from live GitLab lint/runner results.

GitLab schedules must be configured separately. Website production remains owned
by GitHub and restricted to validated main pushes. GitLab path rules follow native
MR/default-branch comparisons; schedule/web jobs run broadly without deployment.

## Verification evidence

- Actual GitHub gate command accepts seven successes and rejects failure,
  cancellation, skip, unknown or empty results; all seven jobs have no dependencies.
- Root: 50 tests, repository/integration types, code lint and documentation checks
  pass. Changed files pass formatting, Markdown lint and spelling; Actionlint and
  offline Zizmor pass. Final source review found no actionable issues.
- GitLab: ten YAML files, 37 resolved jobs and 149 shell blocks pass local checks.
  Thirty-six event/path scenarios use the actual Ruby matcher and validate active
  dependencies; seven pipeline-admission scenarios cover duplicate suppression.
- Actual Node 26 ordinary-package commands pass build, publishable-file inspection,
  types and 59 tests with JUnit reports. Template archive restoration preserves all
  95 source files byte-for-byte, including hidden configuration and starter tests.
- No authenticated GitLab project is configured here, so live CI Lint/runner,
  alternate container runtimes, native/browser/Lighthouse orchestration and
  schedules remain unverified. No settings or production actions were performed.
