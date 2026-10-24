# Template and dependency-delivery baseline

Issue: [#385](https://github.com/rm-industries/forge/issues/385), parent
[#369](https://github.com/rm-industries/forge/issues/369). Evaluation date: October 23, 2026.
Source: `0b97262970061e2e8305c7c0c790bd0cce64dfb5`.

This is an evaluation baseline, not approval to remove the delivered lockfile or adopt Projen.
The six tickets share two focused working days. Retain existing production behavior when evidence is incomplete.

## What Forge currently authors

The baseline mixes copied static files and typed generation; it is not an untyped YAML template system.
`templates/default` contains 87 source files. `copy-template.ts` copies opaque files except generated
outputs, renames the ignored `.gitignore`, and tokenizes package/lock names, site metadata and the
Dependabot npm directory. The packed CLI embeds that result in `dist/template`, including its lockfile.
Materialization substitutes tokens, writes CI through typed provider models, stages changes, checks
collisions and restores overwritten files on failure. CI authoring sources are not delivered.

`src/ci/model.ts` defines work and validates dependency graphs; generation options and deployment
schemas validate providers, directories and deployment inputs. GitHub/GitLab writers produce workflows,
permissions, artifact handoffs, selection and required-result logic. Extra GitHub generation covers
security, automation and dependency maintenance. Action pins are bundled separately.

Current responsibilities and raw source size at this revision:

| Area                                                          | Responsibility                                                                  | Source lines, excluding tests |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------: |
| Template copier                                               | exclusions, opaque copying, tokens, Wrangler metadata                           |                            78 |
| Template sync                                                 | published model/provenance/peer selection, template and generator release edits |                           203 |
| Isolated template verifier                                    | registry-only install and public checks, no local dependency protocols          |                           175 |
| CI models, schemas, options, paths, pins, writers and helpers | provider and deployment contracts                                               |                         1,374 |

Line counts describe maintained surface, not measured labor hours or code that Projen can automatically
remove. Provider policy, materialization safety, integration tests and curated dependency choices remain
necessary under any authoring tool. No historical release-frequency or staff-time measurement was collected.

## Dependency and release contract

The template is an independent private npm install root outside root workspaces. Its manifest and
lockfile are shipped together. Normal bootstrap runs `npm install`, not `npm ci`: it starts from the
bundled lock but npm can reconcile compatible resolution. CI uses `npm ci` against the consumer lock.
The repository lock, website lock and resulting consumer lock have separate owners.

Most dependencies use liberal carets: Astro `^7.4.0`, Oxfmt `^0.73.0`, TypeScript `^6.0.3`,
Playwright `^1.64.1` and Vitest `^5.0.0`. Exact template entries require individual review:

| Entry             | Current constraint | Review concern                                          |
| ----------------- | ------------------ | ------------------------------------------------------- |
| content-model     | `1.1.8`            | tested adapter/model snapshot and release-sync policy   |
| Sveltia CMS       | `0.236.0`          | pre-1.0 behavior and content-preservation compatibility |
| Lighthouse CI     | `0.15.1`           | browser/tooling compatibility and security audit graph  |
| audit-ci          | `7.1.0`            | audit policy/output compatibility                       |
| markdownlint-cli2 | `0.24.0`           | pre-1.0 CLI and rule behavior                           |

Current content-model source declares optional peers Astro `^7.2.3` and Sveltia
`>=0.193.2 <0.252.0`; candidate evaluation must also inspect the published package actually consumed,
rather than silently substitute the newer workspace source. Root CMS `^0.251.0` and root Oxfmt `0.74.0`
are not the delivered template versions. Root TypeScript 7 is likewise distinct from consumer TypeScript 6.
Cloudflare adds curated Wrangler `^4.151.0` and resolves its lock even with `--no-install`.

`template-sync.yml` validates published model identity, integrity and provenance, selects a compatible
CMS peer, updates exact template versions, regenerates its standalone lock, and prepares a create-forge
patch and changelog in a reviewed synchronization PR. Ordinary lock updates currently remain shipped
snapshot changes. Existing ADR 0006 requires exact tested model/peer versions; any proposed widening
needs an explicit architectural decision. Publishing another package alone does not change old bundled
snapshots, and a corrective generator release cannot remotely repair older bundled ranges.

## Supported scenarios and selected evidence

Declared Node support is `^22.22.2 || ^24.0.0 || ^26.0.0`, npm `^10.9.0 || ^11.0.0`.
CI generation accepts Node 22, 24 and 26; primary jobs use 26. Providers are GitHub, GitLab or both,
with a selected primary. Deployment supports GitHub Pages, GitLab Pages (including persistent prefixes
with their documented plan requirement), and Cloudflare Pages; environments have distinct source
branches and destinations. Root and nested consumers, explicit metadata, optional installation/Git,
no-install creation, existing destination conflicts and CMS model-backed content are supported contracts.

The representative baseline here is root GitHub Pages generation on macOS arm64 Node 26.9.0/npm
11.19.1, followed by the generated public `quality:core` command and security audit. It uses the
packed CLI installed under `/tmp`, with consumer projects as siblings rather than descendants of its
installation. No workspace links, local model overlays or ancestor node_modules supply consumer
packages. This is locally packed current source consuming registry dependencies, not evidence that
an npm-published generator version or every supported runtime/provider has been exercised.

Reuse existing generator tests for dangerous materialization/process boundaries and executable provider
selection/result scripts. Reuse the packed E2E scenarios for broader GitHub/GitLab, nested, Cloudflare,
no-install and conflict checks. Browser/CMS editing tests and hosted provider execution are separate
coverage, not implied by a successful build or YAML validation.

## Baseline observations

- Exact locked root installation completed. The current CLI built successfully and existing
  `verify:package` installed/invoked its tarball in an isolated fixture successfully.
- The existing generator suite passed: **117 tests in 14 files**, including 24 materialization tests,
  process errors, provider schemas and emitted shell selection/required-result behavior.
- Installed packed CLI normal bootstrap succeeded with `--yes --no-git`. Git was deliberately disabled
  to avoid unrelated consumer repository creation; default installation remained enabled.
- Generated lock contains 1,135 entries and no local/workspace/link resolutions. Installed selections:
  Astro 7.4.0, content-model 1.1.8, CMS 0.236.0, Oxfmt 0.73.0, TypeScript 6.0.3, Playwright 1.64.1.
- Consumer `quality:core` passed format, all four lint/spell checks, unused-code audit, type checking
  (zero errors/warnings), **39 tests in 12 files with coverage**, production build (eight pages), and
  validation of seven required build outputs plus generated text scanning.
- A subsequent clean `npm ci` and repeat `quality:core` passed the same static checks, 39 tests, build and output validation.
- `npm run audit` **failed** on baseline high-severity advisories
  GHSA-27r3-jxmh-p828, GHSA-c475-qrg2-pj4r and GHSA-mrhx-c7xc-m3w5 in the Lighthouse CI dependency
  graph. Existing audit policy correctly detects these; no exceptions or dependency changes were made.
- The first invocation hit a machine-local unwritable default npm cache. It reported the install
  failure with retained project location and retry guidance. A new fixture using a writable npm cache
  succeeded. This is setup evidence, not proof of a dependency-resolution regression.

Experiment logs live under `/tmp/forge-369/baseline-*.log`; resolved versions are in
`baseline-resolution.json`. The baseline tarball is `rm-industries-create-forge-1.2.0.tgz` in that
scratch directory. These are temporary artifacts, not files required to use the PR.

## Authoring comparison slice and output contracts

Evaluate package metadata, `tsconfig.json`, Dependabot, and the generated project workflow. Actual
baseline output sizes are respectively 2,831, 158, 1,019 and 15,252 bytes; its delivered lock is
556,093 bytes. The workflow already comes from typed generation, unlike the other three files.
Compare parsed semantics and runnable commands plus deterministic repeated synthesis, not key-order
snapshots alone. Preserve npm and root GitHub Actions Dependabot entries, cooldown/grouping policy,
audit command/policy, package scripts, Astro strict config, artifact paths, permissions and provider
selection. Consumers keep ordinary editable files with no Projen dependency, config or regeneration task.
Synthesize only into scratch; feed selected artifacts through existing safe materialization.

## Reference patterns reviewed

[T3 dependency map](https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/cli/src/installers/dependencyVersionMap.ts)
uses curated bundled exact/caret choices rather than arbitrary registry latest lookup.
[Its E2E workflow](https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/.github/workflows/e2e.yml)
checks generated builds outside the CLI directory across feature combinations, but the inspected path
uses a locally built CLI and has no daily schedule. Borrow isolation and combination coverage, not an
assumption that its support or CMS contract equals Forge's.

[T4 CLI 2.4.2](https://registry.npmjs.org/create-t4-app/2.4.2) clones a live repository/optional branch
then runs Bun installation, as inspected in its published tarball. Its
[reference repository](https://github.com/timothymiller/t4-app/tree/8f7ab4d1f0c2144248a145c46e57d2622175b912)
is therefore a distinct delivery model, not evidence for the selected bundled-range experiment.

[Projen 0.104.14](https://github.com/projen/projen/tree/v0.104.14/src) offers JSON/YAML, TypeScript and
workflow authoring. Generic file synthesis can preserve the slice but does not replace compatibility
policy. Its higher-level Dependabot defaults and project metadata require deliberate comparison rather
than unreviewed default adoption. Pin its pre-1.0 evaluation version and measure retained custom code.
Primary-source inspection notes are shared at `/tmp/forge-369/research.md` during the experiment.

## Limits

This baseline does not establish live GitHub/GitLab runner execution, deployment, all supported
Node/npm combinations, browser accessibility, CMS editing preservation or fresh-resolution reliability.
The security audit is presently red; carry that baseline defect into both comparisons explicitly.
No production policy, template, lockfile, dependency, schedule or release was changed.
