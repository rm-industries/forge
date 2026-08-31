# Package releases

Forge publishes `@rm-industries/create-forge` and
`@rm-industries/content-model` independently. A package version is prepared in
a reviewed pull request, merged to `main`, and published only from a matching
package-scoped Git tag.

## Version and changelog policy

The semantic-versioning policy in ADR 0006 remains authoritative. Every version
change must add a matching section to that package's `CHANGELOG.md`. Use the
exact version as the heading, newest first, and include migration guidance for
pre-1.0 breaking changes.

Release tags use these forms:

- `content-model-v<version>`
- `create-forge-v<version>`

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
7. For content-model releases, allow the template synchronization tracked by
   #95 to consume the verified result only after registry verification succeeds.

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
