# GitLab mirror impact routing

[Ticket 374](https://github.com/rm-industries/forge/issues/374) reuses the
[package consumption matrix](package-impact-373.md), rather than duplicating
ownership with GitLab path globs. The parent admits merge requests and default-branch
pushes, suppresses duplicate open-MR pushes, and admits scheduled and manually
started web pipelines. Other branch pushes and tags do not acquire publication authority.

The prepare job fetches complete history and uses the MR diff base or push-before SHA.
The shared selector receives both sides of renames (`--no-renames`) and deleted paths.
Missing/zero revisions, empty sets, schedule/manual events and unknown ownership select
broad coverage. A real Git diff error fails preparation instead of producing a child
artifact. Root static/documentation checks always run. Package builds, packs and Linux
runtime checks use the selected workspace list; Rust setup and quality only run for
native impact. Generated-consumer validation runs for create-forge/template/shared
changes. The independent website runs for docs, website, shared and unknown changes.
The mirror retains its existing full browser matrix even for documentation-only work.

The child contains complete native job definitions selected from the existing files,
with `parent_pipeline` admission. Package source checks and build/pack prerequisites
stay together. Only the deliberately unselected native prerequisite is removed from
the package build graph; downstream artifact consumers retain mandatory producers.
The same production website build feeds build validation, browsers and Lighthouse.
The same packed CLI and primary consumer source/build feed consumer verification.
JUnit, Code Quality, coverage and browser/Lighthouse artifacts remain child job reports.
They are not downloaded into the parent. No npm publisher is added; Pages deployment
and deployed smoke remain disabled because GitHub owns production.

GitLab's documented [dynamic child pipeline](https://docs.gitlab.com/ci/pipelines/downstream_pipelines/)
mechanism accepts an artifact containing pipeline configuration. JSON is emitted as YAML-compatible
configuration, and `strategy: mirror` waits for and mirrors child success/failure/cancellation.
The [syntax reference](https://docs.gitlab.com/ci/yaml/#triggerstrategy) dates `mirror`
to GitLab 18.2; this configuration therefore requires 18.2 or later. No server version,
CI Lint API or live runner execution was available to verify this deployment assumption.
Local tests parse the generated configuration, exercise the change matrix, validate
mandatory needs and demonstrate that a failed diff cannot emit the pipeline artifact.
They do not establish hosted artifact/report presentation or provider execution.

Schedule admission enables broad mirror validation but does not create a GitLab schedule.
The operational expectation is one weekly default-branch schedule, configured separately
by the maintainer; no shared settings were changed here. A manual web pipeline gives
immediate broad validation. Broader GitHub cadence is reconciled in the final migration
report. This work preserves mirror coverage rather than introducing GitHub-only native
reproducibility or candidate probes that the mirror did not previously own.

Rollback is a revert of the parent, selection adapter and package-command changes.
That restores the former broad project and path-filtered generator/website includes.
No environment, branch protection, repository mirroring or production authority changes.
