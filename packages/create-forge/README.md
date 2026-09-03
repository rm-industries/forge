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

This generates default, fully specified, scoped-package-name, current-directory,
no-install, and conflict fixtures in an OS temporary directory. The default
fixture installs and runs the complete generated-project quality pipeline
outside the Forge workspace. The conflict fixture also proves that a failed
invocation leaves existing files unchanged. Every fixture is removed after the
run.

The release compatibility matrix runs the same packed fixtures with the
generated project's core quality gate on every supported Node line on Ubuntu
and on macOS. The complete end-to-end job adds the multi-browser and Lighthouse
checks once on the primary Node runtime.
