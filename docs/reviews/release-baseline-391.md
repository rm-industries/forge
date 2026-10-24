# Release baseline and candidate shortlist

Issue [391](https://github.com/rm-industries/forge/issues/391), parent
[370](https://github.com/rm-industries/forge/issues/370). Observed 2026-10-24 against
`997bdc43b7106417fd82073ebb97147a181fe223`. This is an evaluation record, not an
approved migration or permission to publish. The shared limit is two focused working
days across tickets 391–395. At that limit, unresolved safeguards remain explicit;
retain the baseline unless a complete simplification is supported.

## Current contract and migration inventory

[ADR 0006](../decisions/0006-versioning.md) and
[ADR 0008](../decisions/0008-frontmatter-package.md) govern independent versions.
Before 1.0, breaking contracts require minor versions and migration notes; stable
breaking contracts require majors. Compatible fixes are patches and additive stable
features are minors. Browser output/configuration/runtime and upstream engine
identity are part of its contract; frontmatter diagnostics/fixes/peers/runtime are
part of its contract. Downstream compatibility testing never forces a release.

| Package                  | Manifest / first changelog section | Registry latest | Registry next | Release state                                                                           |
| ------------------------ | ---------------------------------- | --------------- | ------------- | --------------------------------------------------------------------------------------- |
| browser-oxfmt            | 0.1.2                              | 0.1.1           | absent        | 0.1.2 is not published and has no remote package tag                                    |
| content-model            | 1.1.10                             | 1.1.10          | 1.0.0-rc.1    | Current version published; remote tag resolves b5e974063df321f811b34917fd60c74f32a5efe4 |
| create-forge             | 1.2.0                              | 1.2.0           | 1.0.0-rc.2    | Current version published; remote tag resolves 4ef18dcb7105c61559eafd38bd25f6dee6f7966b |
| markdownlint-frontmatter | 0.1.0                              | 0.1.0           | absent        | Current version published; remote tag resolves 9661fd75da2ad5b55d349d4f01001dca616468e5 |

Each owns `packages/<slug>/CHANGELOG.md` and `<slug>-v<version>` tags. Historical
repository milestone tags are not package release identities. Remote tags, rather
than possibly stale local refs, are migration evidence: local content-model refs
omitted 1.1.10 while GitHub reported it. Existing stale `next` pointers demonstrate
that stable promotion does not automatically erase prerelease channels. Preserve
history rather than normalize old tags during evaluation. No open release-specific
PR was observed: open PRs 362, 337 and 335 were Dependabot updates. Browser 0.1.2
is pending source state, not evidence of approved publication intent. Recheck this
temporal inventory before any later rollout.

No package has a direct runtime dependency on another Forge package. Browser uses
editorconfig and peers with Oxfmt; content-model peers with Astro/Sveltia;
frontmatter uses YAML and peers with markdownlint; create-forge uses its CLI/schema/
formatting libraries. Root integration tests consume content-model and frontmatter
local source together, an internal test relationship only. The generator copies the
default template at build time: template dependencies pin content-model **1.1.8**
and Sveltia **0.236.0**, with a committed lockfile. This is a shipped snapshot input,
not a create-forge runtime dependency or permission to force every downstream
release. Verified published model metadata and tested peer selection can produce a
reviewed template-sync generator patch. That current policy remains in force.

[ADR 0010](../decisions/0010-dependency-delivery-evaluation.md) proposes retaining
locked delivery after #369; it is not approval of fresh resolution. If fresh
resolution is later adopted, unchanged compatible ranges alone need no generator
release; changed templates, pins, ranges or compatibility rules still need intent
assessment. The #368 task-runner decision is independently decidable.

## Preparation, publication and narrow automation

Ordinary releases require reviewed version and exact-version changelog metadata.
`release:prepare` selects one package, checks manifest/tag/pack-result name and
version, extracts notes, and chooses `next` for prereleases or `latest` for stable.
Manual workflow dispatch is prepare-only: quality, pack with scripts disabled,
release manifest and inspected artifact upload. A tag-triggered workflow prepares
its own exact-commit artifact; reuse of the release PR artifact is not assumed.
The publish job downloads that tarball instead of rebuilding, checks an existing
tag resolves to the event commit (or creates the missing automatic-release tag),
compares existing npm integrity, publishes with provenance when absent, verifies
registry version/integrity, then writes `published.json`, creates GitHub release
metadata and dispatches content-model synchronization. npm versions and successful
tags are immutable; retries retain the same version/commit/integrity and fill in
missing completion evidence. Packages publish separately; no multi-package
transaction currently exists.

Automatic release is limited to content-model peer patches and create-forge
snapshot-sync patches. The configured App login, one associated PR, merged status,
exact merge SHA, same-repository head/base, and `main` base are checked. SHA must be
40 hex characters. Peer branches start `automation/peer-`; generator branch is
exactly `automation/template-content-model`. Every changed file must be eligible,
with package manifest and changelog both present:

- Peer: root manifest/lock and content-model manifest/changelog only.
- Template sync: root lock, generator manifest/changelog and template manifest/lock
  only. Both template model/CMS versions must be exact stable versions.

The increment must be exactly the next stable patch; prereleases, skipped versions,
feature source files, foreign heads and other package releases are excluded. The
previous scoped tag and registry version must exist. Changes since that baseline
must not contain unreleased implementation or shipped template source requiring a
manual baseline. Ineligible main pushes produce `eligible=false`, not a successful
publication. This is a policy adapter each finalist must preserve, not a generic
version-calculation feature. Reviewed automation does not receive another manual
environment approval; browser/frontmatter and ordinary tags do.

## Permission and deployment evidence

The source workflow grants no default permissions. Prepare receives contents/read
and PR/read; only publish receives contents/write and id-token/write. Publication
lives in GitHub; mirrored GitLab checks are not publishing authority. The source
requests provenance and selects `npm-release` for ordinary tags versus
`npm-release-auto` only for eligible reviewed main patches.

Read-only live GitHub API evidence:

- `npm-release`: reviewer rahul0705, self-review prevention false, admin bypass true;
  custom deployment policies allow all four `<slug>-v*` tag patterns.
- `npm-release-auto`: no reviewer rule, admin bypass true; custom policy permits
  `main` only. This matches the no-second-approval exception in source.
- `main`: Repository quality is the sole required status, strict mode false,
  administrator enforcement true, force pushes/deletions false. No required PR
  reviewer object was returned. Source policy saying reviewed does not establish
  that GitHub enforces an independent human approval for every eligible merge.

Public npm metadata for current published model, generator and frontmatter has
integrity plus a `https://slsa.dev/provenance/v1` predicate. This is public historical
metadata, not verification of the attestation signature or current publisher
configuration. npm trusted-publisher repository/workflow/environment bindings,
including whether both environments are authorized, were **not available** through
these read-only checks. No credentials or npm configuration files were read; no
settings were changed. Live OIDC exchange and publication are unverified.

Important baseline limits for the publication rehearsal: the preparer accepts any
nonempty SHA (the workflow supplies `git rev-parse HEAD`); it validates pack-result
metadata, not a recomputed tarball digest. The publish shell trusts downloaded
release metadata and does not independently recompute the local tarball integrity
or compare every manifest identity with the event before npm publication. Registry
version/integrity checks and tag SHA checks exist. Actions artifact transfer also
has its own platform trust boundary; absence of an explicit local rehash alone is
not a demonstrated vulnerability. The recovery rehearsal must establish which
identity/byte properties that boundary proves. Do not give any candidate stronger
credit than demonstrated. Production safeguard changes are outside this evaluation.

## Common comparison and evidence rules

All finalists receive the same scenarios and observation boundaries. Use **D** for
an observed public-entry-point result, **DOC** for current primary documentation or
shipped public API support, **U** for missing/unverified evidence, and **R** for an
observed rejection or limitation with its case recorded. Record native capability,
plugin, retained custom Forge logic, manual operation, external service, and live
configuration separately. D from a controlled registry does not prove live npm
OIDC/provenance. Source/YAML assertions do not prove hosted execution. No weighted
numeric score is used; safety requirements are gates, and maintenance conclusions
must identify actual removed and retained responsibilities. A missing result does
not count as a pass or favor the first tool explored.

| Scenario                                 | Observable contract, applied to baseline and every finalist                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| One independently changed package        | Only its version/notes/plan change; unrelated manifests stay byte-identical                               |
| Multiple changed packages                | Independent versions; order only real published dependencies, not test graph membership                   |
| Docs/internal only                       | Explicit no-release result; no package tags or publication                                                |
| Breaking pre-1.0 / stable                | Minor with migration intent / major; preserve ADR compatibility meaning                                   |
| Reviewed release intent                  | Reviewable per-package decision and changelog, no hidden conventional-commit-only assumption              |
| Prerelease and promotion                 | Concrete prerelease/stable versions, package tags and next/latest publisher decisions                     |
| Eligible peer/template patch             | Exact configured App, merged SHA, branch/files and stable next-patch scope; no second approval            |
| Mixed/untrusted/ineligible automation    | Visible rejection or no-publication; no feature changes escaping ordinary review                          |
| Template update                          | Current copied pins/lock produce deliberate generator patch; conditional fresh-resolution policy separate |
| Artifact identity mismatch               | Wrong package/version/SHA/tag rejected before verified completion                                         |
| Exact inspected artifact                 | Publication command consumes inspected file; independent digest/identity evidence identified              |
| Existing identical / conflicting version | Safe idempotent completion / reject conflicting integrity                                                 |
| Registry verification failure            | Incomplete status; no premature downstream sync                                                           |
| Partial success / interrupted retry      | Successful identities preserved; retry only missing work and reverify successes                           |
| Authority / provenance / permissions     | Source and live config distinct; controlled fixture cannot certify production publisher                   |

Metadata preparation is exercised through isolated repository public commands or
public tool APIs. Publication/recovery consumes inspected artifacts through an
isolated controlled boundary. These are the two approved seams; no private helper
snapshot suite or generic release framework is required. Candidate support below
is DOC until the later common fixture/recovery evidence records D or R.

## Shortlist and ecosystem survey

Published versions observed 2026-10-24: Changesets CLI **3.0.3**, Nx **24.0.1**,
release-please **17.11.2**, Lerna **10.1.1**, semantic-release **25.0.9**, release-it
**21.1.1**. Exact pins make experiments reproducible; latest metadata is temporal.

| Finalist               | Native/documented contribution                                                                                                                                                      | Retained or additional responsibility                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current Forge          | Independent reviewed manifests/changelogs, one-package plans, next/latest, scoped tags and inspected publisher                                                                      | All present manual metadata and custom domain/publication code; use as equal measured comparator                                                                                                                                                                              |
| Changesets 3.0.3       | Committed per-package intent/empty no-release changesets, independent version/changelog preparation; prerelease enter/exit state; CLI 3 native pack and publish-from-pack-directory | Adapt default package-name@version tags to existing scoped tags or keep Forge tag creation. Preserve eligibility and registry-integrity recovery. Native recorded pack checksum is not proof of enforced verification. Check prerelease publisher channel behavior concretely |
| Nx Release 24.0.1      | Independent versions, committed version plans, separate public version/changelog/publish phases, configurable scoped tag pattern                                                    | Configure dependent updating deliberately (`never` for isolated cases); preserve Forge eligibility and inspected publisher. Zero-major defaults must match ADRs. Nx graph/plugin setup is integration cost; adopting its task runner or Cloud is unnecessary                  |
| release-please 17.11.2 | Independent manifest paths, release PR review, conventional-commit/version override metadata, configurable component tags; npm publication is separate                              | Retain Forge publisher and automation policy; release PR API/labels/history/token operations are additional infrastructure. Ordinary release-PR approval must not reintroduce a second approval for eligible reviewed patches                                                 |

All three proceed to equivalent detailed preparation and recovery comparisons.
No finalist wins because a single happy path runs first; metadata-only candidates
can still succeed by keeping the inspected publisher while removing meaningful
version/changelog work.

Survey-only candidates are credible, not unsupported:

- Lerna supports independent versioning, conventional changelogs, prereleases and
  publication, including documented OIDC. Its changed-package/prompt/commit model
  still needs reviewed-intent and Forge eligibility/artifact adapters. Within the
  shared bound, it adds no demonstrated simplification beyond the three different
  metadata models already shortlisted; promote it only if new evidence changes
  that comparison. Nx underpinnings do not force task-runner adoption.
- semantic-release supports branch/channel releases and plugins. Its default
  commit-derived single stream differs from reviewed independent package intent;
  per-package orchestration/monorepo plugins and policy remain. Not impossible,
  but no evidence yet warrants a fourth full prototype within the bound.
- release-it supports interactive/CI release and hooks/plugins. Its official
  monorepo recipe describes synchronized versions with workspace scripts, a root
  aggregator and bumper plugin, and says it was not originally designed for
  monorepos. Independent configuration is possible but adds orchestration rather
  than demonstrating replacement of Forge intent and policy glue.

Primary sources: [Changesets CLI](https://changesets.dev/guide/cli),
[prereleases](https://changesets.dev/guide/prereleases),
[version and publish](https://changesets.dev/guide/versioning-and-publishing);
[Nx public release API](https://nx.dev/docs/guides/nx-release/programmatic-api),
[version plans](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans),
[dependent policy](https://nx.dev/docs/guides/nx-release/update-dependents);
[release-please manifest](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md),
[customization](https://github.com/googleapis/release-please/blob/main/docs/customizing.md);
[Lerna](https://lerna.js.org/docs/features/version-and-publish),
[Lerna trusted publishing](https://lerna.js.org/docs/recipes/using-oidc-trusted-publishing-with-lerna),
[semantic-release configuration](https://semantic-release.org/usage/configuration/),
[release-it monorepo recipe](https://github.com/release-it/release-it/blob/main/docs/recipes/monorepo.md).
Published npm tarball public declarations/source were also inspected for the three
pinned finalists; documentation-only claims remain distinguished from experiments.

## Maintenance domains and replay

The inventory counts source lines, not labor or historical maintenance savings:
154 release-preparer + 200 eligibility + 144 peer preparer + 203 template preparer
TypeScript lines; 308 release + 232 peer-upgrade + 270 template-sync workflow lines
(1,511 total, including whitespace). Existing related tests are separate.

Version calculation, change-intent collection and changelog writing may be replaced
by candidate metadata tooling. Compatibility-floor/range selection, copied snapshot
policy, trusted identity/file/commit eligibility, validation, App PR creation,
artifact inspection and identity, publication permissions/provenance, registry
verification, retry and downstream handoff remain domain responsibilities unless
specifically demonstrated replaced. New tool configuration, state files, API/plugin
upgrades, GitHub operations and migration of historical versions/tags/changelogs
must count against savings. Fewer script lines alone are not less maintenance.

Replay from the pinned checkout (read-only network commands are temporal):

```sh
npm ci --ignore-scripts --cache /tmp/forge-370/npm-cache --no-audit --no-fund
npx vitest run --config scripts/vitest.config.ts scripts/prepare-package-release.test.ts scripts/select-automatic-release.test.ts scripts/prepare-peer-upgrade.test.ts scripts/prepare-template-sync.test.ts scripts/release-workflows.test.ts
npm run --silent release:prepare -- --package content-model --sha 997bdc43b7106417fd82073ebb97147a181fe223
npm run --silent peer:prepare -- @sveltia/cms --version 0.252.0
gh api repos/rm-industries/forge/environments
gh api repos/rm-industries/forge/environments/npm-release/deployment-branch-policies
gh api repos/rm-industries/forge/environments/npm-release-auto/deployment-branch-policies
gh api repos/rm-industries/forge/branches/main/protection
gh api 'repos/rm-industries/forge/tags?per_page=100'
gh pr list --state open --limit 100 --json number,title,headRefName
npm view @rm-industries/content-model dist-tags --json
```

Observed: five existing test files / **33 tests pass** on Node 26.9.0, macOS arm64.
The actual prepare CLI returns model 1.1.10, latest, exact scoped tag and supplied
commit; peer dry run proposes only model 1.1.11 and tested range extension for CMS
0.252.0. No manifests were mutated. Some existing tests inspect YAML or exported
functions; these are regression evidence, not the equivalent public-fixture
comparison required by #392 or real publication proof. Full quality includes native
compilation and was not needed for this documentation inventory. No production
publication, tag creation, settings changes or parent issue modification occurred.
