# Corrective bundled-lock rehearsal

`rollback.patch` is an inert rehearsal patch against source commit
`d9b1411a3e7b93df6e66483f59541f10f34a7488`, before the final lock-destination guard
review fix. It is not active generator configuration or a production-ready release.
Apply only to an isolated `git archive` copy of that commit. It pins the reviewed
model/CMS and browser/CLI formatter pairs, restores authoring-lock packaging and
normalizes delivered lock identity. Its scratch version is `2.0.1-rollback.0`;
nothing was published.

Build and pack the scratch generator using the existing package commands. Install
the actual tarball into a separate runner, invoke its CLI outside the workspace
with `--yes --no-install --no-git`, and require a bundled lock before installation.
Run `npm ci` from the generated consumer directory, then `npm run quality:core`
and `npm run test:e2e -- tests/cms-formatting.spec.ts --project=chromium`. Compare
the lock hash before/after replay. Authoring dependencies may be shared for builds;
consumer dependencies must come from npm, with no workspace overlay.

The separate pin-only rehearsal used the same source and four exact pair versions,
kept lock omission, and packed scratch version `2.0.1-correction.0`. An installed
CLI delivered those pins, installed real registry packages and passed consumer
quality. The controlled peer fixture separately demonstrates a permitted update
failing its public behavior contract and a corrected packed generator restoring it.

See the [readiness record](../../create-forge-2.0-readiness.md) for exact artifact
identities, observed checks and publication blockers. A real corrective release
must receive review, typing/safety checks, semver assessment and required audits;
this patch does not authorize it or install a permanent fallback mode.
