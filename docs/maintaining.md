# Maintainer guide

This guide covers changes that affect Forge contracts. Contributor setup and
pull-request basics remain in [CONTRIBUTING.md](../CONTRIBUTING.md); architecture
and release procedures have their own guides.

## Start every change

1. Confirm the issue, milestone, dependencies, and acceptance criteria.
2. Start from the latest `main` and keep one coherent issue per pull request.
3. Identify affected contracts: CLI, generated source, package API, content,
   automation, support matrix, or documentation.
4. Add tests at the narrowest layer and preserve standalone verification.
5. Run `npm run quality`; run `npm run audit` when manifests or lockfiles change.
6. Run affected template, generator, browser, compatibility, or release checks.

Never use generated output under `dist/`, dependencies, coverage, or temporary
fixtures as source. Preserve user changes in a dirty working tree and avoid rewriting
unrelated files.

## Maintain template tokens

Tokens are private build-time sentinels with the prefix
`__RM_INDUSTRIES_FORGE_TEMPLATE_V1_`. They must never appear in a generated
project or published documentation.

The contract spans:

- `packages/create-forge/src/template-tokens.ts`, which declares every token;
- `packages/create-forge/scripts/copy-template.ts`, which inserts tokens into
  the packaged template at reviewed source locations;
- `packages/create-forge/src/materialize.ts`, which replaces tokens with
  validated generator options or derived values; and
- package, materialization, generator, and template-isolation tests, which reject
  missing, unexpected, or unresolved tokens.

When adding a token:

1. add one unique key to `templateTokens` without changing the prefix;
2. insert it only into a deterministic source pattern and fail if that pattern
   is absent;
3. replace quoted TypeScript values with the escaping helper and raw values only
   when the destination grammar requires them;
4. include it in the packaged-template and generated-output assertions;
5. test quotes, backslashes, Unicode separators, empty values, and failure
   rollback as applicable; and
6. run package verification and all generator fixtures.

Do not use tokens for values that should remain normal project configuration.
Avoid broad text replacement: a token must have one owned meaning and known
locations.

## Add or change generator input

An input crosses multiple layers. Update them together:

1. `GeneratorOptions` and `ProvidedOptions` in `src/options.ts`;
2. Commander arguments and help text in `src/cli.ts`;
3. interactive prompt behavior and `--yes` defaults in
   `src/resolve-options.ts`;
4. validation and diagnostics in `src/validation.ts`;
5. template customization and, only if needed, a token;
6. unit, integration, materialization, reporter, package, and end-to-end fixtures;
7. CLI and root product documentation; and
8. version and migration assessment under ADR 0006.

Non-interactive use must remain complete: every new prompt needs an explicit flag
and a stable `--yes` default. Adding a required prompt without those paths is a
breaking automation change.

## Change the default template

Edit `templates/default/` first. Its README and `docs/` are part of generated
output. Run focused checks there, then validate from the repository root:

```sh
npm run verify:template:static
npm run verify:template
npm run test:generator:e2e
```

The generator build copies the template and excludes dependencies, builds,
coverage, Lighthouse output, and browser reports. Package inspection must show
every intended source and documentation file and none of those artifacts.

Generated projects do not receive source updates automatically. Add manual
migration steps when an existing project should adopt a template change.

## Update dependencies

Follow [the support policy](support-policy.md) and review the manifest and
lockfile together. Read upstream release notes, security notices, runtime
requirements, licenses, lifecycle scripts, and package contents.

- Root dependencies support repository and package development.
- Template dependencies support generated projects and require standalone
  validation.
- Astro and Sveltia compatibility is declared narrowly as content-model peers.
  Use the [peer-upgrade workflow](peer-upgrade-automation.md) rather than widening
  a peer range without a tested content-model release.
- Template synchronization consumes only a verified published content-model
  result; see [template synchronization](template-synchronization.md).
- Major, pre-1.0 minor, peer-range, build, and deployment updates require focused
  review even when Dependabot can install them.

Do not regenerate a lockfile from scratch unless the lockfile itself is corrupt
and the reason is documented. Run root and standalone audits after dependency
changes.

## Test packed output

Use source tests for iteration, then verify the consumer artifact:

```sh
npm run verify:package --workspace @rm-industries/create-forge
npm run test:generator:e2e
npm pack --dry-run --workspaces
```

Package verification installs the actual create-forge tarball into a temporary
invocation project and checks help, version, and assets. End-to-end tests generate
default, explicit, scoped-name, no-install, and conflict fixtures. The default
fixture installs, type-checks, and builds outside the workspace.

For content-model changes, inspect its dry-run tarball and run the adapter tests
against every declared peer range through the repository compatibility jobs.

## Respond to a vulnerability

1. Keep the report private through GitHub Security Advisories.
2. Reproduce it at the reported package version or generator commit without
   exposing reporter data.
3. Identify affected published packages, generator versions, generated source,
   lockfiles, and supported configurations.
4. Contain credentials or automation immediately when exposure is plausible.
5. Prepare the smallest reviewed fix and regression test on a private advisory
   fork when disclosure must remain embargoed.
6. Run affected quality, audit, package, template, browser, and security gates.
7. Publish a new immutable version; never replace an npm version or move a
   release tag to another commit.
8. Publish remediation that distinguishes dependency updates from manual source
   changes for existing generated projects.
9. Credit the reporter according to the coordinated disclosure agreement and
   close temporary exceptions after remediation.

The public reporting contract is in [SECURITY.md](../SECURITY.md). Do not move a
private report into a public issue before coordinated disclosure.

## Maintain the roadmap

GitHub issues, milestones, and the RM Industries project are the operational
roadmap. When adding work:

- use one stable issue with specification, deliverables, acceptance criteria,
  verification, and completion protocol;
- apply the appropriate work-stream, type, status, and release labels;
- assign the intended milestone and add the issue to the organization project;
- link prerequisites and the milestone release-gate issue;
- update a gate's required list when newly scoped work must block that release;
  and
- record concrete evidence before checking criteria or closing a gate.

Close a milestone only after its release-gate issue is the final open item and
all common scope, quality, security, documentation, and evidence gates pass.

## Review architecture changes

Use the [architecture guide](architecture.md) to locate the affected decision.
If a proposal changes an accepted boundary, add a new ADR that records context,
decision, alternatives, consequences, and superseded records. Update code,
policy, CI, and public documentation in the same release-bound change.
