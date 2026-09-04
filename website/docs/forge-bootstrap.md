# Forge project website bootstrap record

The Forge project website was generated on 2026-09-03 from the public npm
registry with this non-interactive command:

```sh
npm create @rm-industries/forge@1.0.0 -- website \
  --name @rm-industries/forge-website \
  --site-name Forge \
  --description "Forge creates accessible, content-driven Astro websites with a shared content model and Sveltia CMS integration" \
  --author "RM Industries" \
  --url https://rm-industries.github.io/forge/ \
  --repository rm-industries/forge \
  --install \
  --no-git
```

| Evidence                   | Value                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Generator package          | `@rm-industries/create-forge`                                                                     |
| Generator version          | `1.0.0`                                                                                           |
| npm distribution integrity | `sha512-vUM2Dd7s4XPmHVhlUFUVjNLaovjS59DKuW0yI3xwIDhgrWl3Yay30WoppoxR9J18KL1AiQtBMJZm/4yWZGmgJw==` |
| Registry tarball           | `https://registry.npmjs.org/@rm-industries/create-forge/-/create-forge-1.0.0.tgz`                 |
| Canonical URL              | `https://rm-industries.github.io/forge/`                                                          |
| Production base            | `/forge/`                                                                                         |
| Local development base     | `/`                                                                                               |

The committed `package-lock.json` records the resolved application dependency
versions and integrity values separately from this generator provenance.

## Generated-file disposition

Application source, public SVG assets, package metadata, the lockfile,
documentation, and project-local tool configuration were retained. Site
identity, repository metadata, and the project-path deployment configuration
were adapted for Forge and RM Industries.

The generator was run with `--no-git`, so no nested Git repository was created.
The generated `.github/` directory was removed: GitHub discovers workflows and
Dependabot configuration only from the repository root, where this monorepo
will integrate the equivalent website validation, security, dependency, and
deployment behavior. Generated caches, installed dependencies, browser
binaries, reports, and build output remain ignored and are not committed.

## Maintenance and upgrades

This directory is owned website source, not a generated cache. Do not rerun the
generator over it. Normal npm dependency updates, including compatible
`@rm-industries/content-model` releases, update this project's manifest and
lockfile through reviewed pull requests. Future Forge template improvements are
adopted selectively through a dedicated migration issue and pull request so
local content and configuration cannot be overwritten.

The complete ownership, publishing, and dependency lifecycle is defined in
[ADR 0007](../../docs/decisions/0007-project-website.md).
