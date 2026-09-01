# Published template synchronization

The `Published Template Synchronization` workflow updates the standalone
template only after a content-model version is available from npm. After a
tagged `Package Release` run verifies the registry publication and uploads its
evidence, it emits the narrow `content-model-published` repository event that
starts synchronization. Maintainers can also dispatch the workflow with an
exact published version for recovery or a dry run.

The automatic event carries the completed release run ID. The synchronization
workflow downloads that run's `published-content-model-*` artifact and requires
its verified publication marker. Both paths then read the package metadata and
Sveltia versions from npm. The repository-owned TypeScript command verifies
package identity, exact version, registry integrity, SLSA provenance metadata,
and the declared `@sveltia/cms` peer range before changing the template.
Registry metadata and publication evidence remain in the runner's temporary
directory so repository-wide quality checks inspect only tracked project input.

## Pull-request flow

When synchronization is required, the workflow:

1. selects the latest published Sveltia version contained by the content-model
   peer range;
2. updates both exact template dependencies and regenerates the template
   lockfile with the repository's pinned npm version and lifecycle scripts
   disabled;
3. runs repository quality checks, isolated template installation and quality
   checks, and the packed-generator end-to-end suite before requesting write
   credentials;
4. uses the repository-scoped GitHub App documented in
   `peer-upgrade-automation.md` to update the single
   `automation/template-content-model` branch and pull request; and
5. records npm, GitHub release, source run, peer range, and integrity evidence in
   the pull-request description.

The workflow cannot publish packages. Its default token has only repository and
Actions read access; the short-lived GitHub App token is created only after all
validation succeeds and can write only contents and pull requests. Dependabot
continues to monitor the root and standalone template manifests independently.

## Manual recovery

Dispatch `Published Template Synchronization` with an exact version already
published on npm. Manual dispatch still requires registry integrity, provenance,
and peer resolution; it never reads a workspace package or local dependency.

Re-run after temporary registry propagation, validation, or GitHub API failures.
Runs converge on the same branch and open pull request. If a newer verified
publication supersedes an open synchronization, the branch and evidence are
updated rather than creating a competing pull request. If package identity,
integrity, provenance, or peer selection is invalid, the workflow fails before
requesting write credentials and leaves the template unchanged on GitHub.
