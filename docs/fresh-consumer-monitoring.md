# Fresh consumer monitoring

The Fresh consumer workflow checks relevant pull requests using their packed CLI
candidate. Its daily schedule resolves npm `latest` once and downloads that exact
published artifact; it never builds main as a replacement for stable. Both paths
record package name, version, source identity and SHA-512 integrity in
`identity.json`, alongside the selected tarball. Every validation checks that hash
again before installation.

Stable monitoring becomes active when the selected published stable version is at
least 2.0.0. Before publication, scheduled selection explicitly reports `inactive`;
the skipped consumer job is **not** freshness acceptance. Local package versions
cannot activate monitoring. A prerelease on `latest` fails selection. Schedules
may execute before publication to report inactivity; no consumer acceptance is
reported for the old locked release.

Use the manual workflow's `candidate` or `stable` target to rehearse either path.
The same commands work locally, with new, absolute output directories:

```sh
node scripts/fresh-consumer.ts select candidate /tmp/forge-selection /tmp/create-forge.tgz
node scripts/fresh-consumer.ts validate /tmp/forge-selection /tmp/forge-evidence
```

For published selection, replace the first command with:

```sh
node scripts/fresh-consumer.ts select stable /tmp/forge-stable-selection
```

Selection never publishes packages or changes tags. It fails on registry integrity
or artifact identity mismatch rather than choosing another artifact. A failing
selected stable stays a failure even if main contains an unpublished correction.

Validation installs the selected CLI outside the authoring repository, invokes
its public command with normal installation, validates the actual registry lock
and installed package isolation, and records the four model/CMS/formatter package
versions. It checks the full peer graph with `npm ls`, removes consumer dependencies,
replays `npm ci`, and requires byte-identical lock output. It then runs the public
`quality:core` and delivered Chromium CMS formatting suite, including save and
recovery. It does not overlay authoring tests or local packages. Existing authoring
and generated lock-based CI remain separate.

Evidence includes runtime identity, generator identity, command output, selected
versions, lock hash, the resolved consumer lock, and browser failure reports.
Workflow artifacts expire after seven days. Local output retains the consumer and
runner for investigation; remove these scratch directories after collecting evidence.
The selection directory can be shared across independent runtime consumers; each
validation requires its own fresh output directory. Broader weekly coverage can
extend the consumer probe phase while retaining this selection contract.

Rahul is the initial failure triage owner. Enable native GitHub Actions failure
notifications for this repository in Rahul's account, then observe an authorized
hosted failing rehearsal and record the run link and received notification before
release activation is accepted. No notification bot, issue creation, or success
message is added. Notification receipt is an external observation: local tests and
workflow YAML cannot prove delivery. Delivery has not been verified by this change;
account settings and hosted rehearsal remain a release handoff requirement.

`quality:core` is not an audit gate. Monitoring success does not waive required
release audits, protected manual publication, or review of corrective releases.
