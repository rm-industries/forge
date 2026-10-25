# Package releases

This document describes package-publication automation and recovery details.
For the complete human checklist, simulated prerelease, checkpoint releases,
rollback, and deprecation procedure, start with the
[maintainer release guide](releasing.md).

Forge publishes `@rm-industries/create-forge`, `@rm-industries/content-model`,
`@rm-industries/browser-oxfmt`, and `@rm-industries/markdownlint-frontmatter`
independently. A package version is prepared in
a reviewed pull request, merged to `main`, and published only from a matching
package-scoped Git tag.

## Version and changelog policy

The semantic-versioning policy in ADR 0006, extended by
[ADR 0008](decisions/0008-frontmatter-package.md), remains authoritative. Every version
change must add a matching section to that package's `CHANGELOG.md`. Use the
exact version as the heading, newest first, and include migration guidance for
pre-1.0 breaking changes.

Release tags use these forms:

- `content-model-v<version>`
- `create-forge-v<version>`
- `browser-oxfmt-v<version>`

- `markdownlint-frontmatter-v<version>`

The tag version must exactly match the selected workspace manifest. Prerelease
versions publish to npm's `next` tag; stable versions publish to `latest`.
Repository-wide milestone tags such as `v0.4.0` remain separate and never
publish an npm package.

Peer compatibility updates add a content-model changelog section when they
prepare a new prerelease. Maintainers should edit that generated entry when
additional migration or compatibility context is useful.

## Protected publication setup

Create a GitHub environment named `npm-release` and require maintainer approval.
Restrict deployment branches and tags according to the repository's release
policy. The publication job is the only job that uses this environment or
receives `id-token: write`.

For each npm package, configure a trusted publisher for:

- organization or user: `rm-industries`
- repository: `forge`
- workflow: `package-release.yml`
- environment: `npm-release`

Before the first browser formatter publication, the maintainer must explicitly
add `browser-oxfmt-v*` to the protected environment's allowed tag patterns and
configure that npm package's trusted publisher. Source support alone does not
configure these shared settings. Browser formatter changes do not qualify for
the existing automatic peer patch publication flow; they require
reviewed package tags and the manual environment approval.

No npm token is stored in GitHub. npm exchanges the GitHub OIDC identity for a
short-lived publication credential and records provenance for the published
tarball.

## Release procedure

1. Confirm the version, changelog, package contents, and migration assessment in
   the release pull request.
2. Run `Package Release` manually for the package. Manual dispatch is a dry run:
   it executes the quality gate, packs the workspace, verifies its identity, and
   uploads the inspected tarball and release manifest without publishing.
3. Merge the release pull request only after the dry-run artifact is approved.
4. Create and push the exact package-scoped tag at the reviewed `main` commit.
5. Approve the `npm-release` environment deployment.
6. Inspect the workflow summary, npm version and integrity, provenance, GitHub
   prerelease, and the `published-*` result artifact.
7. For content-model and browser formatter releases, allow the existing template
   synchronization to consume the verified result only after registry verification
   succeeds. Compatible refreshes update authoring locks within unchanged ranges
   and do not bump or publish create-forge. Source or range corrections require
   separate review and release assessment.

The downstream workflow and recovery process are documented in
[`template-synchronization.md`](template-synchronization.md).

Example:

```sh
git tag content-model-v0.2.0-alpha.0 <reviewed-commit>
git push origin content-model-v0.2.0-alpha.0
```

## Recovery and duplicate releases

npm versions are immutable. Never delete and recreate a tag for a different
commit, and never reuse a published version. If preparation fails, fix the
source and create a new reviewed commit before tagging.

If publication fails before npm accepts the package, rerun the tagged workflow
after correcting environment or trusted-publisher configuration. If npm already
contains the version, the workflow skips publication, verifies registry
metadata, recreates missing GitHub release metadata when necessary, and emits a
fresh verified result. A conflicting or unverifiable registry result fails
closed.

The `published-<package>-<version>` artifact is the machine-readable handoff. It
contains the selected package, Git SHA, release and npm tags, packed integrity,
and verified registry integrity. Downstream automation must require
`publication.verified: true` and must not react to preparation artifacts alone.

## Browser formatter release gate

Use the [adoption guide](browser-formatter-adoption.md) and
[readiness record](reviews/browser-formatter-release.md) before approving a
browser formatter artifact. Inspect its worker, WASM, declarations, identity,
and licenses, along with the native rebuild and packed three-engine test run.
The release workflow's manual dispatch remains prepare-only. It neither creates
a tag nor publishes, and its prepare job does not request environment approval.
A green dry run does not replace audit or actual Safari/iPhone evidence.

If publication partially succeeds, use the existing recovery procedure for the
same package/version/integrity. Never recreate a tag or replace an npm version.
If formatter behavior needs correction, prepare a new version and keep existing
sites on their verified lockfile until the fix is tested.

## Frontmatter plugin release handoff

The frontmatter package is manual-only: dispatch `Package Release` with
`package=markdownlint-frontmatter` to prepare it. No main-branch automatic
release source or template synchronization is enabled. Its tag publication uses
the same `npm-release` trusted publisher and provenance checks described above.
The shared preparer registry is also the extension point for browser formatter
[#349](https://github.com/rm-industries/forge/issues/349); that work is independent.

Before approving a tag, reconcile the [readiness report](frontmatter-release-readiness.md),
[package contract](../packages/markdownlint-frontmatter/README.md), and
[existing-site migration](../fixtures/frontmatter-adoption/README.md). Publication, release
tags, and merging require separate maintainer authorization. Registry-based
starter adoption follows publication in a reviewed dependency/lockfile change.
