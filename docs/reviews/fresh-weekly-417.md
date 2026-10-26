# Weekly fresh consumer rehearsal (#417)

The weekly monitor extends the daily selector and consumer runner. It selects one
published stable tarball, records its integrity, and shares it across five runtime
lanes. Candidate rehearsal uses the same isolation and public commands. See
[fresh consumer monitoring](../fresh-consumer-monitoring.md) for the matrix and
manual commands. Daily PR checks remain focused on Chromium; weekly full browser
and Lighthouse checks run only on primary Ubuntu Node 26.

## Verification on 2026-10-25

The approved TDD seams were the coverage/command interface and workflow contract.
The matrix test first failed because weekly planning did not exist; implementing
it passed all six selector tests. The workflow contract then failed because no
weekly schedule existed; the extended workflow passed both suites (12 tests).
A later exact npm-floor test failed against the major-only lane and passed once
the lane selected npm 10.9.0. After merging the current integration branch, all 61 root contracts and root
TypeScript checks passed. Changed code lint, formatting, documentation Markdown
and spelling checks passed. Raw `git diff --check` passed.

The same recorded unpublished candidate from #416 was used for both real probes:
source `15ef55be18430ec0b6d1d33f1805baa5470691ab`, generator version 1.3.0,
SHA-512 integrity
`sha512-AAnvml3aSas5za/mzFAiDGU4RQ/7/BRsL3OEykKnXB1fV+7V1On624TYFp0fDOBVlA+fHRTc7xKZz2WJS8j4mA==`.
It predates the final combined dependency ranges and Node floor. This is harness
rehearsal evidence, not final 2.0 release acceptance.

- Node 22.23.4/npm 10.9.0 (the declared exact floor) on macOS: fresh public CLI installation, installed/lock
  isolation, peer validation, byte-identical `npm ci` replay and `quality:core`
  passed, including 40 tests with coverage. The same probe also passed with
  npm 10.9.4. This tests the exact minimum runtime/npm on macOS, not the hosted
  Ubuntu lane.
- Node 26.9.0/npm 11.19.1 on macOS: the same preparation and quality checks passed.
  The full delivered browser command passed 38 Chromium and 38 WebKit cases and
  one Firefox case without browser launch. All 26 attempted Firefox browser cases
  failed with `Could not find profile folder`; 11 cases did not run after the
  serial group failure. The weekly command returned failure, as required.
- The delivered Lighthouse command ran separately after the Firefox failure and
  passed all budget assertions across three URLs and nine runs. Performance was
  0.99; accessibility, best practices and SEO were 1.00 on every run. Hidden
  `.lighthouseci` reports were retained. This does not turn the failed full
  browser command into a passing weekly run.
- Independent live stable selection recorded published 1.3.0 and explicitly
  reported inactive. No main build or candidate replaced that selected artifact.
- A separate actual `npm audit --json` observation returned exit 1: 22 findings
  (13 high, three moderate, six low). This is a failing audit observation, not a
  passing release gate. No exceptions, dependencies or audit policy were changed.

Local logs and identities are retained under `/tmp/forge411-implementation/417-*`,
`/tmp/forge417-weekly`, `/tmp/forge417-minimum`, `/tmp/forge417-exact-floor`, and
`/tmp/forge417-stable`.
Consumer locks and browser reports are preserved alongside command logs. The
minimum and Node 26 consumers each retained their own byte-identical replay lock;
locks can differ between runtime/npm lanes.

## Release handoff

Linux Firefox, the hosted five-lane matrix, final combined 2.0 candidate coverage,
and Rahul's receipt of a native GitHub failure notification remain unverified.
The new workflow may require landing on the default branch before manual dispatch
is available. Existing PR checks and the later release rehearsal must provide the
remaining hosted evidence. No GitLab hosted gate or new notification service was
introduced, and no packages or tags were published.
