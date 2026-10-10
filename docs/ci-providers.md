# Generated project CI

Forge uses Zuke targets to define work and its dependencies in TypeScript. The
same targets run locally and generate hosted validation jobs. Zuke writes the
YAML; Forge does not rewrite the generated job definitions.

The root graph in `scripts/ci/forge.ts` checks Forge and its packages, including
content-model. The site graph in `templates/default/scripts/ci/site.ts` checks
an instantiated website. Shared helpers live with the template so generated
projects receive everything needed to maintain their own CI. The website uses
that same site graph with its own directory and workflow prefix.

The template stores the TypeScript authoring files. `create-forge` configures
them and asks Zuke to write validation workflows during bootstrap. Generated
projects commit their resulting YAML, as Forge does for its root and website
workflows. This makes workflows reviewable and available to Dependabot.

## Installation and local execution

`npm ci` installs the Deno runtime through npm. No global runtime installation
or workstation setup step is required. Zuke uses `jsr:@zuke/core@^1.70.1` through
`imports.json`; its exact version and integrity are recorded in `deno.lock`.
The first invocation may download dependencies into Deno's cache. Native Deno
checks the authoring TypeScript, with the lock enforced using `--frozen`.

```sh
npm run pipeline                         # repository quality checks
npm run pipeline -- --list               # available targets
npm run pipeline -- quality --dry-run    # inspect dependencies
npm run pipeline -- project              # full repository checks
npm run pipeline --prefix website -- typecheck
npm run ci:generate                      # write root workflows
npm run ci:generate --prefix website     # write website workflows
npm run ci:check                         # check both for drift
```

Generated projects have the same `pipeline`, `ci:generate`, and `ci:check`
commands. Existing individual npm scripts remain available. Local runs use the
current Node version; they do not reproduce hosted runner images or matrices.
Site quality includes browser tests and Lighthouse, and installs their browser
dependencies. Running those targets may require operating system permissions.
Execution records under `.zuke/` are ignored.

Hosted jobs invoke these targets by name. Zuke derives job dependencies from
target references. Each isolated runner executes the target's prerequisites too;
this migration prioritizes sharing the work definition over minimizing repeated
execution. All checks run on every change. Supported Node and OS matrices are
Cartesian products; there are no change-classification or matrix-include jobs.

## Paths and existing repositories

A nested project derives its workflow prefix from its relative directory:
`website` generates `website-project.yml`, `website-security.yml`, and
`website-automation.yml`. `apps/docs` derives `apps-docs`. Use `--ci-prefix`
to override it. Standalone projects keep unprefixed names. Prefixes allow
lowercase letters, numbers, and separating hyphens, up to 80 characters.
Workflow concurrency groups include the workflow path, isolating namespaces.

Existing workflow collisions require confirmation. Existing shared repository
files, including Dependabot configuration, are preserved, and completion reports
which Forge configuration was skipped. Review that report and integrate any
needed update rules into the repository's existing configuration.

`scripts/ci/config.json` controls the project directory, repository root, prefix,
providers, primary provider, and schedule minutes. GitHub is the bootstrap
default. The site graph can also emit GitLab validation with Zuke by enabling
`gitlab` in `providers`. GitLab requires a Linux runner supporting the Node
container and browser dependency installation. GitHub action-based security and
automation jobs do not have GitLab equivalents. The GitLab graph does not add
schedule or duplicate-pipeline suppression rules. Primary is configuration
metadata; it does not move deployment between providers.

## Deployment exception

Zuke 1.70.1 cannot emit GitHub Pages job environments or job outputs. Forge
therefore retains an editable `deployment.yml` template alongside the TypeScript
validation graph. Consumers can customize it after bootstrap. It waits for a
successful main-branch push validation run from the same repository, downloads
that run's site artifact, deploys to the `github-pages` environment, and passes
the Pages URL to the smoke target. Pull request validation cannot trigger Pages.
Nested projects namespace this workflow too.

Provider interfaces and generated-file checks do not prove provider semantics.
Review deployment edits and use provider linting and hosted execution for
features beyond the graph supported here.

## Action pins and Dependabot

`createCiPinResolver` in `templates/default/scripts/ci/pins.ts` reads parsed YAML
`uses` nodes and preserves full commit SHAs and version comments. It rejects
mutable action references, malformed YAML, duplicate keys, and conflicting SHAs
or version comments. Self-repository (`$/`), workspace-relative (`./`), and
Docker references do not enter the external pin map.

Each project's committed project, security, automation, and deployment workflows
are the pin source. `scripts/ci/pins.json` provides initial defaults for actions
not present in those files. Forge and its instantiated website maintain their
pins independently. There is no second hard-coded action reference in the graph:
steps request their action from the resolver.

Dependabot scans committed GitHub workflows as usual. A SHA or version-comment
update is read on the next generation, so `ci:check` accepts an otherwise
unchanged, consistent update without reverting it to the initial default. When
occurrences disagree, update them to the intended reference together; the
resolver does not guess which SHA is newer. If generation changes other output,
regenerate and commit it in the same pull request. No bot pushes or merges
updates automatically.

Pin synchronization does not prove compatibility or safety of a new action
release. Hosted checks exercise the updated actions; changes to unexercised
paths still require review. npm updates Deno through the package lock. Zuke's
JSR import and Deno lock must be updated together; npm Dependabot does not update
that native JSR dependency.
