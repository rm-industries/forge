# Inspected artifact publication and recovery (#394)

The baseline, Changesets 3.0.3, Nx Release 24.0.1 and release-please 17.11.2 can all hand prepared metadata to
Forge's existing inspected-artifact publisher. None needs to replace that publisher. The rehearsal demonstrates its
controlled recovery behavior; it does not establish working live npm trusted publishing, OIDC or provenance.

## Reproducible boundary

Run the [preparation fixture](fixtures/release-preparation/run.cjs) first with the exact tools documented in
[#392](release-preparation-392.md). Then:

```sh
PREPARATION_ROOT=/tmp/forge-release-preparation-REPLACE \
  node docs/reviews/fixtures/release-publication/run.cjs
```

The [publication fixture](fixtures/release-publication/run.cjs) copies each finalist's actual `one` scenario into a
new temporary repository, runs real `npm pack --ignore-scripts` on the small synthetic content-model package, and
calls Forge's public `prepare-package-release.ts` CLI. It independently hashes each resulting tarball with SHA-512
and compares npm's inspected integrity. All four produce content-model 1.2.1, `content-model-v1.2.1`, `latest`, and
the same bytes. This is a metadata-to-artifact integration test, not a build or quality test of the production
package.

It extracts and executes the current workflow's actual immutable-tag, publish, registry-verification and
content-model dispatch shell bodies. Controlled `npm` and `gh` executables intercept every publishing/remote
mutation command. The npm facade hashes the bytes passed to publication independently; it does not merely echo the
expected integrity. The sleep facade shortens only the polling delay. Unexpected facade commands fail closed. The
fixture never calls a real publisher, GitHub mutation, or production tag command.

Outputs remain in the printed temporary directory: command state, tarballs, manifests, `handoffs.json`,
`results.json`, and `changesets-native.json`. The latter includes native Changesets stdout/stderr and intercepted
npm arguments. Fixtures require the pinned evaluation tool installation, not a new repository dependency.

## Common observed outcomes

| Scenario                                                      | Observed result for retained publisher                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each finalist's inspected tarball                             | Original path supplied with `--provenance --access public --tag latest`; registry digest equals independently hashed bytes; verified manifest then dispatch |
| Existing identical version                                    | No publish; registry verification still required; verified success                                                                                          |
| Existing different integrity                                  | Visible conflict; no publish, verified result or dispatch                                                                                                   |
| Tag already points at another commit                          | Visible rejection before publication; no tag rewrite                                                                                                        |
| Registry returns wrong version                                | Visible verification failure even with matching integrity; no success or dispatch                                                                           |
| Registry unavailable before/after upload                      | One attempted upload, then all 60 reads fail; no verified manifest or dispatch                                                                              |
| Upload completed, verification interrupted/unavailable, retry | Matching existing artifact skipped, then verified; no second upload                                                                                         |
| Package A succeeds, B fails                                   | Retry A skips its already matching artifact; retry B uploads and verifies; successful version/tag untouched                                                 |
| Downloaded bytes differ from inspected manifest               | Upload attempted; independently observed registry integrity differs; verification fails and dispatch is suppressed                                          |
| Foreign SHA inside downloaded manifest                        | Accepted by publication shell when trusted job outputs/tag SHA match; manifest SHA is not independently bound here                                          |

Preparation separately rejects wrong packed package identity, wrong packed version and wrong release-tag version for
all four finalists. The public preparer accepts an arbitrary nonempty `--sha`; the real workflow supplies `git
rev-parse HEAD`, and its immutable tag check compares the tag's commit with `GITHUB_SHA`. These are different
safeguards, not a demonstrated independent manifest/commit verification. The shell exercises existing tags;
missing-tag creation is source inspected, not exercised. GitHub release creation/upload actions and real artifact
transport are outside the controlled shell seam.

The partial-success scenario models separate package jobs, which is how Forge releases operate. It is not an atomic
multi-package transaction: a successfully verified content-model package can dispatch while an unrelated package
fails. Failed or unverified content-model publication cannot dispatch in this rehearsal. Retrying verified
publication may dispatch again; exactly-once downstream handling is not proved.

## Changesets native artifact mode

Changesets 3.0.3's public `pack --from-publish-plan publish-plan.json --out-dir artifacts` creates a real tarball
and an embedded SHA-256 integrity. Independent hashing confirms the recorded digest before mutation. The fixture
appends bytes, then invokes public `publish --from-pack-dir artifacts --no-git-tag` with only a recording npm
executable available. Changesets exits successfully and supplies the altered tarball path to that executable despite
the stale recorded digest. Thus native artifact publication preserves the selected path, but this observation does
**not** demonstrate digest enforcement. No real registry was contacted, no package published, and no tag created.

This is an observed missing check at that seam, not evidence of an exploitable production artifact replacement.
Forge likewise does not explicitly rehash the downloaded tarball before upload; its post-publication registry
comparison detects changed bytes only after attempted publication. Authenticated Actions artifact transfer is a
separate trust boundary, not exercised or disproved here. Retaining Forge's registry equality/retry layer remains
necessary when integrating Changesets. A pre-upload local digest check would be a separately scoped hardening change
for the baseline and every finalist.

## Authority and integration cost

All finalists retain GitHub as sole publication authority, current environment selection, protected manual approval
or narrowly reviewed automatic exception, least-privilege job permissions, `id-token: write`, provenance flag,
immutable tag check, inspected artifact transfer, registry equality and downstream dispatch ordering. These
requirements belong to the workflow and registry boundary rather than a version calculator. No workflow,
environment, token or trusted-publisher configuration changed in this evaluation.

| Approach       | Additional integration and recovery ownership                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline       | Existing manual reviewed manifest/changelog preparation and package job orchestration; existing publisher/retry contract                                                                        |
| Changesets     | Reviewed changeset/version state, native tag-to-Forge prefix mapping, auto-patch policy bridge, either existing pack step or adapter from native packed plan; retain registry equality/recovery |
| Nx Release     | Independent project/version-plan configuration, prepared manifest/changelog handoff and tag mapping; retain publisher, policy and package retry orchestration; no task-runner adoption required |
| release-please | Manifest release PR/history/label coordination, reviewed auto-patch bridge and prepared file/tag handoff; npm publication intentionally remains separate; retain publisher/retry contract       |

The [baseline inventory](release-baseline-391.md) records read-only live evidence: manual environment protection,
main-only automatic environment and public provenance attestations. Current npm trusted-publisher configuration
remains unverified. A source `--provenance` flag and controlled facade acceptance do not prove live OIDC
authentication, provenance issuance, environment enforcement, npm permissions, registry availability, dist-tag state
or GitHub artifact transport. Actual GitHub-hosted release rehearsal remains a migration gate for any future
adoption. No candidate earns extra live-safety credit from this dry run.
