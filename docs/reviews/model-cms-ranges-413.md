# Model/CMS range validation (#413)

The delivered template declares content-model `^1.1.10` and Sveltia CMS
`>=0.251.0 <1.0.0`. Its authoring lock retains the tested resolved versions.
Formatter declarations and reusable package peer requirements are unchanged in
this slice. The initial floors require a separately reviewed, tested change.

These ranges permit fresh installation; they do not promise every future release
works. The selected model package still owns its tested CMS and Astro peers.
Optional peers constrain hosts explicitly installed by the consumer. npm may reject
a newer permitted model instead of backtracking to an older compatible model.
Successful resolution therefore complements behavioral checks rather than replacing them.

A reviewed corrective generator can temporarily pin a known-working pair for new
projects. It cannot repair metadata in an older published generator or change an
existing project's source or lock. No forced installation, legacy peer mode,
authoring package overlay, package publication, or dist-tag change was used here.

## Local evidence (2026-10-25)

Scratch logs and consumer locks are retained under `/tmp/forge413` for this run.
The actual packed CLI was installed under its `runner` directory and generated
fresh `consumer` and `final-consumer` directories outside the authoring workspace.
Both freshly installed real published content-model 1.1.10 and CMS 0.251.0.
Their lock entries contain registry tarball URLs and integrity digests; installed
package directories resolve inside the consumer and are not symlinks.

- `ranges-red.log` records the installed packed CLI rejecting the old exact
  declarations; `ranges-green.log` records the approved declarations passing.
- `isolation-red.log` and `isolation-green.log` prove a registry manifest cannot
  conceal a linked local model in its lock. `model-peer-red.log` and
  `model-peer-green.log` prove the installed Astro host must satisfy model peers.
- `clean-authoring-red.log` reproduces the missing authoring `semver` dependency
  with no authoring `node_modules`. A clean locked authoring installation fixes
  the validator (`clean-authoring-install.log`, `clean-authoring-green.log`).
  Template CI now installs its declared authoring tools before separately
  installing and validating the isolated template, in GitHub and stored GitLab CI.
- `peer*.log` covers eight controlled registry cases on Node 22.22.2, 24.22.1 and
  26.9.0 with npm 10.9.4 and 11.19.1, with strict peer mode both enabled and
  disabled. Cases cover overlapping/disjoint peers, absent/explicit optional
  peers and the no-backtracking failure. Synthetic packed generator correction
  detects metadata loss in a permitted model release through a public consumer
  save assertion and restores nested metadata and body with a corrected pin.
  This synthetic assertion is separate from real CMS evidence.
- `published-model-contract.log` checks the real published model/Sveltia adapter's
  required title, draft default, field order and rich-text body. Both consumer
  `quality:core` runs pass (40 tests, full coverage, static checks and build).
  Public consumer unit commands also pass on Node 22/npm 10 and Node 24/npm 11.
- `cms-chromium.log` records all 12 real production CMS/formatter cases passing,
  including metadata, raw/rich body edits, second saves and failure/retry paths.
  `final-cms-chromium.log` records all 12 cases passing again with the delivered
  nested unknown-frontmatter assertion, including retry and repeated saves.
- `installed-cli-e2e-bounded.log` passes all 13 isolated installed-generator
  fixtures, real installation/replay, consumer core quality and build validation.
  Registry waits were bounded with a 30-second fetch timeout and no retries.
  An earlier unbounded attempt was stopped during a slow installation; the
  bounded rerun did not reproduce a failure, so its network/cache cause remains
  unproven and no production workaround was added.
- After merging formatter ranges from integration `982364f`,
  `merged-root-tests.log` passes 55 tests, `merged-peer-tests.log` passes all 15
  model/formatter registry cases, and packed-package verification, root types
  and focused lint pass. Both pairs and both CMS assertions were preserved.
- `consumer-ci-replay.log` records a clean `npm ci` replay. The consumer lock is
  byte-identical before and after, SHA-256
  `18053a7b59d949cbb56bafd967e0781c1e0a87fcf4341d2f551d461f6618fc6c`.

These are local candidate checks, not publication acceptance. Hosted Linux/macOS,
full browser/Lighthouse coverage, native tooling and required audit disposition
remain part of the combined release validation.
