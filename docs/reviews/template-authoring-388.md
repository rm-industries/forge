# Internal template authoring trial (#388)

<!-- cspell:ignore projen Projen outdir projenrc JsonFile YamlFile readonly editGitignore -->

The representative trial preserves the bootstrap contract, but does not remove maintenance. Retain
static templates plus the existing typed CI writers. This is evidence for the separate authoring
recommendation in #390, independent of the dependency-delivery experiment. No production files,
dependencies, scripts, lockfiles, CI configuration or consumer repositories were changed.

## Scope and controls

Trial date: October 23, 2026. Baseline code: `0b97262970061e2e8305c7c0c790bd0cce64dfb5`;
[locked bootstrap evidence](template-baseline-385.md). Authoring engine: **Projen 0.104.14**, pinned
exactly in scratch, with npm 11.19.1 and Node 26.9.0 on macOS arm64. The four-file slice is:

- `package.json`: existing scripts, engines, curated ranges and exact pins;
- `tsconfig.json`: Astro strict configuration and existing include/exclude paths;
- `.github/dependabot.yml`: npm and action updates, cooldowns, limits, groups and labels;
- `.github/workflows/project.yml`: the actual default root GitHub project workflow, including jobs,
  permissions, artifacts, deployment guards and the generated project's commands.

The baseline is already mixed authoring: three static/copied configuration files and a typed,
parameterized workflow writer. The candidate uses Projen's generic JSON/YAML components; it does not
pretend that copying an existing workflow object is a replacement for its provider model.

The candidate is **default-scenario only**: root project, Node 26, GitHub defaults, package name
`locked-site`, site name `Locked Site`. Its workflow input is the actual baseline generated workflow
for those inputs. It is a fixed experiment fixture, not a general provider implementation. GitLab,
nested layouts, changed deployment inputs and other Node versions were not candidate runs.

## Executed experiment

1. Installed the baseline packed CLI outside the checkout and generated the baseline fixture.
2. Synthesized the four files through pinned Projen into scratch. Marker suppression and writable
   output were explicit. Exported only the three template files; auxiliary Projen files stayed outside
   the packed CLI and generated project.
3. Copied the baseline packed package into scratch and replaced those three bundled template files.
   Embedded the synthesized workflow as a plain string through a temporary default-only adapter in
   the scratch bundle's existing `writeCi`, immediately before its normal formatting, schema checks
   and writing. This makes the canonical workflow actually consumed, with no duplicate workflow and
   no runtime Projen dependency. Other existing provider generation and all materialization protections
   remained in place; none of their code was credited as removed.
4. Packed that candidate with `npm pack --ignore-scripts`, installed the tarball into a separate runner,
   and invoked the installed CLI into a separate generated project. The first bootstrap used `--install`.
   Generated files were validated through the existing CLI writer's schema and formatting boundary.
5. The first `npm run quality:core` correctly failed on formatting of Projen's TypeScript JSON and
   Dependabot YAML output. Added the **existing Oxfmt configuration** to the internal export stage,
   repacked/reinstalled, generated again with `--no-install`, then ran a real clean `npm ci` in the
   generated project. No dependency or lockfile policy changed to make this pass.
6. Ran `npm run quality:core` successfully. Edited all four consumer files, ran `npm run format:fix`,
   a new consumer-owned package script, and the complete `npm run quality:core` again. All edits
   survived. No synthesis or Forge command ran as consumer maintenance.

All project commands ran against registry-installed dependencies in the generated directory, without
workspace links, a repository `node_modules` symlink or overlaid local content-model packages. The
baseline template lockfile was preserved. The final clean install reported 965 packages.

| Check                                                               | Actual result                                                                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Four synthesized outputs compared as parsed JSON/YAML with baseline | Equal before consumer customization                                                                                                 |
| Two syntheses in the same stage, two in fresh stages                | Identical bytes for each exported raw file                                                                                          |
| Canonical consumed workflow                                         | Existing schema validation passed; parsed jobs, permissions, commands and artifact configuration equal to baseline                  |
| Consumer files and obligations                                      | All four writable, mode `0644`; only the normal three workflows; no `.projen`, config, dependency, task or regeneration requirement |
| Clean installation after no-install generation                      | `npm ci` passed with ordinary registry dependencies and consumer lockfile                                                           |
| Initial raw Projen output                                           | `quality:core` failed at formatting, as expected from the output differences                                                        |
| Normalized candidate                                                | Format, lint, unused dependencies, Astro checks, 39 tests with coverage, build and output validation passed                         |
| Customized candidate                                                | Same full `quality:core` passed; custom package script ran; all four custom edits survived                                          |
| Existing audit command                                              | Failed on the same three high-severity baseline advisories; audit policy was retained                                               |

The audit advisories are `GHSA-27r3-jxmh-p828`, `GHSA-c475-qrg2-pj4r` and
`GHSA-mrhx-c7xc-m3w5`; this trial neither fixes nor bypasses them. `quality:core` does not itself run
the separate audit command. No claim of a green security audit follows from the quality result.

### Output differences and ownership

Raw generic synthesis preserves parsed values but changes YAML spacing, quoting, document markers and
JSON array layout. Existing Oxfmt normalization is still needed to meet the delivered formatter's
contract. Generic YAML serialization also drops comments: the baseline workflow ownership guidance
and inline action-version annotations are absent in the candidate. Action SHA pins, job permissions,
artifact paths and executable commands remain semantically identical. Reintroducing useful comments
would require another authoring/annotation step; it is not counted as a simplification.

A bare Projen project also synthesizes `.gitignore`, `.gitattributes` and `.projen` metadata. Direct
synthesis into a consumer tree would violate this experiment's ownership boundary. The allowlist
export is therefore necessary, not evidence that Projen's default project output is consumer-ready.
Consumers received ordinary editable files and retained their own scripts, TypeScript option and YAML
comments after ordinary formatter/check/build commands. The trial did not introduce an eject command.

Raw synthesis SHA-256 values (before the existing formatter or token materialization):

| Export                  | SHA-256                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Manifest                | `047eb6aa9737ae166b722fc97733578f953d715a478086886f6bd65c2f5ef35f` |
| TypeScript config       | `1b376ccaa7d9d39fa4c1d4fac3d2ac62645c645ee8710b2edf503def165efc88` |
| Dependabot              | `95a636467b69b7c67c94e12123ce1350e0643b80922caf82d21b1b5b6226b247` |
| Representative workflow | `ab06866afb8a9e1414c135b5dca8ce3603eb80386e4f33de4ce0c73f37fb81ec` |

Baseline packed CLI SHA-256: `12e404b1ea4ba06e6c1d9a0b88913023dd407d36666d111482219d5a8cafa86f`.
Candidate scratch pack SHA-256: `18d9e859e2bba8da449a3fde5c72cfba78e29f61a669475e607b34f395fe06cd`.
These identify the measured artifacts; a later repack may differ in packaging metadata. Synthesis
repeatability is separate from registry resolution over time.

## Reproduce the representative authoring slice

First reproduce the baseline installed-CLI fixture as documented in #385. Keep a pristine copy of its
installed packed package, its bundled template, and its generated `project.yml`. Install exactly
`projen@0.104.14` in an unrelated scratch authoring directory with `--ignore-scripts`; the experiment
uses its bundled YAML parser. Make `input/` contain the three pristine **bundled/tokenized** template
files and `.github/workflows/project.yml` from the baseline generated project. The manifest and
Dependabot tokens must remain bundled tokens until the existing CLI materializes them.

Run the following from scratch as `node author.cjs INPUT STAGE`; paths are supplied explicitly so no
consumer or checkout is a synthesis destination:

```js
const fs = require('node:fs');
const path = require('node:path');
const { Project, JsonFile, YamlFile } = require('projen');
const yaml = require('projen/node_modules/yaml');
const input = path.resolve(process.argv[2]);
const project = new Project({
  name: 'forge-authoring-evaluation',
  outdir: path.resolve(process.argv[3]),
  projenrcJson: false,
});
for (const file of ['package.json', 'tsconfig.json', '.github/dependabot.yml', '.github/workflows/project.yml']) {
  const json = file.endsWith('.json');
  const obj = (json ? JSON.parse : yaml.parse)(fs.readFileSync(path.join(input, file), 'utf8'));
  new (json ? JsonFile : YamlFile)(project, file, {
    obj,
    marker: false,
    readonly: false,
    editGitignore: false,
  });
}
project.synth();
```

The measured temporary stage used `authoring-evaluation.yml` as its internal workflow filename, then
embedded its contents at the **canonical** `.github/workflows/project.yml` writer key. This scratch
filename does not enter the consumer or affect file bytes. Use SHA-256 across all four exported files
for two same-stage and two fresh-stage runs; compare parsed values against the input as well.

Normalize the three template outputs using the bundled Oxfmt configuration copied outside
`node_modules` (Node refuses TypeScript config loading there), then copy only those files into the
scratch package's `dist/template`. Preserve `dist/template/package-lock.json` untouched. In the scratch
bundle, insert immediately before the unique `for (const [path, content] of Object.entries(files))`
loop inside `writeCi`:

```js
if (config.directory !== '.' || config.prefix || config.nodeVersion !== '26') {
  throw new Error('Authoring trial supports only the documented default scenario');
}
// Embed the literal returned by JSON.stringify(fs.readFileSync(STAGED_WORKFLOW, 'utf8')).
files['.github/workflows/project.yml'] = SYNTHESIZED_WORKFLOW_LITERAL;
```

This intentionally temporary bundle adapter is an evaluation cost, not a proposed implementation. It
runs before the existing formatter/validator and inside the existing staging/materialization path.
Repack, install into a new runner, then use its installed executable:

```sh
node /absolute/runner/node_modules/@rm-industries/create-forge/dist/index.mjs \
  /absolute/generated-site --name locked-site --site-name 'Locked Site' \
  --yes --no-git --no-install
```

In that generated directory run `npm ci`, `npm run quality:core`, then separately `npm run audit`.
Compare its parsed four files with the same baseline inputs before customization. Inspect the delivered
manifest, lockfile and tree for Projen references, links, metadata and writable modes. Add a package
script, a TypeScript compiler option and comments in both YAML files, run `format:fix` and
`quality:core`, and confirm those edits persist. Do not apply this adapter to arbitrary provider options.

## Maintenance accounting

| Responsibility                                                          | Existing static/typed approach                   | Evaluated Projen alternative                                                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package scripts, dependency ranges, engine/support policy               | One curated manifest                             | Same complete policy still supplied as an object; none removed                                                                                                                  |
| TypeScript configuration                                                | Five-line static file                            | Same configuration plus component construction and export                                                                                                                       |
| Dependabot policy                                                       | Static configuration plus materialization tokens | Same policy object plus serializer/export; no policy validation removed                                                                                                         |
| Provider options, scheduling, jobs, artifacts and permissions           | Typed models and provider builders               | Retained; the fixed representative object does not replace parameterization                                                                                                     |
| Schemas, YAML validation, action pin resolution and formatting          | Existing shared code                             | Retained, including normalization required by the trial                                                                                                                         |
| Materialization, paths, collision handling, rollback and opaque copying | Existing generator                               | Retained without bypass                                                                                                                                                         |
| Lockfile synchronization and template-sync releases                     | Existing reviewed policy                         | Unchanged; authoring does not make dependency delivery fresher                                                                                                                  |
| New authoring responsibilities                                          | None                                             | Pinned Projen dependency/upgrades, synthesis configuration, isolated staging, explicit writable/marker settings, export allowlist, determinism/leak checks and workflow adapter |

**Production custom source, configuration or validators removed: zero.** The three input files contain
132 lines together at the baseline; moving them into JavaScript does not eliminate their policy. The
existing GitHub/GitLab builders, shared model, schema and writer total 943 lines; all remain responsible
for the same contracts. Those counts describe scope, not an assertion that every line could or should
be replaced. The small synthesis loop is additional orchestration, not a negative maintenance count.

The higher-level Dependabot component was also actually synthesized with
`versioningStrategy: VersioningStrategy.INCREASE` and `ignoreProjen: false`. Projen 0.104.14 still emitted
`versioning-strategy: lockfile-only`, a single npm update entry and its generation instructions. That
would lose Forge's working manifest/action/group/cooldown policy if adopted as-is. Generic `YamlFile`
preserves the actual policy, but offers no policy-maintenance reduction over the existing YAML.
See the pinned [Dependabot implementation](https://github.com/projen/projen/blob/v0.104.14/src/github/dependabot.ts),
[file defaults](https://github.com/projen/projen/blob/v0.104.14/src/file.ts) and
[project synthesis](https://github.com/projen/projen/blob/v0.104.14/src/project.ts).

## Limits and recommendation

The executed trial proves equivalent default generated data and working local public commands for a
real installed scratch package. It does not prove hosted GitHub/GitLab execution, deployment, all
supported runtimes, full browser/Lighthouse behavior, CMS editing preservation or replacement of the
existing provider writer. The normal unit suite includes CMS configuration tests, not interactive CMS
editing. Preserve the independent baseline safety and CMS evidence; do not infer them from JSON/YAML
equality. No existing consumer repository was regenerated or modified.

Recommend **retain static configuration and existing typed CI generation** for this slice. Projen can
produce editable output behind an internal export boundary, but the measured approach removes no
custom policy or validation and adds normalization/staging obligations. Broader specialized-component
migration would require a separate, justified benefit and further executable provider coverage. No
extension or production adoption is needed to make the present retain-baseline decision.
