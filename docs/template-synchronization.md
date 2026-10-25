# Published template synchronization

The `Published Template Synchronization` workflow refreshes repository authoring
locks after verified npm publication of either `@rm-industries/content-model`
or `@rm-industries/browser-oxfmt`. The corresponding `content-model-published`
or `browser-oxfmt-published` event carries the package, exact version, release
tag and completed release run ID. Maintainers can also dispatch the workflow
with a package and exact published version; the package defaults to content-model
for the existing peer-upgrade caller.

The automatic path downloads the matching run's sole unexpired
`published-<package>-*` artifact and requires its verified publication marker.
Both paths read registry metadata and published host versions. The existing
TypeScript preparer verifies package identity, registry integrity, SLSA provenance
predicate metadata and the package-owned peer requirement. The automatic path
also matches publication integrity and release identity. Predicate metadata is
not independent cryptographic verification of an attestation.

## Compatible authoring refreshes

A compatible refresh keeps both consumer declarations unchanged. It requires
the published package to satisfy the template range and selects the newest
stable host satisfying both the template host range and the package peer range.
For the browser formatter, that peer remains its exact embedded Oxfmt engine.
A browser 0.2 release is outside `^0.1.2`; adoption requires a reviewed range
change rather than automatic widening. Exact corrective pins are also respected.

The preparer reads previous selections from the standalone authoring lock. It
uses temporary exact manifest inputs to replace an old satisfying selection,
runs npm with lifecycle scripts disabled, verifies the resolved publication's
version and integrity and host version, then restores the original manifest and
lock root declarations. A failed resolution or verification restores the prior
lock and manifest. Ordinary installation retaining an older satisfying entry
does not count as a refresh.

Root CMS authoring dependencies may update within their existing declarations
and local peer constraints. Root Oxfmt remains owned by the local browser
package's embedded engine; a newer public browser package never authorizes a
root engine or peer-policy change. Neither create-forge's version nor its
changelog changes. No generator publication is requested.

## Pull-request validation and merge

Before requesting write credentials, preparation installs both authoring locks,
runs repository quality checks, isolated template checks and packed-generator
end-to-end tests. It updates the existing per-package
`automation/template-content-model` or `automation/template-browser-oxfmt` branch
with only `package-lock.json` and `templates/default/package-lock.json` changes.
The PR records the publication, peer and integrity evidence.

A separate `Validate authoring refresh` job validates the resulting PR commit,
checks its complete diff permits only these locks and retains root declarations,
then runs lock/peer/isolation validation, repository quality, isolated template
checks and packed-generator tests again. Preparation waits for this designated
GitHub Actions check to succeed on the exact pushed PR HEAD and pins the merge
request to that HEAD. Missing, pending or failed evidence never enables automatic
merge; permissive repository rules alone are insufficient. Normal required checks
and review rules still apply.

Template source, declaration floors or ceilings, generated behavior and peer
policy changes cannot enter this lock-only path. They require maintainer review
and a generator release assessment. The existing peer-upgrade and native engine
upgrade workflows retain their own package compatibility responsibilities;
publication of a reusable package does not publish create-forge.

## Recovery

Dispatch the existing workflow with the package and exact version already
published on npm. Manual dispatch retains registry identity, integrity,
provenance metadata and peer checks. No workspace overlay is used. Re-run after
registry propagation, validation or GitHub API failures. Runs reuse each package's
branch and PR; invalid publication evidence fails before requesting write
credentials. A validation timeout leaves the PR for investigation and a rerun.

The workflow cannot publish packages. Its default token has repository, Actions
and check read access; the short-lived App token receives only contents and PR
write access after preparation passes. Existing audit gates and protected manual
publication remain separate release requirements. Existing consumers own their
source and locks and are never modified by this workflow.
