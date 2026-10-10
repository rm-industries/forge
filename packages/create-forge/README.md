# `@rm-industries/create-forge`

The stable Forge project initializer. npm resolves the primary command to this
scoped package:

```sh
npm create @rm-industries/forge
```

The initializer accepts interactive answers, documented defaults through
`--yes`, or a fully specified set of flags. Run `create-forge --help` for the
complete input contract. Unless disabled with `--no-install` or `--no-git`, it
runs `npm install` and initializes a `main`-branch Git repository after files are
created. It never stages files, reads Git identity, or creates a commit.

By default, the destination is both the generated project root and repository
root. To add a Forge site to an existing repository without replacing unrelated
files, pass the site directory as the destination and identify the repository
root separately:

```sh
npm create @rm-industries/forge website -- --repository-root .
```

Forge writes the application into `website/`, places repository-owned GitHub
configuration in the root `.github/` directory, installs dependencies inside
`website/`, and initializes Git at the repository root when needed. Generated
workflow execution paths, artifact paths, and Dependabot settings
are adjusted for the nested project automatically. Workflow files are named
`website-project.yml`, `website-security.yml`, and `website-automation.yml`, plus editable `website-deployment.yml`, for
this example, leaving existing unprefixed workflows untouched. Override the
prefix with `--ci-prefix docs-site`. Prefixes contain lowercase letters, numbers,
and single hyphens, with a maximum length of 80 characters. A standalone project
keeps the unprefixed workflow names unless a prefix is explicitly provided.
Existing shared configuration, such as Dependabot settings, is preserved. Forge
reports the configuration it skipped so you can integrate it manually.

The selected template is copied with dotfiles and file modes intact. Forge
customizes only reviewed metadata files and refuses parent-traversal paths,
symbolic-link collisions, filesystem roots, and unconfirmed non-empty
destinations. If copying or customization fails, files created by that
invocation are removed and overwritten files are restored from temporary
backups. The error includes recovery guidance if automatic rollback is
incomplete.

Installation and Git commands inherit the terminal so their progress and errors
remain visible. A failed or interrupted command exits non-zero and leaves the
generated project in place with instructions to inspect and retry it.

After successful creation, Forge reports the created path, whether dependency
and Git setup ran or was skipped, and only the commands still needed to start
development. Output remains readable when color is disabled and contains no
telemetry or promotional messages.

## CI and local work

Generated projects receive a TypeScript Zuke graph and its generated validation
workflows. `npm ci` installs the runtime through npm; no separate workstation
setup is needed. Run `npm run pipeline -- --list` to inspect targets, or
`npm run pipeline -- quality` for the site checks. `npm run ci:generate` writes
validation YAML, and `npm run ci:check` detects drift. Commit that output so
Dependabot can update action pins. Deployment stays editable YAML because Zuke
cannot yet model the required Pages environments and outputs.

See [the CI documentation](../../docs/ci-providers.md) for graph ownership,
pin resolution, provider support, and execution limitations.

## Package verification

From the Forge repository root, build and inspect every workspace package:

```sh
npm run quality
```

To build this package, create its actual tarball, install it into an isolated OS
temporary directory, and exercise the installed executable:

```sh
npm run verify:package --workspace @rm-industries/create-forge
```

The verification confirms `--help`, `--version`, and packaged template assets,
then removes the temporary fixture.

To exercise the packed CLI across the complete generator fixture matrix:

```sh
npm run test:generator:e2e
```

This generates default, fully specified, scoped-package-name,
current-directory, nested-project, no-install, and conflict fixtures in an OS
temporary directory. The default and nested fixtures install dependencies
outside the Forge workspace. The nested fixture also runs the generated
project's core quality and production-build pipeline, verifies its Pages
artifact location, and checks its repository-level CI and Dependabot paths. The
conflict fixture proves that a failed invocation leaves existing files
unchanged. Every fixture is removed after the run.

The release compatibility matrix runs the same packed fixtures with the
generated project's core quality gate on every supported Node line on Ubuntu
and on macOS. The complete end-to-end job adds the multi-browser and Lighthouse
checks once on the primary Node runtime.
