# Compatibility and support policy

This policy implements
[FGE-003](https://github.com/rm-industries/forge/issues/3) and the versioning
decision in [ADR 0006](decisions/0006-versioning.md).

- Status: Initial policy for the `0.x` release line
- Effective: 2026-08-18
- Applies to: `@rm-industries/create-forge`,
  `@rm-industries/content-model`, and `templates/default`

## Support principles

Forge supports combinations that are declared, tested, and documented. A tool
working outside the matrix does not make that combination supported. Every
release checkpoint must reconcile this policy with package engines, peer
dependencies, lockfiles, CI matrices, generated-project documentation, and the
compatibility report.

Forge does not support end-of-life runtimes. Node.js production guidance
recommends Active or Maintenance LTS releases, and its
[release schedule](https://nodejs.org/en/about/previous-releases) is the source
for lifecycle status.

## Node.js and npm

### Supported versions

| Runtime | Support | Required declaration and evidence |
| --- | --- | --- |
| Node.js `22.12.0` through the latest 22.x release | Minimum supported LTS line | Package engines use `^22.12.0`; CI tests `22.12.0` and the latest 22.x patch. Node 22.12.0 includes npm 10.9.0. |
| Node.js 24.x | Preferred LTS line | Package engines use `^24.0.0`; CI tests the latest 24.x patch. |
| Node.js 26.x | Supported Current line | Package engines use `^26.0.0`; CI tests the latest 26.x patch. Support continues when the line becomes LTS. |
| Node.js 20 and earlier, odd-numbered EOL lines, and experimental/nightly builds | Unsupported | Engines and documentation must not imply support. |
| npm 10.9.x and 11.x | Supported | Package engines use `^10.9.0 || ^11.0.0`; CI covers the npm version bundled with each tested Node line and the minimum Node/npm pair. |
| Other package managers | Unsupported for repository, generator, and generated-project workflows | Users may experiment, but defects must reproduce with npm and the committed npm lockfile. |

The Node engine expression for published packages and generated projects is
`^22.12.0 || ^24.0.0 || ^26.0.0`. The npm engine expression is
`^10.9.0 || ^11.0.0`. Root and template documentation must state the same
minimums.

Only the minimum Node/npm combination and the latest patched release of each
supported Node major need separate blocking jobs. A release must not be made
from an unpatched runtime when a security update is available.

### Lifecycle changes

- Add a new Node major only after the complete quality, generator, package, and
  generated-project suites pass. Supporting a Current release is an explicit
  policy decision; it must not happen only because an engine range happens to
  accept it.
- Remove a Node major no later than its upstream end-of-life date. Announce the
  planned removal in advance when the schedule permits.
- Raising the minimum Node or npm version is breaking for published packages
  and for the generated-project contract.
- During `0.x`, a minimum-version increase requires a minor release and
  migration notes. After `1.0.0`, it requires a major release.

## Operating systems

### Generator and repository development

| Platform | Support level | Required verification |
| --- | --- | --- |
| Ubuntu current LTS, x64 | Supported and primary CI platform | Full repository, package, generator, and generated-project quality pipelines. |
| macOS versions receiving Apple security updates, Apple silicon and Intel where runners are available | Supported | Release-checkpoint generator smoke test covering creation, install, build, and Git initialization. |
| Windows and WSL | Best effort for v1 | No support guarantee until a Windows matrix is added and path, process, executable-bin, and line-ending behavior pass. WSL defects must also reproduce on a supported Linux environment unless WSL support is explicitly promoted. |
| Other Linux distributions, BSD, and other Unix-like systems | Best effort | Defects should reproduce on Ubuntu LTS before they block a release. |

The CLI must use Node path and process APIs rather than assuming POSIX path
separators or shell utilities. Generated npm scripts must be cross-platform
JavaScript or package commands unless they execute exclusively inside a
documented Bash-based GitHub Actions step. File names must work on supported
case-sensitive and case-insensitive file systems.

Generated static output may be hosted on any service that can publish the
build directory. GitHub Pages is the documented and tested deployment target,
not a runtime requirement.

## Browser baseline

Generated sites support the latest two stable major releases of:

- Google Chrome and Microsoft Edge;
- Mozilla Firefox;
- Apple Safari on macOS and iOS; and
- Chrome on Android.

Internet Explorer and browsers without native ES module support are not
supported. Core navigation and article content must remain available without
client JavaScript. Optional enhancements may require JavaScript but must fail
without blocking primary content or navigation.

The blocking browser suite uses the Chromium, Firefox, and WebKit versions
installed by the exact committed Playwright version. It covers keyboard
navigation, serious and critical axe violations, responsive layouts, theme
behavior, content routes, metadata, and the CMS loading boundary. A manual
Safari smoke test is required at release candidates when Playwright WebKit
cannot represent a reported Safari-specific defect. Mobile behavior is tested
through representative narrow viewports and touch-capable emulation; physical
device testing is required only for a known device-specific release blocker.

Browser support applies to generated output. The Sveltia editor additionally
depends on versions supported by its upstream release; Forge must document any
narrower editor baseline without narrowing the public site's baseline.

## Dependency policy

### Version ranges and lockfiles

- Commit npm lockfiles for the root workspace and standalone default template.
- Use normal semver ranges for stable direct dependencies when compatible
  updates are covered by tests. Lockfiles provide reproducible installations.
- Treat pre-1.0 dependencies as potentially breaking at every minor release.
  Use a range bounded below the next minor when their project does not promise
  minor compatibility.
- `@rm-industries/content-model` declares Astro and `@sveltia/cms` as peer
  dependencies. Each peer range contains only versions exercised by the
  package compatibility matrix.
- Sveltia is pre-1.0. Its supported peer range must not cross an untested minor
  boundary. Widening that range requires all Sveltia adapter, configuration,
  preview, build, and browser smoke tests.
- Pin GitHub Actions to full commit SHAs and retain a human-readable release
  comment. Do not use mutable tags as executable references.

### Update cadence

- Automation checks npm and GitHub Actions updates weekly and groups compatible
  low-risk updates where review remains understandable.
- Apply supported-runtime security releases and critical or high-severity
  exploitable dependency fixes as soon as practical; they do not wait for the
  normal update window.
- Direct major updates, pre-1.0 minor updates, peer-range changes, and build or
  deployment tool updates require focused pull requests and full affected
  validation.
- Do not merge an update solely because installation succeeds. Review release
  notes, licenses, package contents, lifecycle scripts, generated output, and
  the affected compatibility matrix.
- Remove unused dependencies. Do not preserve an outdated dependency merely to
  avoid a documented breaking release.

Dependency updates that force a documented runtime increase, remove a
supported peer, or change public behavior follow the breaking-change rules
below.

## Versioning contracts

Forge uses semantic versioning independently for
`@rm-industries/create-forge` and `@rm-industries/content-model`. Git tags and
GitHub releases identify generator releases. The sole default template is a
tested source snapshot bundled with a generator release; it is not published or
versioned as an independent package.

For both published packages:

- before `1.0.0`, breaking changes increment the minor version and require
  migration notes;
- after `1.0.0`, breaking changes increment the major version;
- backward-compatible capabilities increment the minor version; and
- backward-compatible fixes increment the patch version.

A deprecation must identify the replacement and earliest removal release.
After `1.0.0`, a public contract should remain deprecated for at least one minor
release before removal unless retaining it creates a security or data-loss
risk.

### Generator contract

The following are breaking generator changes:

- removing or renaming a command, option, environment variable, configuration
  field, or documented non-interactive input;
- changing an option's meaning, default, precedence, exit status, or parseable
  output in a way that can break existing automation;
- adding an interactive prompt without a stable non-interactive default;
- changing overwrite, rollback, path-validation, dependency-installation, or
  Git-initialization behavior in a less safe or incompatible way;
- changing the generated directory or file contract such that documented
  automation or immediate post-generation commands stop working;
- raising a required Node/npm version or dropping a supported operating system;
  or
- changing the bundled template in a way that invalidates the documented v1
  configuration or content contract for newly generated projects.

The following are normally non-breaking generator changes:

- adding an optional flag or prompt with a backward-compatible default;
- improving diagnostics without changing documented machine-readable output or
  exit behavior;
- fixing generation so output conforms to the existing contract;
- adding validation that rejects input already documented as invalid; or
- updating the bundled template with backward-compatible fixes or optional
  capabilities.

A bug fix is breaking if consumers reasonably depend on documented existing
behavior and the fix changes that contract. Calling a change a fix does not
override its compatibility impact.

### Content-model contract

The following are breaking `@rm-industries/content-model` changes:

- removing or changing exported types, functions, subpath exports, field kinds,
  defaults, validation semantics, inferred output types, or serialized adapter
  output;
- requiring edits to previously valid collection declarations;
- changing Astro or Sveltia adapter behavior so existing content or CMS
  configuration no longer loads equivalently;
- dropping a supported Astro, Sveltia, Node, or npm version; or
- adapting to an upstream breaking change that is observable by package users.

Adding an optional field capability or widening a tested peer range is normally
minor. A compatible correctness or diagnostic improvement is normally a patch.
Core and both adapters always ship as one package version; independently
versioned adapter combinations are unsupported.

## Generated-template evolution

A generated project is owned source, not a managed Forge installation.
Generating with a newer `@rm-industries/create-forge` version creates a new
project from that release's template; it does not describe a safe upgrade for
an existing project.

- Never re-run the generator over an existing project as an upgrade mechanism.
- Generator releases do not mutate or automatically update existing generated
  source.
- Existing projects receive compatible content-model core and adapter updates
  through their normal npm dependency workflow.
- Template source improvements require documented manual steps or dedicated
  migration tooling. Migration tooling, if added, must protect user changes,
  support dry runs, and have its own compatibility contract.
- Security advisories must distinguish dependency updates from source changes.
  When generated source is affected, advisories identify impacted generator
  versions, affected files, and manual remediation.
- Upgrade guides must state prerequisites, ordered edits, validation commands,
  rollback guidance, and whether the change is required or optional.

The generated project's own application version belongs to its owner. Forge
does not synchronize that version with the generator or content-model package.

## Support boundaries

Forge accepts defects for supported combinations when they reproduce in a
clean generated project without unrelated customization. Maintainers may still
help diagnose unsupported environments, but such defects do not block a
release unless the support matrix is intentionally expanded.

The following are outside the support contract:

- modified templates whose failure cannot reproduce from a clean generation;
- package-manager substitutions or dependency overrides outside documented
  ranges;
- end-of-life runtimes and browsers;
- unreviewed CMS plugins, deployment scripts, or third-party integrations; and
- hosting-provider behavior beyond the generated build artifact and documented
  GitHub Pages workflow.

Security reports follow `SECURITY.md` once it exists and must not be disclosed
through public compatibility issues.

## Release-checkpoint verification

Every release checkpoint must record evidence for the following checklist:

- [ ] Package and template Node/npm engines exactly match this policy.
- [ ] CI has blocking minimum and latest supported Node/npm jobs.
- [ ] The generator matrix covers interactive and non-interactive creation on
  Ubuntu and the required macOS smoke test.
- [ ] The content-model matrix covers every declared Astro and Sveltia peer
  range.
- [ ] A copied template installs, checks, builds, and tests outside the
  workspace from its committed lockfile.
- [ ] Playwright runs the committed Chromium, Firefox, and WebKit versions, and
  any required Safari smoke test is recorded.
- [ ] Documentation states the same runtime, operating-system, browser, and
  upgrade expectations.
- [ ] Dependency and action updates have license, security, lifecycle-script,
  and generated-output review evidence.
- [ ] Breaking-change assessment and migration notes agree with the released
  package versions.

Any mismatch blocks the checkpoint. A deliberate support change must update
this policy, affected ADRs when architectural intent changes, package metadata,
CI, and user documentation in the same release-bound change.
