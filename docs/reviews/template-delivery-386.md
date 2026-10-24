# Fresh dependency delivery experiment (#386)

## Result and scope

The packed CLI can generate a working project without a bundled template lockfile.
On 2026-10-23, fresh registry resolution and a subsequent clean `npm ci` both passed
`quality:core`: formatting, code/CSS/Markdown lint, spelling, unused dependencies,
Astro type checking, 39 unit tests across 12 files with coverage, production build,
and seven required build-output checks. This is evidence for the dependency
mechanism, not approval to change delivery policy. Security auditing still fails,
and broader platform/browser evidence remains incomplete.

The baseline is [#385](template-baseline-385.md), at integration commit
`4162bb044f24c1d7299eb83d68cfe9daf28ed265`. Production source, shipped lockfiles,
release behavior, generated consumer obligations, and validation schedules remain
unchanged by this evidence-only commit.

## Red, prototype, green

The confirmed seam is the packed CLI installed outside the repository/workspaces,
its generated project's public commands, and emitted provider configuration.
Removing only `dist/template/package-lock.json` from the installed baseline CLI
failed during materialization: `ENOENT ... package-lock.json`; its changes rolled
back. This establishes that omission alone does not work.

The isolated prototype below deliberately changes template delivery to lockless
rather than adding an optional missing-lock fallback. It excludes that one file
when packaging, tokenizes only package metadata, and stops reading/writing the
nonexistent lock during ordinary materialization. Other repository/consumer locks
are retained. The existing `npm install` setup command needs no change: it resolves
the delivered ranges and writes the consumer lock. Cloudflare retains its existing
`npm install --package-lock-only` preflight, including with `--no-install`.

```diff
diff --git a/packages/create-forge/scripts/copy-template.ts b/packages/create-forge/scripts/copy-template.ts
index 69369c9..80acd26 100644
--- a/packages/create-forge/scripts/copy-template.ts
+++ b/packages/create-forge/scripts/copy-template.ts
@@ -14,6 +14,7 @@ const excludedNames = new Set([
   'coverage',
   'dist',
   'node_modules',
+  'package-lock.json',
   'playwright-report',
   'test-results',
 ]);
@@ -26,7 +27,7 @@ await cp(sourceDirectory, destinationDirectory, {
 });
 await rename(join(destinationDirectory, '.gitignore'), join(destinationDirectory, '.gitignore.template'));

-for (const filename of ['package.json', 'package-lock.json']) {
+for (const filename of ['package.json']) {
   const path = join(destinationDirectory, filename);
   const metadata = JSON.parse(await readFile(path, 'utf8')) as {
     name?: string;
diff --git a/packages/create-forge/src/materialize.ts b/packages/create-forge/src/materialize.ts
index ea7bdcd..858d6a4 100644
--- a/packages/create-forge/src/materialize.ts
+++ b/packages/create-forge/src/materialize.ts
@@ -155,26 +155,13 @@ const customizeTemplate = async (
   const projectDirectory = relativeProjectDirectory.split(sep).join('/') || '.';
   const dependabotDirectory = projectDirectory === '.' ? '/' : `/${projectDirectory}`;
   const packagePath = join(projectRoot, 'package.json');
-  const packageLockPath = join(projectRoot, 'package-lock.json');
   const packageMetadata = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, unknown>;
-  const packageLock = JSON.parse(await readFile(packageLockPath, 'utf8')) as {
-    name?: string;
-    packages?: Record<string, Record<string, unknown>>;
-  };
-  if (
-    packageMetadata.name !== templateTokens.packageName ||
-    packageLock.name !== templateTokens.packageName ||
-    packageLock.packages?.['']?.name !== templateTokens.packageName
-  ) {
+  if (packageMetadata.name !== templateTokens.packageName) {
     throw new Error('Packaged template contains unexpected package metadata tokens.');
   }
   packageMetadata.name = options.packageName;
   packageMetadata.version = '0.0.0';
   packageMetadata.private = true;
-  packageLock.name = options.packageName;
-  if (!packageLock.packages?.['']) throw new Error('Packaged template lockfile is missing its root package metadata.');
-  packageLock.packages[''].name = options.packageName;
-  packageLock.packages[''].version = '0.0.0';
   if (cloudflareVersion) {
     // Deployment invokes the locked executable by path, outside Knip's module graph.
     const knip = (packageMetadata.knip ?? {}) as { ignoreDependencies?: string[] };
@@ -188,7 +175,6 @@ const customizeTemplate = async (
     };
   }
   await writeFile(packagePath, `${JSON.stringify(packageMetadata, undefined, 2)}\n`);
-  await writeFile(packageLockPath, `${JSON.stringify(packageLock, undefined, 2)}\n`);

   const siteConfigPath = join(projectRoot, 'src', 'config', 'site.ts');
   let siteConfig = await readFile(siteConfigPath, 'utf8');
```

The prototype was built with the existing generator build command and packed using
`npm pack --ignore-scripts`. Its source changes were restored before this commit;
the diff above is the complete replayable candidate. Running production generator
tests without revisiting locked-delivery assertions is not claimed: existing packed
verification and no-install scenario assertions intentionally require a bundled
lockfile today.

## Executed consumer evidence

Environment: macOS arm64, Node **26.9.0**, npm **11.19.1**. Candidate package:
`@rm-industries/create-forge@1.2.0`, built from the integration baseline with only
the experimental diff above. Both the CLI runner and generated projects live under
`/tmp/forge-369`, outside all repository workspace roots. No candidate content-model
or other local package was overlaid into the generated project.

| Scenario                                      | Evidence                                                                                                                                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub/default deployment, fresh install      | Packed CLI installed and invoked with `--yes --no-git`; automatic ordinary npm installation succeeded and created the lock; `quality:core` passed.                                                                                  |
| Independent locked reinstall                  | Deleted that consumer's entire `node_modules`, ran `npm ci --no-audit --no-fund`, then the same `quality:core`; all passed. Lock SHA-256 remained identical.                                                                        |
| GitLab only, no install                       | `--ci-providers gitlab --no-install --no-git` generated ordinary files and CI successfully; no package lock or dependencies were installed.                                                                                         |
| Nested, dual provider, Cloudflare, no install | `--repository-root` at the parent and site in `site/`, `--ci-providers github,gitlab`, explicit Cloudflare production deployment; package-lock-only resolution succeeded, wrote the consumer lock, and installed no `node_modules`. |
| Provider/manifest contracts                   | Parsed the default GitHub, standalone GitLab, nested GitHub, and nested GitLab YAML; all referenced `npm run` scripts exist in the delivered manifest. Dependabot includes npm and GitHub Actions for all three repositories.       |
| Registry isolation                            | 1,111 lock package records; zero workspace links, file dependencies, or maintainer absolute-path resolutions. Installed content-model is a real registry package directory, not a symlink.                                          |
| Ranges and pins                               | All delivered dependency/devDependency values exactly matched the baseline; 174 common lock package entries resolved different versions.                                                                                            |
| Repeatability                                 | Consumer lock SHA-256: `d9c5b75bb3af518510f0eaf0e8010bcc80d26e56d4a90e6eab65cd81a2c235bd`, unchanged after clean `npm ci`.                                                                                                          |

Cloudflare `--no-install` retains its existing network requirement. Other no-install
output now lacks a lock and needs `npm install` before generated CI can use `npm ci`;
committing only the uninstalled output would fail CI. This is a deliberate rollout
and documentation question, not a silent migration included in this experiment.
Normal generation adds no build/test execution or new authoring dependency.

The evaluated public commands cover the project's local static/test/build contract.
Provider evidence is **local parsing and command correspondence**, not a hosted
GitHub/GitLab pipeline or deployment. Root-site CI commands are exercised through
`quality:core`; browser/Lighthouse commands and deployment-specific commands were
not executed. The nested Cloudflare case validates materialization and dependency
resolution, not its full checks or deployment.

## Pins, security, CMS, and ownership

Preserved the exact `@rm-industries/content-model: 1.1.8`, `@sveltia/cms: 0.236.0`,
`@lhci/cli: 0.15.1`, audit-ci, and Markdown CLI pins; preserved every other range.
A successful fresh install does not justify widening these independently versioned
integration/security constraints. Astro's existing caret range resolved normally.
The generated model-dependent unit/build contract passed; interactive CMS save,
content round-trip/preservation, and browser behavior are not established by it.

`npm run audit` was executed separately and **failed**. Baseline reports three
unallowlisted high advisories, including `GHSA-27r3-jxmh-p828` (body-parser);
the candidate reports two: `GHSA-c475-qrg2-pj4r` and `GHSA-mrhx-c7xc-m3w5`, through
the existing Lighthouse CI dependency tree. Fresh resolution eliminates the
body-parser finding but does not yield a clean security gate. No audit policy or
allowlist was weakened; `--no-audit` on reinstall only suppresses npm's informational
install audit, not the independently executed project security command.

Generated projects retain editable source/configuration and static provider YAML,
with no Projen package/configuration/regeneration scripts. Dependabot remains
ordinary consumer configuration; its hosted update behavior was not executed.

## Reproduction and evidence

Apply the candidate diff in a disposable checkout of the baseline, leaving the
source template lock intact, then use existing package commands:

```sh
npm run build --workspace @rm-industries/create-forge
npm pack --workspace @rm-industries/create-forge --ignore-scripts --pack-destination /tmp/candidate
npm install --prefix /tmp/candidate-runner /tmp/candidate/rm-industries-create-forge-1.2.0.tgz
/tmp/candidate-runner/node_modules/.bin/create-forge /tmp/candidate-site --yes --no-git
cd /tmp/candidate-site
npm run quality:core
npm run audit
# In that disposable consumer only, remove node_modules, then:
npm ci --no-audit --no-fund
npm run quality:core
```

Use a writable npm cache where required; the recorded run used
`npm_config_cache=/tmp/forge-369/npm-cache`. Fresh resolution depends on execution
date/registry state, while repetition must preserve the consumer lock. Scratch logs
are local evidence, not retained project dependencies:
`delivery-red.log`, `delivery-build.log`, `delivery-pack.log`,
`delivery-cli-install.log`, `delivery-bootstrap.log`, `delivery-quality.log`,
`delivery-repeat-ci.log`, `delivery-repeat-quality.log`, `delivery-audit.log`,
`delivery-resolution.json`, and `delivery-provider-validation.json` under
`/tmp/forge-369`. The candidate tarball is under that directory's `candidate/` and
its independently installed executable under `candidate-runner/node_modules/.bin/`.

## Remaining decision evidence

Keep baseline delivery pending #387 failure/recovery and #389 operating decisions.
This bounded experiment does not establish supported Node 22/24 compatibility,
Linux/Windows behavior, interactive CMS preservation, browser accessibility/E2E,
Lighthouse, hosted provider execution, or security-clean bootstrap. Broader tests
can reuse the candidate artifact and existing suites; none is inferred from the
successful Node 26 local run. Published older generators would retain their bundled
ranges after any future corrective release.
