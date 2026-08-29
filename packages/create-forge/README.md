# `@rm-industries/create-forge`

The publishable Forge project initializer. Once the generator milestone is
complete, npm will resolve the primary command to this scoped package:

```sh
npm create @rm-industries/forge@next
```

The initializer accepts interactive answers, documented defaults through
`--yes`, or a fully specified set of flags. Run `create-forge --help` for the
complete input contract. Dependency installation, Git initialization, and
completion output are implemented in separate roadmap tasks before publication.

The selected template is copied with dotfiles and file modes intact. Forge
customizes only reviewed metadata files and refuses parent-traversal paths,
symbolic-link collisions, filesystem roots, and unconfirmed non-empty
destinations. If copying or customization fails, files created by that
invocation are removed and overwritten files are restored from temporary
backups. The error includes recovery guidance if automatic rollback is
incomplete.

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
