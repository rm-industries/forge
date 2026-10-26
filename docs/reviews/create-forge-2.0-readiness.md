# create-forge 2.0.0 readiness

<!-- cspell:ignore miniflare mrhx -->

Status: **blocked for publication**. This is an unpublished candidate; no package,
release tag, public dist-tag, consumer file or shared setting was changed.

## Subsequent authoring-policy change

On 2026-10-26 the maintainer requested removal of the template authoring lock and
its npm Dependabot updates. The template-sync workflow and lock-only refresh path
were removed as obsolete. The evidence below records the prior implementation;
[template maintenance](../template-synchronization.md) describes the current policy.
The delivered package already excluded that lock; generated consumers still own
and replay their locks. Follow-up validation passes 55 tooling contracts, root
verification types, workflow syntax, package inspection, fresh standalone quality
(45 tests with canonical starter regressions) and unchanged consumer-lock replay.
Repacking produces the identical local integrity and unpacked tar hash recorded
below, preserving the hosted final-artifact evidence.

The local `verify:template` command has a pre-existing stale URL-default assertion
and fails before installation. Follow-up acceptance instead uses the public
isolated preparation command followed by actual installation, lock/peer checks,
clean replay and consumer quality. That separate verifier assertion is unchanged.

## Final candidate

Source: `7bdf8869ecc51ec467a34b54be8ef8a01a5ebdb4`, including the final reviewed
ordinary-lock destination guard and template-sync shell fixes.
Package: `@rm-industries/create-forge@2.0.0`.

The independently packed local artifact has SHA-512 integrity
`sha512-cWihnhl0yevw+DpQKkI/l8lNUvB4CwgogsX0KC7cXHH9qhs9Eug+x0LWjV7ziH6bt+xOhdZnsq9DpErcNcQPqg==`
and SHA-1 `0c2a7f8519299c1e4fac8ac9a4556054605d6d17` (117,749 bytes).
The existing release preparer validates this identity against the 2.0.0 manifest
and matching changelog; its stable plan selects `create-forge-v2.0.0` / `latest`.
This plan is evidence only and creates no tag or publication.

The final hosted weekly selection records the same source and version with integrity
`sha512-qJzz96woRDZ+tXFJ1V3p9gyWQrXlwpUfDFgUfOT9P9UyAXI9qaGrSdefk4uIAx0/lsD1xfv/4N/mQeaqi/Yy+w==`
(117,872 bytes). Local and hosted gzip streams differ, so their compressed integrity
is not interchangeable. Decompression produces byte-identical 491,008-byte tar
streams, SHA-256 `03143e0fe943a3e64ac220379837ccc70d277835b63feebe61a8c2f964d3b4a4`;
all entry content hashes, modes, sizes and timestamps match. Hosted consumers use
only the recorded hosted selection artifact, never a substituted local tarball.

Generator, template, repository and website Node 22 minimum is 22.23.4; npm 10.9
and 11 remain supported. Unchanged independent libraries retain their published
engine contracts. Astro retains its range; fresh resolution selects Astro 7.4.2.
The fresh pairs resolve content-model 1.1.10 / Sveltia CMS 0.251.0 and
browser-oxfmt 0.1.2 / Oxfmt 0.74.0, using actual registry packages.

## Local evidence

On macOS arm64, Node 26.9.0 / npm 11.19.1:

- Packed CLI verification passes, including installed `--version`, generated
  runtime metadata and no-install output. The Node floor assertion first failed
  against the old template, then passed after the baseline update.
- Final repository contracts: 62 tests in 13 files. Final generator tests:
  132 tests in 14 files, including ordinary and Cloudflare unsafe-lock guards,
  failed network/SIGINT recovery, and materialization rollback.
- Root types, code lint, formatting, Markdown lint, spelling and documentation
  validation pass. Native Rust quality is unavailable locally; no local full
  repository quality pass is claimed.
- All 13 final installed packed-CLI scenarios pass, including ordinary creation,
  nested output, GitLab/dual-provider output, no-install and Cloudflare recovery;
  actual install failure/SIGINT recovery, consumer quality and unchanged lock
  replay pass. Generated consumers have no workspace dependency overlay.
- Compatible authoring refreshes for both pairs preserve ranges and produce only
  lock changes; source/range changes and independent release paths retain their
  release contracts. The actual template-sync tests run real npm resolution.
- Generated GitLab rendering and executable contracts pass in generator tests
  and installed-CLI scenarios. GitLab remains backup-only; no hosted GitLab gate
  or schedule was added.

The earlier [model/CMS](model-cms-ranges-413.md),
[formatter](formatter-fresh-delivery.md) and [weekly](fresh-weekly-417.md) records
retain their original artifact/runtime limits. They are supporting evidence,
not substitutes for final-artifact acceptance.

## Corrective delivery and bundled-lock rollback

Both rehearsals use isolated archive copies of the 2.0 source at `d9b1411`, before
the final lock-destination guard review fix. They change no active production
policy, public tag or consumer source. The [inert rollback patch and procedure](fixtures/fresh-delivery-418/README.md)
retain the reproducible source change.

The pin-only corrective generator is scratch `2.0.1-correction.0`, with integrity
`sha512-jO+fRadaZmJAQKQIMqbjcwIPXcfupBUwbHQ9VqqBYwUkbuCoJtVqlC6rydyAIdu86c26eurbGeeW65Pv6RWtyw==`.
It temporarily pins content-model 1.1.10, CMS 0.251.0, browser-oxfmt 0.1.2 and Oxfmt
0.74.0. Its actual packed installed CLI delivers those pins, installs published
packages and passes `quality:core` (40 tests, coverage, build and output validation).
The eight controlled peer/correction fixture tests also pass: a permitted newer
fixture package fails the generated public behavior assertion, and the corrected
packed fixture generator restores the assertion. This is a synthetic upstream
regression, not a claim of an actual broken upstream release. Remove temporary
pins only after upstream behavior and peer compatibility pass renewed review.

The current-source bundled-lock generator is scratch `2.0.1-rollback.0`, integrity
`sha512-ZSL7vHYw8QnpX6Rjw8PvXKJEdoIbQt7MfaGlLkn7mo0SUvgDxqjvYxruuam+OpVbj29fbp0lJdgF0ouwNFDXlQ==`.
Its installed CLI creates no-install output containing a normalized bundled lock.
Running `npm ci` from that consumer directory succeeds with npm 11; the SHA-256
lock hash remains `47b5fe4e1812d50f4150e56b5ae4fed581cd86aae15a96f0b4543da629403f5a`.
Consumer `quality:core` passes, and all 12 delivered Chromium CMS/formatter
save/recovery tests pass. No consumer workspace overlay is used. Production
still omits the lock; returning to bundled-lock delivery requires a separately
reviewed generator release and all safety, compatibility and security gates.

The actual published locked 1.3.0 artifact was also installed separately and its
bundled lock replayed unchanged with npm 10, followed by consumer quality. Its
older source/security state is not a clean release gate or a remote repair for
old generators. New releases cannot migrate existing projects or alter the
metadata of old generators.

## Security gates

Required root audit fails on the high-severity advisory
`GHSA-xjj6-f33q-929c` through `wrangler > miniflare > undici`.
The final fresh consumer audit reports 22 affected packages: 13 high, 3 moderate,
6 low, none critical. The unchanged required audit gate fails for
`GHSA-c475-qrg2-pj4r` (basic-ftp in the Lighthouse graph) and
`GHSA-mrhx-c7xc-m3w5` (Zod in the Lighthouse/Puppeteer graph).
These are captured failures, not passing gates. Existing allowlist entries were
not expanded, no threshold was lowered, and previous waivers do not carry forward.
Remediation or a separately authorized explicit bounded release exception is
required before publication. Unrelated audit remediation is outside this change.

## Hosted final acceptance

The final [Package Release prepare-only run](https://github.com/rm-industries/forge/actions/runs/40244144443)
for source `7bdf886` passes; publication is skipped. Its inspected `release.json`
records the hosted integrity above and SHA-1
`dcc777b37cc229f936b5170527bf6fce85d76ac2`. Its tarball is byte-identical to the
weekly monitor selection tarball. Hosted release quality includes the native Rust
WASM build, types, 57 browser-oxfmt tests, 132 generator tests, 32 model tests and
27 frontmatter tests. This hosted native result closes the local toolchain limit.

The final [weekly candidate run](https://github.com/rm-industries/forge/actions/runs/40244142606)
passes all five quality lanes: minimum Node 22.23.4 / npm 10.9.0, latest Node
22 / npm 11, Node 24 / npm 11, Linux Node 26 / npm 11, and macOS Node 26 / npm 11.
Each installs the recorded artifact, validates peers/isolation, replays its own
unchanged lock and passes consumer quality. The exact minimum lane records lock SHA-256
`bb52f8ee5c79ba56a858611adbdaec2f1b3940166ceec1632ffc7f4c376044b5`
and the four pair versions listed above. The primary Linux Node 26 lane passes
all 40 consumer quality tests, all 114 Playwright tests across Chromium, Firefox
and WebKit, and Lighthouse budgets for nine runs across three URLs. Earlier
1.3-metadata or cancelled 2.0 runs do not establish this final artifact. Successful
preparation and weekly acceptance do not waive the failing required audits.

## Publication and monitoring handoff

Actual stable selection resolves published 1.3.0 with integrity
`sha512-hPCvOn+gcKCfoVVm/Z6K5UzMoqOiUgmG7cgYwo3XQinpv+pIaUUnronFB38scLm+C5PoLyhxQJ6+aIAd2TVNkg==`
and explicitly reports `inactive`. It is not freshness acceptance. Candidate
checks use the packed candidate; daily/weekly stable monitoring resolves and
verifies the published artifact once per run and activates at the first stable
2.0 publication. Every lane shares that identity and uses its own isolated lock.

Before protected manual publication, resolve the security gates and review the
final prepare-only tarball identity, quality evidence and integrity. Publication,
release tags and merging to main remain separately authorized actions.
After the first authorized stable publication, verify registry identity, integrity
and provenance, then observe the first active daily and weekly stable runs.

Rahul owns failure triage. Native repository failure email channel delivery was
verified on 2026-10-25 for PR 419 Create Forge/Template failures; that proves channel
delivery, not receipt from a fresh-consumer scheduled invocation. Observe delivery
for the first relevant scheduled failure after activation. No private address,
mail content, account setting change, notification bot or success message is
included. No issue was manually closed.
