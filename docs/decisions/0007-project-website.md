# 0007: Maintain the project website as an isolated Forge consumer

- Status: Accepted
- Date: 2026-09-03
- Roadmap: [FGE-110](https://github.com/rm-industries/forge/issues/151)

## Context

Forge needs a public project website that demonstrates the product without
hiding consumer problems behind the monorepo. The site must be maintainable
after generation, deploy independently from npm packages, and receive normal
dependency updates without allowing automation to overwrite customized source.

The repository already contains a canonical default template, two independently
versioned npm packages, package-release automation, and repository-level
workflows. Treating the website as another template or npm workspace would blur
those boundaries and could let root dependency hoisting conceal defects that a
generated project would experience.

## Decision

### Location and ownership

Maintain the site in top-level `website/` as a standalone npm project. It has
its own `package.json` and committed `package-lock.json`, is marked private, and
is deliberately excluded from the root npm workspaces. A clean checkout must be
installable with `npm ci` from `website/` without a root installation.

Bootstrap the directory from a reviewed, published `@rm-industries/create-forge`
version. Remove the generated nested Git repository before committing. After
bootstrap, every generated file is owned website source. Record the generator
version used for bootstrap in the website documentation, but do not install the
generator as a runtime or development dependency.

Retain application source, public files, package metadata, the lockfile,
tooling configuration, and developer documentation. Adapt site identity,
content, navigation, Astro `site` and `base` settings, and repository-relative
commands for this deployment. Relocate or remove generated files whose effect
depends on being at a repository root:

- keep repository-wide GitHub configuration and workflows only in root
  `.github/`;
- translate generated quality, security, and deployment behavior into the root
  workflows instead of retaining an inert `website/.github/` tree;
- keep a website-local ignore file, editor configuration, TypeScript settings,
  dependency policy, and tool configuration when they control standalone site
  behavior; and
- remove generated placeholder content or metadata only through normal reviewed
  edits, not by replacing the directory with a newer template.

### Public origin and deployment base

Publish the site as the GitHub Pages project site at
`https://rm-industries.github.io/forge/`. Production builds therefore use that
origin and `/forge/` base. Internal links and assets must work both under the
production base and in local development.

Website publication means GitHub Pages deployment, not npm publication. Pull
requests that affect the site run its affected quality, build, browser,
accessibility, and performance checks but never deploy to the production Pages
environment. After those checks pass and a change reaches `main`, the Pages
workflow builds from the committed `website/package-lock.json`, uploads the
resulting static artifact, and deploys it through a protected `github-pages`
environment. Concurrent deployments may cancel an older, superseded run. The
deployment and Pages environment must remain traceable to the merged commit.

Package releases and website deployments are independent:

- `content-model-v*` and `create-forge-v*` tags publish npm packages according
  to [ADR 0006](0006-versioning.md);
- repository checkpoint tags, including the `v1.1.0` website launch checkpoint,
  do not publish the site or an npm package; and
- the website deploys only when its source or deployment contract changes on
  `main`, even if a package release occurs at the same commit.

Rollback means reverting the website change on `main` and deploying the revert.
It does not mean moving or recreating a package or checkpoint tag.

### Dependencies, Dependabot, and Forge upgrades

Configure Dependabot for `directory: /website` as a separate npm ecosystem.
The website lockfile is updated independently of the root workspace and default
template lockfiles. Website dependency pull requests run the same affected site
checks as human-authored dependency changes. They do not deploy before merge;
after review and merge, they follow the normal `main` deployment flow.

Dependabot may propose compatible direct and transitive updates, including a
published `@rm-industries/content-model` version allowed by the website's
manifest. Peer-related Astro or Sveltia updates must keep the selected
content-model version's declared peer ranges satisfied and pass the complete
affected compatibility, build, browser, and CMS checks. Security updates may be
prioritized but do not bypass those gates. Major updates, pre-1.0 minor updates,
peer-range changes, and deployment-tool updates remain focused, human-reviewed
pull requests. This decision does not enable dependency auto-merge.

The root GitHub Actions Dependabot entry owns actions used by the root website
workflows; no second actions entry is needed under `website/` after nested
workflows are removed. Root, template, and website npm entries remain separate
because each has its own installation and lockfile.

Dependabot cannot update the Forge template provenance of an existing site.
`@rm-industries/create-forge` is a creation tool, not an installed application
dependency, and a new generator release does not safely describe edits to owned
source. Template improvements therefore use a dedicated issue and reviewed
migration pull request. The migration identifies the source generator versions,
selects individual changes, preserves website customizations, and runs the full
affected site gate. Neither Dependabot nor another automation may regenerate or
replace `website/`.

### Content and support boundaries

Website content is maintained through normal pull requests. The site may explain
Forge and link to packages, examples, and repository documentation, but it is
not the canonical source for package APIs, compatibility policy, security
policy, architectural decisions, or maintainer procedures. Those contracts stay
in versioned repository documentation, and the website links to them where
appropriate rather than duplicating normative text.

The website follows the accessibility, performance, security, Node/npm, and
browser expectations in the [support policy](../support-policy.md). Its CI and
deployment evidence must make those expectations observable. GitHub repository
security features continue to cover website source, while the website's own
lockfile is audited independently.

## Maintenance flows

| Change                          | Source of truth                                          | Validation and publication                                                                              |
| ------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Website content or owned source | `website/`                                               | Site checks in the pull request; Pages deploy after merge                                               |
| Website npm dependency          | Dependabot or maintainer pull request against `website/` | Site checks and peer compatibility; Pages deploy after merge                                            |
| Root workflow action            | Root Dependabot GitHub Actions entry                     | Workflow validation and affected site checks; no deployment unless the site deployment contract changed |
| Content-model package release   | Package-scoped release flow                              | No automatic site change; a website dependency pull request adopts it                                   |
| Forge template improvement      | Default template and migration guidance                  | Reviewed, selective migration into owned website source                                                 |
| Generator package release       | Package-scoped release flow                              | No automatic site change or regeneration                                                                |

## Consequences

The website becomes a realistic consumer and exposes missing package contents,
implicit hoisting, base-path errors, and incomplete generated tooling. Its
installation and deployment remain reproducible and separately auditable.

The isolation duplicates some development dependencies and configuration and
adds a third npm lockfile. Repository automation must explicitly classify
`website/` changes and run commands with that directory as the project root.
Template improvements can drift from the website until maintainers select and
migrate them, but this cost protects customized source and makes upgrade intent
reviewable.

## Rejected alternatives

- Adding `website/` to the root npm workspaces could mask consumer defects
  through dependency hoisting and shared installation state.
- Deploying `templates/default/` would turn the product template into project
  marketing content and would not exercise post-generation ownership.
- Maintaining the site in another repository would weaken use of Forge within
  its own monorepo and split changes from the packages and documentation they
  describe.
- Automatically regenerating the site for each generator release could erase or
  silently conflict with owned customizations.
- Publishing the site as an npm package or tying Pages deployment to package
  tags would couple unrelated release cycles.
