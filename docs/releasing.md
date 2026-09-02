# Maintainer release guide

Forge has two release layers:

- checkpoint releases (`v0.6.0`, for example) record completion of a roadmap
  milestone; and
- package releases publish independently versioned create-forge or content-model
  artifacts from package-scoped tags.

Checkpoint tags never publish npm packages. Package tags trigger protected npm
publication. Detailed automation internals are in
[package releases](package-releases.md).

## Prepare a package prerelease

Choose one package and a version allowed by ADR 0006. Before `1.0.0`, breaking
changes increment the minor version and include migration guidance.

1. Update the package version in its manifest and the root lockfile.
2. Add a same-version heading at the top of its `CHANGELOG.md` with user-visible
   changes, compatibility impact, and migration or explicit no-migration notes.
3. Run the complete repository gate, audit, package verification, and affected
   standalone or compatibility checks.
4. Inspect the package allowlist with `npm pack --dry-run --workspace <name>`.
5. Open a focused release PR. Do not mix unrelated implementation into it.

Typical local verification for create-forge is:

```sh
npm run quality
npm run audit
npm run verify:package --workspace @rm-industries/create-forge
npm run test:generator:e2e
```

For content-model, run `npm run quality`, `npm run audit`, inspect its tarball,
and confirm every declared Astro and Sveltia peer is covered by compatibility
evidence.

## Simulate publication without publishing

Run the **Package Release** workflow manually on the release PR branch and choose
the package. Manual dispatch is a dry run: it verifies the version, runs quality,
packs the package, validates identity and integrity, and uploads the inspected
artifact. The publish job must be skipped.

Review the workflow summary and download the `package-release-*` artifact. Its
plan, tarball metadata, and integrity must match the PR. Record the run in the PR
and release-gate issue.

This dry run is the required simulated prerelease. It requires no npm credential
and makes no registry or GitHub release change.

## Publish the reviewed package

After the release PR merges:

1. resolve the exact reviewed merge commit on `main`;
2. create an annotated `content-model-v<version>` or
   `create-forge-v<version>` tag at that commit;
3. push only that tag;
4. wait for package preparation to pass;
5. approve the protected `npm-release` environment deployment;
6. wait for registry verification and GitHub release creation; and
7. verify the npm version, expected `next` or `latest` dist-tag, integrity,
   provenance, GitHub release target, and `published-*` artifact.

Prerelease package versions publish under `next`; stable versions publish under
`latest`. A `1.0.0-rc.1` version is still a prerelease and therefore remains on
`next`. Publishing stable `1.0.0` moves `latest` only when the stable tag workflow
succeeds; it does not require manually changing npm dist-tags.

For a content-model release, confirm the post-publication template synchronization
uses the verified publication result and opens a tested template PR. Do not merge
that PR until the newly published version and peer range pass generated-project
checks.

## Complete a checkpoint release

A checkpoint release represents the repository milestone, not a package version.

1. Confirm every required issue is closed and every release-gate checkbox has
   concrete evidence.
2. Confirm the latest `main` quality and security workflows pass.
3. Reconcile support policy, package engines, peers, lockfiles, CI matrices, and
   documentation.
4. Create an annotated `v<checkpoint>` tag at the reviewed milestone commit.
5. Push the tag and create a GitHub prerelease summarizing scope and evidence.
6. Close the release-gate issue, then close the milestone after it has no open
   issues.

Do not assume a checkpoint tag publishes npm. If the milestone requires a new
package artifact, complete the package procedure separately and link both forms
of evidence.

## Recover from failure

### Dry run fails

Fix source, version, changelog, tests, or workflow configuration on the release
branch and rerun the manual workflow. Nothing was published, so the proposed
version may remain unchanged until npm accepts it.

### Tagged workflow fails before npm publication

Do not move or recreate the tag at another commit. Correct environment or trusted
publisher configuration, then rerun the workflow for the same immutable tag. If
source must change, prepare a new package version and reviewed tag.

### npm accepted the version but later steps failed

Rerun the same tagged workflow. It compares registry integrity with the inspected
tarball, skips an identical existing publication, and recreates missing GitHub
release metadata or verified evidence. A different registry integrity fails
closed.

### Published package is defective

npm versions are immutable. Prepare and publish a corrected version. Deprecate
the bad version with a message that identifies the safe replacement, for example:

```sh
npm deprecate @rm-industries/create-forge@0.4.0-beta.2 "Use 0.4.0-beta.3; this release contains a generator defect."
```

Deprecation is a registry mutation: require maintainer authorization, record the
reason and replacement in the incident or release issue, and verify the message
with `npm view`. Do not unpublish a version merely because it is defective.

If the defect affects generated source, publish manual remediation with affected
generator versions and files. A newer generator does not update existing sites.

### Tag points to the wrong commit

If it has not been pushed, delete the local tag and recreate it correctly. If it
has been pushed, do not silently move it to another commit. Stop publication,
document the mistake, and create a new version/tag after review. If publication occurred,
follow the defective-package procedure.

## Release evidence checklist

- [ ] Reviewed version, changelog, compatibility, and migration assessment.
- [ ] Repository quality and audit pass.
- [ ] Affected template, generator, package, browser, and peer checks pass.
- [ ] Dry-run workflow and inspected artifact pass.
- [ ] Tag resolves to the reviewed merge commit.
- [ ] Protected publication succeeds with expected npm dist-tag.
- [ ] Registry integrity and provenance match the inspected artifact.
- [ ] GitHub release and `published-*` evidence exist.
- [ ] Synchronization or remediation follow-up is linked where applicable.
- [ ] Release gate and milestone record the final evidence.
