# Deployment foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Introduce validated deployment environments and repeatable bootstrap inputs while preserving working
native Pages generation.

**Architecture:** Add a deployment plan beside the shared validation work model. Resolve CLI objects before
materialization and pass the normalized plan into the existing provider renderers. Ship only native
single-environment Pages in this first review; reject Cloudflare and parallel Pages until their follow-up
implementations land.

**Tech Stack:** TypeScript, existing Zod, Commander, YAML and Vitest; no new dependencies.

**Spec:** [Approved deployment design](../specs/2026-10-13-deployment-environments-design.md)

## Global constraints

- No retained Forge configuration or TypeScript pipeline in generated projects.
- Internal Forge CI remains maintained YAML; this review changes consumer generation only.
- Exactly one primary CI executes deployment; secondary jobs remain natively disabled.
- Default production source is main; preserve current native Pages behavior without new flags.
- Every regex is named. Quote input at shell and expression boundaries.
- No infrastructure provisioning, credentials, or real publication in tests.
- JSON inputs are accepted for this iteration; explore friendlier CLI input separately later.

## Review focus

- Invalid input must fail before filesystem changes or prompts requiring unrelated answers.
- A deployment branch must be exact; reject branch syntax invalid for Git rather than treating it as a pattern.
- Existing generated job/check names must remain stable for default consumers.
- Nested repository prefixes, paths and artifact locations must continue to work.
- Secondary CI jobs must not become executable through different source-branch selections.

## Task 1: Validated deployment plan

**Files:** Create `packages/create-forge/src/ci/deployment.ts` and `deployment.test.ts`.

**Interfaces:** Export `deploymentEnvironmentSchema`, `DeploymentEnvironment`, and
`resolveDeployments(input: unknown[] | undefined, primary: 'github' | 'gitlab' | undefined): DeploymentEnvironment[]`.
The first shipped schema supports `name`, `sourceBranch`, `target` (github-pages or
gitlab-pages), and optional `url`. Provider fields for future targets belong in later reviews.

- [ ] Write tests: omitted inputs resolve production/main/native Pages for each primary; absent primary
      resolves no deployments.
- [ ] Write tests: duplicate names, invalid branch refs, unknown fields, malformed HTTP(S) URLs, multiple
      native environments and incompatible primary/target combinations throw descriptive errors.
- [ ] Run the targeted Vitest file and confirm failures before implementation.
- [ ] Implement strict Zod schemas and normalization; name each validation expression. Preserve environment
      name independently of branch. Reject unsupported targets explicitly.
- [ ] Rerun tests; commit the validated model.

## Task 2: CLI and option resolution

**Files:** Modify `packages/create-forge/src/cli.ts`, `options.ts`, `resolve-options.ts`,
`materialize.ts`, `ci/generation-options.ts`; extend `cli.test.ts`, `cli.integration.test.ts`,
`materialize.test.ts` and the existing option-resolution tests where applicable.

**Interfaces:** Add optional `deployments` to generator inputs and normalized CI generation
options. Commander collects repeatable `--deployment <json>` values; parse JSON with
flag-specific `InputError` messages, then resolve through Task 1's function. Defaults
use the existing resolved primary CI, including github preference when both enabled.

- [ ] Write failing tests for repeated inputs, malformed JSON, unknown targets, explicit native
      environment/source branch, and missing primary for explicit deployments.
- [ ] Verify invalid inputs leave the destination absent and unrelated repository files unchanged.
- [ ] Implement collection/parsing and propagate the validated plan into materialization; do not save inputs
      as a config file.
- [ ] Ensure direct programmatic callers and existing bootstrap defaults resolve identically; document the
      distinction between omitted input and an empty plan.
- [ ] Run CLI, option and materialization tests; commit the complete input boundary.

## Task 3: Render native deployment environments

**Files:** Modify `packages/create-forge/src/ci/github.ts`, `github-extra.ts`, `gitlab.ts`
and `schema.ts` only where the new generated values require it; extend `model.test.ts`.

**Interfaces:** Renderers consume the validated plan from generation options. Use its
name for CI environments and sourceBranch for deployment conditions. Validation
workflow push/PR filters include configured deployment source branches plus main.
Default single-environment deploy/smoke job identifiers remain unchanged.

- [ ] Write tests for custom environment names and dev branches, default job-name stability, native
      primary/target compatibility, deployment artifact dependencies and existing quality dependencies.
- [ ] Write tests that both providers still validate, but secondary deploy, artifact upload and smoke jobs
      remain disabled. Preserve current disabled native Pages standby jobs for the omitted-input legacy default.
- [ ] For explicitly configured unsupported secondary target combinations, emit explanatory generated comments
      instead of a substituted target; test the consumer-facing explanation.
- [ ] Implement branch conditions using safely encoded literals, not raw interpolation. Keep PR/MR deployment
      disabled and existing permissions unchanged.
- [ ] Preserve nested project artifact directories, filename prefixes and exact deployed-artifact reuse.
- [ ] Run generated model/schema tests and existing write tests; commit native rendering.

## Task 4: Reviewable bootstrap result and documentation

**Files:** Update `packages/create-forge/README.md`, CLI help expectations and the affected
bootstrap integration fixtures. Adjust `docs/continuous-integration.md` to explain
consumer options without changing internal workflows.

- [ ] Add bootstrap coverage for github-only, gitlab-only and mirrored custom-branch native deployment; parse
      outputs and prove no retained config exists.
- [ ] Cover nested directory generation and conflicts with existing shared repository files.
- [ ] Document JSON examples, default behavior, primary gating, provider limitations and generated-YAML
      ownership. Record friendlier input UX as a future refinement, not another runtime/config requirement.
- [ ] Run repository quality and affected generator bootstrap scenarios with task-local npm cache. Run
      workflow syntax/security checks on representative generated YAML.
- [ ] Inspect the complete diff and remove unused scaffolding; request an independent whole-branch review
      under executing-plans guidance.
- [ ] Commit and open the first implementation PR linked to #272; do not close the issue or merge the PR.

## Follow-up reviews

Cloudflare from GitHub and GitLab adds target-specific project fields, lockfile-managed
Wrangler, credentials references, URLs and deployment outputs together. A separate
GitLab parallel Pages review adds explicit capability selection, distinct path prefixes,
non-expiring deployments and base-path-aware build validation. Each gets its own focused
plan once the foundation is reviewed. Final integration must demonstrate persistent
multiple environments and satisfy #272's remaining acceptance criteria.
