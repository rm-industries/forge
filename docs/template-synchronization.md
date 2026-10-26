# Template dependency maintenance

The template has no committed authoring lock. Fresh installations resolve its
reviewed dependency ranges; generated projects own and commit their resulting
locks. Root and website lockfiles remain committed.

The former published-template synchronization workflow, preparer and automatic
lock-only PR path are removed. Compatible package publications need no template
commit or generator release. The [fresh-consumer monitor](fresh-consumer-monitoring.md)
checks the actual published stable generator daily and weekly, independently of
main. Package publication retains registry integrity and provenance verification.

Dependabot npm updates are disabled for `/templates/default`; deleting its lock
alone would still allow manifest update PRs. Root, website, native and GitHub
Actions updates retain their existing configuration. Template range, source,
corrective pin and runtime changes require review and a generator release
assessment. Package-owned peer and embedded-engine contracts remain enforced.

Template CI resolves a fresh lock before validation and carries that generated
lock with its source artifact so downstream jobs replay the same graph with
`npm ci`. No generated lock is committed back to Forge. Local template checks
begin with `npm install`; disposable locks are ignored only in the repository's
template directory, not in generated projects.
