# GitHub Project Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Replace GitHub impact selection and legacy checks with independent native-filtered project workflows,
preserving delivered validation and artifact safety.

**Architecture:** Each project owns ordinary YAML and explicit source/shared-input filters. Template owns full site
validation; Create Forge owns CLI checks and packed-output smoke. Repository contracts and cross-package
integration have distinct execution ownership; GitLab retains its current adapter until the next phase.

**Tech Stack:** GitHub Actions YAML, existing Node/npm workspaces, Vitest, Playwright, Lighthouse, Rust/WASM
tooling.

**Spec:** `docs/superpowers/specs/2026-10-23-github-project-workflows-design.md` (approved October 23, 2026).

## Global Constraints

- Only Forge-owned GitHub workflows and necessary test ownership change; generated consumer CI and GitLab
  restructuring remain outside this phase.
- Published upstream package changes do not trigger downstream package validation.
- Shared locks/configuration/setup inputs are explicit; no GitHub custom diff selector or old check-name
  compatibility jobs.
- Retain current runtime coverage, weekly/manual validation, immutable inspected artifacts, least permissions and
  existing publication/deployment restrictions.
- Root quality remains the proposed sole required CI context; do not modify branch/environment settings or merge
  the PR.
- Removing old contexts on the PR will require a separately approved protection migration before merge. Main
  retains its current workflow/protection pair until that migration.
- Keep `scripts/ci-impact.ts` and its GitLab callers working during this GitHub-only phase.
- Preserve unrelated untracked `.serena/` and `docs/specs/`; add no dependencies or CI-generation framework.

## Review Focus

- Mixed, deleted and renamed inputs: filters cover actual package/template/shared source ownership without
  release-only fan-out (Tasks 1, 3).
- Schedule/manual events: broad checks run but never production deploy/publish (Tasks 1–3).
- Missing or failed artifacts: consumers require the successful producer and use that exact build (Tasks 1–3).
- Template customization: renamed content/routes/theme pass durable consumer checks while starter-only regressions
  remain Forge-owned (Task 2).
- Hidden package coupling: repository CI-contract checks exclude cross-package runtime integration; package
  commands work independently (Tasks 1, 3).

## File Ownership

- Task 1: `.github/workflows/content-model.yml`, `markdownlint-frontmatter.yml`, `browser-oxfmt.yml`, plus
  `scripts/package-workflows.test.ts`.
- Task 2: `.github/workflows/create-forge.yml`, `template.yml`;
  `packages/create-forge/scripts/test-generator-e2e.ts`; new template customization harness; existing starter
  fixtures; focused harness/workflow tests.
- Task 3: `.github/workflows/project.yml`, `website.yml`, integration workflow; delete obsolete `generator.yml` and
  GitHub impact action; repository test commands/configuration; existing workflow-contract tests; current CI
  documentation.
- Root controller: plan/ledger, integration merges, task reviews, whole-branch verification, approved PR updates
  and worktree cleanup.

### Task 1: Independent Package Workflows

**Interfaces:** Publish `content-model.yml`, `markdownlint-frontmatter.yml`, `browser-oxfmt.yml`. Each uses own
package paths plus explicit shared tooling, own workflow, weekly schedule and manual dispatch. No cross-package
source filters. Browser test-tool dependencies may name specific lock/tool files they actually consume.

- [ ] Add parsed workflow tests: own source and shared lock/setup filters exist; another package's source is not a
      trigger; no impact job/action or no-op guard; schedule/manual exists.
- [ ] Run `npm run test:root -- scripts/package-workflows.test.ts` and confirm missing/old workflow behavior fails.
- [ ] Implement package type/unit/build/pack/inspection and four Linux runtime lanes (minimum Node 22; latest 22,
      24, 26). Build once, upload the inspected package, restore native assets for browser compatibility lanes without
      rebuilding Rust there.
- [ ] Retain browser native reproducibility/quality and packed browser checks. Move the local content-model CMS
      serialization probe to the Task 3 integration workflow; document that handoff for its implementer.
- [ ] Run targeted tests, Actionlint, Zizmor, shell syntax and package commands possible locally; commit scoped
      files. Record native-tool limits without claiming execution.

### Task 2: Template Ownership and Packed CLI Smoke

**Interfaces:** Publish `template.yml`, `create-forge.yml`; CLI e2e keeps its existing public command and
supplied-tarball support but removes full template browser/customization execution. Template-owned customization
harness runs via a new explicit test command (coordinate package.json ownership with Task 3).

- [ ] Add behavior/parsed workflow regressions: template has full browser/Lighthouse consumers of one production
      build; Create Forge watches template input but never runs full browser/Lighthouse; CLI smoke verifies generated
      project build/validation.
- [ ] Prove old ownership fails those regressions before changing it.
- [ ] Move starter/default browser fixtures to Template workflow preparation. Move harmless customization execution
      from CLI e2e to a template-owned isolated fixture harness, retaining unit/build/Chromium commands and
      renamed-output assertions.
- [ ] Build Template's isolated canonical source once, archive source and production output for
      browser/Lighthouse/build validation. Keep template isolation, unit/static checks, accessibility, performance
      budgets and runtime coverage. Customization uses its own changed fixture/build intentionally.
- [ ] Create Forge validates its own package/tests/provider/layout behavior and one packed default consumer; retain
      four Linux Node lanes and Node 26 macOS. Smoke builds/validates without repeating template browser/Lighthouse
      checks.
- [ ] Run relevant CLI tests/typecheck, real isolated smoke/customization commands and native YAML scans; commit
      scoped files. Do not modify generated CI builders or published dependency policy.

### Task 3: Repository, Website, Integration and Cleanup

**Consumes:** Task 1 and 2 workflow filenames and tested public harness commands.

**Produces:** Always-running `Repository quality` job in `project.yml`; native-filtered website workflow; explicit
integration workflow; working repository public commands; accurate migration map and docs.

- [ ] Rewrite old workflow contracts around approved behavior: all six project workflows native-filtered and
      scheduled/manual, no GitHub impact action/caller, no legacy no-op jobs, required repository result always
      present.
- [ ] Confirm old selector/summary assumptions fail the new contracts, then remove superseded assertions rather
      than preserve old graph job counts.
- [ ] Separate CI-contract test execution from `scripts/verify-frontmatter-model.test.ts`; preserve `npm run
  test:root` as a comprehensive local/mirror command if useful. Repository quality runs
      formatting/lint/docs/contracts and repository TypeScript without cross-package integration runtime tests.
- [ ] Add integration workflow for cross-package model tests and existing focused native CMS serialization. Trigger
      integration tooling/test edits plus weekly/manual; do not add ordinary upstream-package fan-out or wire the
      separately known failing CMS ordering probe.
- [ ] Remove website impact selection, summary and browser diff branching. Use native website/docs/shared paths,
      full existing website browser coverage, weekly/manual; retain one build, Pages artifact, main-push-only
      deployment and deployed smoke gates.
- [ ] Delete old GitHub generator workflow, impact action/callers and obsolete native-action exceptions. Keep
      GitLab selector/adapter, and replace brittle GitHub/GitLab job-identity equality tests with independent provider
      artifact/deployment contracts.
- [ ] Update root commands and current CI/contributor docs. Historical inventories remain historical. Record exact
      27-old-context removal and proposed `Repository quality` requirement as a separately approved migration, not an
      executed settings change.
- [ ] Run root tests/types/lint/docs/format, affected package/template public checks, Actionlint and Zizmor;
      validate shared filters and no production effects on PR/schedule/manual. Commit, then whole-branch review and
      fixes.

## Completion

- [ ] Review each task against spec and code quality, resolve consequential findings.
- [ ] Run whole-branch review and final relevant checks; distinguish local/native/hosted evidence.
- [ ] Update existing PR after authorized push; inspect new hosted workflows. Missing legacy required contexts are
      expected until the separate protection migration is approved.
- [ ] Clean up task checkouts, preserve branches/user work, and present the concrete settings migration for
      approval without applying it.
