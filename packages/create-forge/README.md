# `@rm-industries/create-forge`

The publishable Forge project initializer. Once the generator milestone is
complete, npm will resolve the primary command to this scoped package:

```sh
npm create @rm-industries/forge@next
```

The current alpha scaffold exposes package help and version information and
ships the tested default template. Prompts, safe materialization, dependency
installation, Git initialization, and completion output are implemented in
separate roadmap tasks before publication.

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
