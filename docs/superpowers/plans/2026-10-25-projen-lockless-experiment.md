# Projen and Lockless Experiment Implementation Plan

<!-- cspell:ignore Projen ERESOLVE materializer -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox syntax for tracking.

**Goal:** Measure whether Projen plus peer-constrained fresh dependency resolution reduces create-forge maintenance
without weakening consumer behavior.

**Architecture:** Keep production source unchanged. Use reproducible patches against released create-forge 1.3.0 in
temporary source copies, pack each candidate, and invoke it outside workspaces. Commit only experimental fixtures,
patches and an evidence report; compare existing authoring against internal Projen with identical dependency policy.

**Tech Stack:** Existing Node/npm, generator, typed provider writers and consumer tests; experiment-only pinned Projen
0.104.14 and npm-compatible peer fixtures.

**Spec:** [Approved experiment design](../specs/2026-10-25-projen-lockless-experiment-design.md).

## Global Constraints

- Baseline source: `adde4f1392a4911f1c73e9091a5f882f02cc9f80`, released create-forge 1.3.0.
- Experimental ranges: content-model `^1.1.10`; Sveltia `>=0.251.0 <1.0.0`.
- Formatter/Oxfmt coupling, other ranges, engines, security thresholds and action pins remain unchanged.
- Preserve repository locks, generated consumer locks, ownership, rollback and collision safeguards.
- No production migration, public publication, consumer regeneration, repository-setting changes or permanent schedule.
- Estimate 3–5 focused working days plus hosted runner time; record actual effort without fabricating elapsed working
  days.
- First focused-day stop: without a concrete removable policy/writer, stop the Projen portion and finish dependency
  delivery.

## Review Focus

- Optional peers: an explicitly installed incompatible Sveltia must not silently qualify as supported.
- Multiple model candidates: do not assume npm finds an older compatible combination automatically.
- No-install/Cloudflare: describe actual lock creation and network behavior; do not claim offline operation.
- Consumer customization: editable manifests, comments and provider configuration remain consumer-owned.
- Hosted evidence: parsed workflow equality is not proof of permissions, transfers or deployment behavior.

## Files and boundaries

Create `docs/reviews/fixtures/projen-lockless/` with `README.md`, experiment-only
`package.json`/`package-lock.json`, `peer-resolution.test.mjs`, `synthesize.mjs`,
`synthesize.test.mjs`, `lockless.patch`, and (only if it replaces a real rule)
`projen.patch`. Keep logs, generated projects and tarballs under a task-owned temporary
directory; retain compact results/hashes in `docs/reviews/projen-lockless-combined.md`.

Temporary candidate patches may touch `packages/create-forge/scripts/copy-template.ts`,
`packages/create-forge/src/materialize.ts`, their focused tests, and
`templates/default/package.json`. The Projen candidate may additionally replace a
bounded manifest/Dependabot/CI policy owner. Record its exact files in the report
before claiming deletion; never count an adapter retaining the old writer as replacement.

### Task 1: Establish the comparison and prove peer resolution

**Interfaces:** Produce the peer fixture command `node --test peer-resolution.test.mjs`
and a results table keyed by npm version, default/strict handling, and scenario.

- [x] Inventory the baseline policy owners in the manifest, Dependabot, typed CI writers, consumer-lock verifier and
      template-sync scripts. Record likely deletions and obligations retained.
- [x] Create locally packed fake model/host packages and an ephemeral localhost npm registry with controlled versions.
      No public package publication or force/legacy flags.
- [x] Write failing assertions for overlapping ranges selecting a compatible older host, disjoint ranges returning
      ERESOLVE, optional installed/absent peers, and multiple model versions with different peer ceilings.
- [x] Implement the minimal fixture registry/runner; record observed selection or rejection rather than treating
      speculative backtracking as a requirement npm promises.
- [x] Run `node --test peer-resolution.test.mjs` with pinned supported npm 10 and 11 executables, in both default and
      strict modes. Expected: all fixture assertions pass; each scenario records selected versions or failure code.
- [x] Repeat the ordinary successful resolution with real published model/CMS metadata and verify the selected peer
      intersection. Commit fixtures and initial evidence.

### Task 2: Build the lockless candidate and exact-pin control

**Interfaces:** Produce `lockless.patch` and baseline/control/ranged candidate tarballs with source SHA and independent
SHA-512 recorded.

- [x] In separate temporary copies of the baseline, first remove only the delivered lock and run an existing
      materialization fixture. Expected: failure on its required lock read, documenting the existing contract.
- [x] Add candidate tests asserting no delivered lock, correct package identity/tokens, and unchanged
      destination-conflict and cancellation behavior. Watch them fail before applying candidate changes.
- [x] Patch only copy-time lock exclusion/tokenization and materializer lock assumptions. Preserve manifest validation
      and all surrounding safety checks; widen model/CMS pins only in the ranged candidate.
- [x] Adapt candidate-only snapshot assertions in `scripts/verify-consumer-lock.ts` and the packed-generator fixture to
      assert registry isolation, peer satisfaction and consumer lock replay. Keep all unrelated original assertions;
      document the intentional contract changes.
- [x] Build and pack baseline, exact-pin lockless control and ranged lockless candidate. Run focused materializer tests
      and installed-CLI scenarios. Expected: intended contracts pass; baseline package bytes/source remain unchanged.
- [x] Generate with install and no-install, verify lock creation timing, then delete installed dependencies and use npm
      ci. Expected: the generated lock hash is unchanged on replay. Commit the reproducible patch and evidence.

### Task 3: Test Projen's additional value and enforce the stop

**Interfaces:** `synthesize.mjs` accepts a staged template root and a new output directory; produces an explicit
allowlist of writable normalized files, no consumer Projen requirement.

- [x] Install Projen 0.104.14 with a separate experiment lockfile. Do not add it to root, CLI runtime or delivered
      starter dependencies.
- [x] Choose one manifest/Dependabot/CI policy duplication identified in Task 1. State exactly which current owner the
      Projen candidate would remove; distinguish Projen capabilities from ordinary shared data extraction.
- [x] If no policy/writer is removable within the bounded trial, record the stop decision, omit a cosmetic Projen
      adapter, and continue Tasks 4–5 with the proven candidates.
- Conditional, not reached after the approved stop: Otherwise, write failing tests for semantic output, deterministic
  synthesis, preserved ownership/action comments,
  file mode 0644 and absent Projen metadata/dependencies. Implement the minimum authoring replacement, export allowlist
  and existing Oxfmt normalization.
- Conditional, not reached after the approved stop: Run `node --test synthesize.test.mjs`. Expected: all assertions
  pass, and a repeated synthesis produces identical
  output. Build the Projen+ranged-lockless tarball using the same ranges and starter as Task 2.
- Conditional, not reached after the approved stop: Edit the resulting consumer manifest, Dependabot and CI files; run
  normal formatting, checks and build. Expected:
  edits survive without regeneration. Commit candidate patch and before/after maintained-surface counts.

### Task 4: Validate consumer behavior and operational recovery

**Interfaces:** Produce a matrix identifying each tarball, environment, command, result, lock hash and evidence limit.
Use existing public consumer commands rather than another permanent CI framework.

- [x] Run the existing packed CLI scenarios against each available candidate. Extend candidate-only assertions for
      default GitHub, standalone GitLab and nested Cloudflare output; preserve provider-specific semantics.
- [x] Run fresh install and quality:core on Node 22.22.2, supported Node 24 and 26; exercise npm 10/11 peer behavior
      from Task 1. Expected: registry-only dependencies and passing consumer checks; document platform limits.
- [x] Run the delivered CMS preservation/browser tests with published dependencies, including native serialization,
      metadata/raw/rich saves and formatter failure/recovery. Exercise Chromium, Firefox and WebKit where supported;
record
      unavailable lanes explicitly.
- [x] Run Lighthouse and dependency audits for the representative consumers. Report real failures and baseline/candidate
      differences; no new exceptions or weakened checks.
- [x] Rehearse failed network access, SIGINT and destination collision using existing process/materialization fixtures.
      Inject a permitted synthetic upstream regression, then demonstrate a corrected experimental generator restores the
      public contract and lock replay.
- [x] Reuse existing workflow schemas and security validation for both providers. Exercise hosted execution on an
      isolated experimental branch where authorized access exists, without deployment. If provider execution is
unavailable,
      record the gap and constrain the recommendation.
- [x] Preserve useful logs and tarballs until review; commit only compact evidence and fixture corrections.

### Task 5: Evaluate maintenance cost and recommend a decision

**Interfaces:** Produce `docs/reviews/projen-lockless-combined.md` with separate delivery and Projen recommendations.

- [x] Compare added/deleted maintained policy, writers, validators, dependencies and staging/export machinery. Count
      candidate deletions only where replacement evidence exists; exclude generated bytes and moved code from savings.
- [x] Revisit observed model/CMS sync releases under bounded ranges. Separate potentially avoided fresh-bootstrap
      releases from still-required peer validation, range corrections and consumer updates.
- [x] Run the proposed fresh-resolution validation command once; record duration and the expected daily/default-branch
      and relevant-PR operating model, including quiet successes, failure notification, ownership and correction. Do not
      enable a production schedule.
- [x] Recommend adopt, reject or narrow each part. Require executable consumer evidence and credible net savings for
      adoption; describe rollback and any remaining hosted/platform/security gaps.
- [x] Run focused document formatting, Markdown lint, spelling, link validation and raw git diff --check. Verify
      production source, root lock, release settings and published packages remain unchanged.
- [ ] Request one fresh whole-branch review against this plan and the approved design; fix consequential findings with
      relevant regression checks. Commit the final report and open an evidence-only PR; leave merge and production
adoption
      to the maintainer.
