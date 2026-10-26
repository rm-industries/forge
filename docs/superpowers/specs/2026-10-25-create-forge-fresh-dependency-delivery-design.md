# create-forge fresh dependency delivery

<!-- cspell:ignore Projen NextAuth workerd tauri lucia timothymiller -->

Date: 2026-10-25. Status: design for maintainer approval; implementation and publication are separate steps.

## Intent

Let new projects receive compatible dependency updates without publishing create-forge merely to refresh
its bundled dependency snapshot. Keep generated source tied to a generator release, and give each normal
creation its own resolved lockfile before reporting success.

This adopts the mechanism tested in the [combined experiment][experiment], with one deliberate expansion:
browser-oxfmt and Oxfmt also use consumer ranges. Their package-owned engine compatibility checks remain.
The earlier experiment kept these consumer declarations exact, so ranged formatter delivery needs new evidence.

The maintainer approved the decisions below through an interview. This document does not itself authorize
an implementation, package publication, repository setting change, or consumer migration.

## Goals and boundaries

- Remove the lockfile from the delivered template, while retaining repository and authoring lockfiles.
- Use bounded ranges for both model/CMS and browser/CLI formatter dependencies.
- Separate compatible authoring-lock refreshes from generator releases.
- Detect failures in the generator that users can currently install, including failures after publication.
- Preserve materialization rollback, dependency isolation, peer checks, security gates and consumer ownership.

No Projen adoption, live template download, new package manager, consumer regeneration, automatic migration,
automatic corrective publication, or new notification service is included. Existing projects retain their
source and lockfiles. Other dependency pins are not widened automatically by this feature.

## Approaches and external comparison

The selected approach is a versioned, bundled source template with static dependency ranges and fresh
installation. Lock omission with exact model/CMS pins does not deliver the intended reduction in
synchronization releases. Projen was stopped at the approved experiment checkpoint because the inspected
slice exposed no maintained policy or writer it could remove.

Primary-source comparison, inspected on 2026-10-25:

| Property                 | create-t3-app                                                        | T4 App / create-t4-app                               | Selected Forge design                                               |
| ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Template source          | Bundled with the CLI                                                 | CLI clones the live template repository              | Bundled with the generator release                                  |
| Delivered lock           | No template lock found                                               | Clone retains committed bun.lockb                    | No template lock                                                    |
| Dependency declarations  | Mostly static ranges, with selected exact pins                       | Mixed static pins and ranges                         | Bounded ranges for both selected pairs; other policy retained       |
| Initial installation     | Selected package manager installs in the generated project           | CLI runs bun install against the clone               | npm install creates the project lock                                |
| Later ownership          | Consumer owns the generated app                                      | Source copy; separate optional update bot advertised | Consumer owns source and lock; no regeneration                      |
| Fresh-install monitoring | Candidate-scaffolding E2E on PRs; no schedule in inspected workflows | No scheduled fresh-CLI check in inspected workflows  | Daily published-stable checks; PR candidates; broader weekly checks |

T3's [version map][t3-versions], [base manifest][t3-manifest], [install helper][t3-install],
[template-copy helper][t3-scaffold], [E2E workflow][t3-e2e] and [ownership FAQ][t3-faq] support the first column.
The inspected tree has a root authoring lock but no template lock. Its dependency policy still requires
maintainer updates: the [inspected commit][t3-commit] changes dependency ranges and adds release intent.
Ranges reduce some release work; they do not remove it. No claim is made about private monitoring outside
the inspected [workflow directory][t3-workflows].

Here, T4 means timothymiller/t4-app. The [official instructions][t4-docs] point to create-t4-app.
Its [published 2.4.2 artifact][t4-cli] clones the live repository, removes .git and runs bun install.
The inspected template retains [bun.lockb][t4-lock] and has [mixed dependency declarations][t4-manifest].
The CLI does not remove that lock or request frozen installation. A fixed CLI version therefore does not
identify a fixed template source. Forge does not adopt that source-delivery model. The CLI's recorded
gitHead could not be tied to an accessible source commit, so its versioned published artifact is the evidence.
T4 advertises an [optional update bot][t4-updates]; its availability was not tested and no equivalent is proposed.

These are source/artifact inspections, not executed T3 or T4 installation results. They support the shape
of the selected approach, not Forge's compatibility or security guarantees.

## Project creation contract

1. Materialize the bundled source, package manifest and selected CI configuration.
2. Unless --no-install was selected, run npm installation in the generated project.
3. Complete optional Git initialization, preserving the existing install-before-Git order.
4. Report successful normal creation only when installation succeeded and a valid project lockfile exists.

The project lock must identify the generated package, match its declared dependencies, use registry packages
instead of repository workspace links, and select peer-compatible versions. Normal creation must not
silently succeed without a lock because of npm configuration. The builder chooses the smallest explicit
installation option and postcondition check that enforce this contract.

--no-install remains supported. Ordinary output then has no lock; the completion instructions must say
to run npm install before npm ci. Cloudflare retains its existing networked lockfile-only preflight,
including under --no-install. This is an explicit exception to ordinary no-install output, not offline behavior.

Preserve the distinction between failures:

- Failed materialization restores original files and removes files created by that invocation.
- In particular, track Cloudflare's lock before its resolver can write it: back up an existing regular file,
  track a new file for cleanup, and reject unsafe destinations. Later rendering failure must restore it.
- Failed or interrupted dependency installation preserves the materialized source and reports recovery steps.
  Preserve nonzero failure status and exit 130 for interruption; do not report successful project creation.

Generated CI continues to use the consumer lock with npm ci. Removing the delivered lock does not make
normal consumer CI resolve fresh dependencies or update existing projects automatically.

## Dependency compatibility contract

Initial approved consumer declarations, based on the evaluated versions:

| Package                      | Range            | Compatibility owner                                                   |
| ---------------------------- | ---------------- | --------------------------------------------------------------------- |
| @rm-industries/content-model | ^1.1.10          | Its tested Astro/Sveltia peers and public model/adapter contract      |
| @sveltia/cms                 | >=0.251.0 <1.0.0 | Selected content-model release's tested CMS peer requirement          |
| @rm-industries/browser-oxfmt | ^0.1.2           | Its browser API, supported options, assets and engine contract        |
| oxfmt                        | >=0.74.0 <1.0.0  | Selected browser-oxfmt release's exact tested engine peer requirement |

Use these initial floors unless the maintainer approves another tested baseline. Fresh-install evidence
must record actual resolved versions; writing a range does not establish compatibility with all future versions.

Retain package-owned peer declarations and their existing review/test requirements. browser-oxfmt embeds
one engine: retain the exact upstream engine peer and the installed-engine equality check. A later compatible
browser-oxfmt patch can declare a newer engine, allowing npm to select a new pair inside the template ranges.
Do not broaden the engine peer merely to make installation succeed. Browser-oxfmt 0.2 is excluded by ^0.1.2
and requires a separately reviewed range change. Continue to treat pre-1.0 breaking changes conservatively.

Use normal npm peer resolution. Do not use force or legacy-peer modes. npm is not a complete compatibility
search: it can fail on a newer permitted model/browser package rather than backtrack to an older working one.
An optional peer constrains an explicitly installed host. Include both facts in the regression evidence.

Peer satisfaction alone does not prove behavior. Test model adapters, metadata/body preservation, formatter
option handling and browser/CLI output compatibility against the actual selected packages.

## Authoring refreshes and release intent

Keep authoring lockfiles, npm ci for authoring checks, published-package identity/provenance verification,
and isolated consumer validation. Extend verified dependency-refresh handling to the formatter pair.

A refresh wholly inside unchanged approved ranges may update authoring locks without bumping create-forge
or adding generator release intent. Such lock-only PRs may retain automatic merging after their designated
validation passes. Do not rely solely on permissive repository merge rules to establish that evidence.

Changes to template source, dependency floors/ceilings, peer compatibility or generated behavior require
maintainer review and an appropriate release assessment. Changing declarations is not a lock-only refresh.
Package releases remain independent. A browser-oxfmt release does not automatically release create-forge.

Update both template-sync preparation and automatic-release eligibility: today's pure model/CMS pin-refresh
path creates a generator patch and is accepted by the automatic selector. Remove that obsolete publication
intent for compatible refreshes, without disabling unrelated legitimate release paths or weakening package
publication checks. Reuse existing automation rather than creating a second policy owner.

## Monitoring and ownership

| Trigger                       | Generator under test               | Required evidence                                                                                         |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Relevant PR                   | Packed candidate from that PR      | Fresh isolated bootstrap, lock/peer/isolation checks, quality:core, focused Chromium CMS/formatter checks |
| Daily default-branch schedule | Currently published stable release | Same fresh-bootstrap checks against the artifact users receive                                            |
| Weekly                        | Published stable release           | Broader supported runtime matrix, Chromium/Firefox/WebKit, full browser/CMS checks and Lighthouse         |
| Release acceptance            | Final candidate artifact           | Packed behavior suite and full supported runtime/browser/Lighthouse acceptance before publication         |

Activate published-stable monitoring with 2.0.0 publication. Before that, validate candidates without
pretending the old locked release demonstrates the new contract. Keep existing authoring and generator checks.

Resolve the stable version once per run and record its package identity and registry integrity. Use that
same artifact throughout the run, fresh isolated consumers and writable task caches, with no workspace overlays
or reused consumer locks. Retain resolved package versions, consumer lock identities and actionable failure
output. Lock replay must preserve the resolved lock. Weekly runtime coverage retains the existing supported
minimum/latest lanes and macOS coverage; this feature does not expand supported platforms.

Daily checks must execute quality:core and actual focused Chromium CMS save/recovery and formatter behavior,
not only successful dependency installation. Broader weekly checks must exercise the published stable artifact
too; testing only main could conceal a failure in the release still available to users.

Rahul is the initial triage owner. Use native GitHub workflow-failure notifications, quiet success, and the
existing review process. Verify notification delivery during setup. No issue bot, extra notification service,
automatic emergency publication, or permanent schedule outside GitHub is included.

GitLab is a backup source for Forge, not a hosted release or monitoring gate. Preserve generated GitLab CI
support and local rendering/executable contracts, including its npm ci behavior. Do not add a GitLab monitor
or require a hosted GitLab pipeline for this feature.

## Rollout, correction and security

Target create-forge 2.0.0. Removing the lock from ordinary --no-install output changes an asserted generated
contract under ADR 0006. Use existing unpublished release dry runs and packed candidates; a public npm next
prerelease is not required. Retain protected manual publication. A stable artifact has different version
metadata from a prerelease and must receive its own final checks.

Update ADR 0006 to distinguish versioned template source from freshly resolved dependencies. Replace the
earlier proposed non-adoption conclusion in ADR 0010 with the approved delivery decision and its limits.
Preserve ADR 0003 installation boundaries and ADR 0004 materialization safety. Document no-install behavior,
consumer lock ownership, compatibility limits and the absence of automatic upgrades to old projects.

Existing audit requirements remain release gates. Known findings require remediation or a separate explicit,
bounded release exception. Previous exceptions do not carry forward. Do not expand global allowlists, lower
severity thresholds, or treat captured failing audit JSON as a passing gate. Unrelated audit remediation is
outside this feature; unresolved required findings block publication rather than silently broadening scope.

For an upstream failure, diagnose the failing public behavior and submit a reviewed correction. A corrective
generator release may temporarily pin the affected pair to known-working versions while upstream work proceeds.
Keep that exception documented and tested; normal policy remains bounded ranges. Existing protected publication
and audit requirements still apply. Do not automatically publish, move dist-tags or rewrite consumer files.
Old published generators retain their own metadata and cannot be remotely repaired by a new release.

Rollback to bundled-lock delivery is also a reviewed release decision, using a tested snapshot. Retain the
current locked release as evidence and a documented fallback; do not silently change public release tags.

## Acceptance evidence

- Packed template omits its lock; ordinary successful creation produces a valid consumer lock through real install.
- Ordinary --no-install omits it and gives correct instructions; Cloudflare's preflight exception is explicit.
- Failed network access, interruption, unsafe lock destinations, destination collisions and post-resolution rendering
  failures preserve the stated recovery behavior, including both new and pre-existing Cloudflare locks.
- Both dependency pairs resolve under supported Node/npm lanes. Test overlapping/disjoint peers, optional peers,
  the no-backtracking failure, and a permitted but behavior-breaking update with a reviewed corrective candidate.
- Formatter range adoption gains evidence absent from the earlier experiment: packed fresh resolution of both
  packages, exact engine identity/options checks and real browser/CLI parity and CMS preservation/recovery.
- Actual published packages supply consumer behavior. Authoring overlays or mocked formatting do not stand in for it.
- Consumer quality, packed CLI scenarios, runtime/browser/Lighthouse coverage and unchanged lock replay pass.
- Compatible lock refresh creates no generator bump, changelog release intent or automatic publication eligibility;
  source/range changes retain review and release handling. Cover both package pairs and unrelated release paths.
- PR checks use their candidate; scheduled checks use the recorded published stable artifact. Verify schedule
  activation, manual rehearsal and notification delivery without creating a second monitoring system.
- Existing consumer files and locks are untouched; generated GitHub/GitLab commands continue to replay their locks.
- Required audits pass or receive a separate explicit disposition before protected manual publication.

## Builder decisions and approval

The builder may choose workflow/job names, exact relevant-path filters, non-overlapping UTC schedule times,
minimal installation/lock validation details, fixture structure and integration points in the existing sync tools.
These are implementation choices, not permission to change the policies above. Keep existing capabilities
where possible and remove superseded snapshot-only assertions without removing isolation or recovery checks.

After maintainer approval of this document, write an implementation plan. Do not implement the feature as
part of this spec-writing task. The experiment PR is [#410][experiment-pr]; this spec depends on its evidence
and does not turn that evidence-only branch into production adoption.

[experiment]: ../../reviews/projen-lockless-combined.md
[experiment-pr]: https://github.com/rm-industries/forge/pull/410
[t3-versions]: https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/cli/src/installers/dependencyVersionMap.ts
[t3-manifest]: https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/cli/template/base/package.json
[t3-install]: https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/cli/src/helpers/installDependencies.ts
[t3-scaffold]: https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/cli/src/helpers/scaffoldProject.ts
[t3-e2e]: https://github.com/t3-oss/create-t3-app/blob/4709861f7e67a15564c0460c13e7b4b6cfcae40d/.github/workflows/e2e.yml
[t3-faq]: https://create.t3.gg/en/faq
[t3-commit]: https://github.com/t3-oss/create-t3-app/commit/4709861f7e67a15564c0460c13e7b4b6cfcae40d
[t3-workflows]: https://github.com/t3-oss/create-t3-app/tree/4709861f7e67a15564c0460c13e7b4b6cfcae40d/.github/workflows
[t4-docs]: https://docs.t4stack.com/getting-started
[t4-cli]: https://registry.npmjs.org/create-t4-app/-/create-t4-app-2.4.2.tgz
[t4-lock]: https://github.com/timothymiller/t4-app/blob/8f7ab4d1f0c2144248a145c46e57d2622175b912/bun.lockb
[t4-manifest]: https://github.com/timothymiller/t4-app/blob/8f7ab4d1f0c2144248a145c46e57d2622175b912/package.json
[t4-updates]: https://t4stack.com/updates
