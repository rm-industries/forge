<!-- cspell:words ECONNREFUSED noinstall Noinstall Vitest mrhx -->

# Dependency failure and recovery rehearsal

Issue: [#387](https://github.com/rm-industries/forge/issues/387), part of
[#369](https://github.com/rm-industries/forge/issues/369).

## Result and scope

The experimental packed generator preserves actionable installation failures, interrupted setup, and
existing destination safety. No-install output followed by actual npm installation passes the delivered
project's `quality:core`. A deliberately broken local fixture demonstrates allowed semver selection,
detection through the public test command, and recovery through an exact pin. That is a synthetic
mechanism rehearsal, not an actual upstream incident or permission to delete the production lockfile.

Evidence was collected October 23, 2026, using Node 26.9.0 and npm 11.19.1. The candidate is #386's packed
`@rm-industries/create-forge@1.2.0` prototype, installed outside repository workspaces. Its omitted
bundled template lockfile is experimental. No production code, dependency range, peer constraint,
audit exception, published package, or existing consumer was changed.

## Packed CLI failure boundaries

The installed executable ran as a subprocess against independent temporary destinations with
`--yes --no-git`. Setup ran real `npm install`, without substituting the npm executable.

| Scenario                                                                | Observed result                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--no-install`                                                          | Exit 0; source and manifest exist; no consumer lockfile exists yet.                                       |
| Registry `http://127.0.0.1:1`, zero fetch retries                       | Exit 1; npm reports `ECONNREFUSED`; CLI says the project remains and directs retry there. Source remains. |
| Loopback server holds npm requests; send SIGINT after a request arrives | Exit 130; `npm was interrupted` diagnostic names the project directory; manifest and source remain.       |
| Existing destination containing a sentinel file                         | Exit 1; sentinel bytes unchanged; no partial generated manifest.                                          |

Failed installation was never reported as successful creation. Existing generator materialization and
process tests retain narrower coverage for staging, collisions, and rollback; these public CLI probes
do not replace that safety suite.

## No-install, installation, and working checks

Generate with `--no-install --no-git --name recovery --site-name Recovery`, then run `npm install` and
`npm run quality:core`. Both commands exit 0. Installation creates the consumer lockfile. Formatting,
spelling, code/CSS/Markdown linting, unused dependency checks, Astro type checking, all 39 unit tests
with coverage, production build, and seven required build-output checks pass.

The graph uses published packages, including content-model 1.1.8 and Sveltia CMS 0.236.0; there is no
local package overlay. To conserve disk, #386's completed fresh-resolution project's dependency tree
was moved into this independently generated directory before installation. This is real npm
reconciliation with a warm dependency tree/cache, not another cold-install measurement. #386 supplies
independent fresh-install and clean locked-repeat evidence.

An initial directory-derived name, `noinstall` / `Noinstall`, failed CSpell. Repeating generation with
explicit dictionary-valid name and site-name inputs passed without weakening checks. This is a
starter-content naming constraint, not dependency resolution breakage.

## Allowed-but-breaking resolution and correction

A scratch generated project received a temporary scoped dependency, `@forge-recovery/compat`, and one
Vitest test of its public export. A loopback registry served two tiny tarballs: 1.0.0 exports the required
title `Recovery`; 1.0.1 exports an empty title. The test expects the independent required literal.
There are no install scripts, public publication, executable replacement, or global registry changes.

1. Set only the fixture scope's registry in the scratch project's `.npmrc`.
2. Run `npm install --save-dev '@forge-recovery/compat@^1.0.0'`. The consumer lockfile confirms npm picks
   1.0.1, an allowed semver update rather than an unsatisfiable range.
3. Run the unchanged delivered `npm run test:unit`: the added contract test fails; all 39 original
   tests pass. This is the red observation through the public project command.
4. Run `npm install --save-dev --save-exact '@forge-recovery/compat@1.0.0'`, then the same test command.
   The manifest and lockfile select 1.0.0 and all 40 tests pass.

This demonstrates targeted correction without broad fallback or audit bypass. It does not establish
that an existing third-party range is unsafe or that the original tests detect this synthetic behavior.
The first correction was exercised directly in the scratch consumer. A second rehearsal then proved
that the correction survives the actual packed-generator delivery boundary:

1. Copy the experimental installed generator into two scratch package directories. Add the same fixture
   dependency and contract test to each bundled template. Keep the old prototype at version 1.2.0 with
   `^1.0.0`; change the corrected prototype to version 1.2.1 with exact `1.0.0`.
2. Pack both with `npm pack --ignore-scripts`, install each archive into a separate isolated CLI runner,
   and verify their public `--version` output reports 1.2.0 and 1.2.1 respectively.
3. Generate independent projects through each installed CLI, then run actual npm installation. The old
   archive's output resolves fixture 1.0.1 and fails the public unit command. The corrected archive's
   output resolves 1.0.0, passes all 40 unit tests, and passes full `quality:core`, including coverage,
   type checking, production build, and seven required build-output checks.

The old packed archive remains unchanged; correcting the new archive cannot remotely repair it. The
old consumer was installed fresh; the corrected consumer reused its completed dependency tree before
actual npm reconciliation to avoid duplicate disk usage. The first corrected prototype's full quality
run caught unsorted package metadata introduced while adding the fixture; formatting that bundled
manifest before repacking corrected the authoring mistake. Generated output was not reformatted to
obtain a pass. Both archives are local experimental artifacts, never published. The separate unmodified
candidate passes `quality:core` without the fixture. This proves the packaging/correction mechanism,
not an actual existing dependency incident; production publication remains out of scope.

## Preserved policies and limits

- **Security:** `npm run audit` still fails on high vulnerabilities. It reports the same two known
  Lighthouse CI advisory identifiers as #386: `GHSA-c475-qrg2-pj4r` and `GHSA-mrhx-c7xc-m3w5`. Existing
  time-bounded allowlist entries were not extended. Passing `quality:core` is not a clean audit.
- **Dependabot:** generated configuration retains root npm updates and weekly scheduling, plus GitHub
  Actions updates. Directory applicability was inspected; no hosted job was triggered. Dependabot
  updates consumer dependencies, not arbitrary future Forge template changes.
- **CMS and peers:** existing model/CMS pins and peer ranges are unchanged. The 39 delivered tests cover
  content collections, CMS configuration, previews, and preview collections. They support the published
  contract but do not prove browser-driven CMS saves preserve content bytes. The repository's separate
  preservation probe remains necessary; this ticket did not execute an interactive CMS save.
- **Offline:** no-install delivers editable source. Lockless installation needs registry metadata and
  packages unless npm has the required cache. A bundled lockfile never guaranteed an uncached offline
  install. Cloudflare generation retains its lockfile-only registry preflight, so its no-install path
  may access the registry; do not promise universal offline generation.
- **Old versions:** a corrective release changes only its own bundled ranges. Earlier generators keep
  their original ranges; schedules and new releases cannot remotely repair them. Users must choose a
  corrected generator or deliberately fix their own manifest/lockfile. Existing locked consumers use
  their lockfile until they choose to update it.

## Evidence and reproduction

Scratch evidence under `/tmp/forge-369/recovery/` includes `failures.mjs` for CLI probes and
`restriction.mjs` for the loopback registry and red/pin/green sequence. Logs: `network.log`,
`interrupt.log`, `existing.log`, `recovered-create.log`, `recovered-install.log`,
`recovered-quality.log`, `recovered-audit.log`, `allowed-install.log`, `allowed-check.log`,
`restricted-install.log`, and `restricted-check.log`. These local artifacts are not a permanent CI
framework or consumer obligation. Temporary dependency trees were removed after collection; generated
source, lockfiles, and logs retain the resolved-version evidence.

The packed-delivery follow-up is under `/tmp/forge-369/recovery/packed/`, including both old and corrected
archives, CLI version logs, generated manifests/lockfiles, `old-test.log`, `corrected-test.log`, and
`corrected-quality.log`. `packed-correction.mjs` and `packed-correction-retry.mjs` record the scratch
procedure, with the retry formatting the corrected bundled manifest before packing. CLI runners were
installed independently; no package was published. Consumer dependency trees were removed afterward.
