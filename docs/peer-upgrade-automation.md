# Peer upgrade automation

Forge treats integration peer ranges as tested compatibility claims. The
`Peer Compatibility Updates` workflow checks the npm registry weekly and can be
dispatched manually for an exact package version. When a version falls outside
the current content-model peer range, it prepares one focused pull request that
updates the root test dependency, bounded peer range, lockfile, and next
content-model prerelease version and changelog entry.

The workflow never updates the standalone template or publishes a package. A
merged compatibility pull request proceeds through the protected publication
tracked by issue #33. The post-publication synchronization tracked by issue #95
then updates the template using the public registry artifact.

## GitHub App setup

Create and install a repository-scoped GitHub App with only these repository
permissions:

- Contents: read and write.
- Pull requests: read and write.
- Metadata: read, granted automatically by GitHub.

Store its client ID in the `PEER_UPGRADE_APP_CLIENT_ID` repository variable and
its private key in the `PEER_UPGRADE_APP_PRIVATE_KEY` Actions secret. The
workflow requests only Contents and Pull requests access when it creates its
short-lived installation token. The token is revoked when the job ends. Do not
substitute a personal access token or expose either value to pull-request code.

The workflow uses an exact Node.js release whose bundled npm version matches the
root `packageManager` field, and verifies that match before regenerating the
lockfile. This avoids both ad-hoc package-manager installation and unrelated
lockfile normalization. Compatibility CI still tests every supported Node.js
line without writing to the lockfile.

Pull requests created with the App token trigger the repository's normal checks.
Branch protection and human review remain responsible for deciding whether the
tested peer range should become a published compatibility claim.

## Local and manual operation

Inspect a proposed version without changing files:

```sh
npm run peer:prepare -- @sveltia/cms --version 0.197.1
```

Add `--write` to update the two manifests, then regenerate the root lockfile:

```sh
npm run peer:prepare -- @sveltia/cms --version 0.197.1 --write
npm install --package-lock-only --ignore-scripts
```

The local command requires an exact `--version` and performs no network access.
When a manual workflow dispatch leaves its version empty, the workflow resolves
the package's current npm `latest` tag before passing that exact version to the
file-writing command. The command returns structured JSON and makes no changes
when the supplied version already satisfies the peer range.

Each run writes a job summary containing the proposed development range, peer
range, content-model version, validation status, and resulting pull-request
link. Action annotations call out registry failures, validation failures,
missing GitHub App configuration, and no-op compatible releases.

## Recovery

The workflow maintains one `automation/peer-*` branch and open pull request per
peer. Re-running it updates that branch rather than creating a competing PR. If
registry lookup or validation fails, no token is created and nothing is pushed.
If branch or pull-request creation fails after validation, rerun the workflow;
the same deterministic branch is reused.

Close an update pull request when upstream behavior is incompatible, and record
the rejected version and reason in the pull request. The current peer range then
remains authoritative. Never widen the range merely to make dependency
installation succeed.
