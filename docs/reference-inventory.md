# Reference implementation inventory

This inventory implements
[FGE-002](https://github.com/rm-industries/forge/issues/2). It identifies which
parts of the reference site may inform Forge, which parts require
configuration, and which parts must never enter a generated project.

## Reference snapshot

- Repository:
  [`rahul0705/rahul0705.github.io`](https://github.com/rahul0705/rahul0705.github.io)
- Branch: `main`
- Commit:
  [`3eb5208`](https://github.com/rahul0705/rahul0705.github.io/commit/3eb52085c463d2e5807f4f6f8c08f1a55ae1a748)
- Inspected: 2026-08-18

The snapshot is an Astro static site using Tailwind CSS, DaisyUI, Catppuccin,
Sveltia CMS, Vitest, Playwright, axe-core, Lighthouse, and GitHub Pages.

## Classification rules

| Classification | Meaning |
| --- | --- |
| `reusable-core` | General behavior that belongs in Forge or its default template after provenance and license requirements are satisfied. |
| `configurable-example` | A useful pattern whose values, copy, branding, or enabled state must be replaced with generic configuration or seed data. |
| `site-specific` | Behavior designed for the reference owner's site; it is not part of the Forge v1 product contract. |
| `exclude` | Personal, identifying, secret, unclear-license, or otherwise unsuitable material that must not enter Forge. |

Classification does not grant permission to copy code. It records the desired
product disposition.

## License and provenance gate

The inspected snapshot contains no root `LICENSE`, `COPYING`, or `NOTICE` file,
and its `package.json` has no `license` field. Therefore, the reference source
must be treated as **all rights reserved by default**. Forge may use the
inventory as an architectural specification, but must not copy or adapt source
text from the reference repository until either:

1. the relevant source is released under a license compatible with Forge's MIT
   license; or
2. the rights holder records explicit permission covering the reused files.

Until that gate is cleared, Forge implementations must be clean, original
implementations based on the behavior described in the roadmap and ADRs. A
future reuse change must record the reference commit, source paths, destination
paths, whether the work was copied or adapted, the applicable license or
permission, and any required notice.

Installed npm packages are dependencies, not copied source. Their own licenses
must be reviewed through the lockfile and release process. GitHub Actions must
be consumed by immutable commit reference under their respective licenses; the
action implementations are not vendored.

The files under `src/assets/covers/` identify Unsplash sources and the Unsplash
License in `src/assets/covers/ATTRIBUTION.md`. They remain excluded from Forge;
the attribution does not change the reference repository's missing source-code
license or make the images appropriate generic seed assets. Other photographs
and the PDF in the snapshot do not contain a clear repository-level license and
are also excluded.

## Subsystem inventory

Every `reusable-core` or `configurable-example` row includes its intended Forge
destination. Paths are relative to the Forge repository.

### Application and routes

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/layouts/BaseLayout.astro`, `src/components/ui/SeoHead.astro` | `reusable-core` | Reimplement the document shell, metadata contract, canonical URL behavior, skip-link target, and global style hooks in `templates/default/src/layouts/` and `templates/default/src/components/seo/`. All titles, URLs, and social defaults come from typed site configuration. |
| `src/components/ui/{Badge,Card,Container,ContentMeta,PageHeader,Section,TagList}.astro` | `reusable-core` | Reimplement accessible, typed primitives in `templates/default/src/components/ui/`. Preserve behavior, not reference-site class strings or copy. |
| `src/components/navigation/{Navbar,Footer}.astro` | `configurable-example` | Reimplement semantic navigation in `templates/default/src/components/navigation/`; derive labels, links, branding, and social accounts from `templates/default/src/config/site.ts`. |
| `src/components/blog/*`, `src/layouts/BlogLayout.astro`, `src/lib/blog.ts` | `reusable-core` | Reimplement generic article cards, cover handling, table of contents, draft filtering, sorting, and article layout in `templates/default/src/components/content/`, `templates/default/src/layouts/`, and `templates/default/src/lib/content/`. |
| `src/pages/{index,404,privacy}.astro`, `src/pages/blog/**` | `configurable-example` | Use route structure and accessibility behavior as examples for `templates/default/src/pages/`; replace all copy and make privacy/analytics statements conditional on enabled features. |
| `src/pages/rss.xml.ts` | `configurable-example` | Reimplement at `templates/default/src/pages/rss.xml.ts` only if the route decision retains RSS; derive metadata from site configuration and generic content. |
| `src/components/home/*`, `src/data/home.ts` | `configurable-example` | Keep only generic section patterns in `templates/default/src/components/home/` and generic seed configuration. Exclude the reference biography, employers, claims, statistics, and toolkit selection. |
| `src/components/resume/**`, `src/pages/resume/**`, `src/data/resume/**` | `site-specific` | Do not include in the v1 template. Resume generation, JSON Resume exports, experience coverage, awards, and financial-scope behavior are outside the one-template v1 baseline. |

### Styling and assets

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/styles/global.css`, `src/styles/article-classes.ts` | `reusable-core` | Reimplement typography, focus, reduced-motion, content, and print-safe foundations in `templates/default/src/styles/`. Remove selectors that exist only for resume or reference-site components. |
| `src/styles/print.css` | `configurable-example` | Retain generic print foundations in `templates/default/src/styles/print.css`; exclude resume-specific print layout. |
| `src/themes/catppuccinTheme.*.ts`, `src/themes/site-theme.ts` | `reusable-core` | Reimplement Latte, Frappe, Macchiato, and Mocha theme composition in `templates/default/src/themes/` using the Catppuccin packages as dependencies. Preserve upstream attribution and license metadata required by those packages. |
| `src/styles/cms-preview.css` | `reusable-core` | Reimplement the minimal CMS preview style bridge in `templates/default/src/integrations/sveltia/`; it must consume template theme tokens rather than reference branding. |
| `public/favicon.svg` | `configurable-example` | Replace with a new generic Forge placeholder at `templates/default/public/favicon.svg`; never copy reference branding. |
| `src/assets/**`, `public/assets/**` | `exclude` | Do not copy photographs, article covers, diagrams, posters, PDFs, or other media. Create new generic seed assets with recorded provenance and redistribution rights. |

### Content architecture and seed content

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/lib/content-model/**` | `reusable-core` | Use as a behavioral reference for an original implementation in `packages/content-model/src/core/`. The package owns field and collection types, definition helpers, validation, and tests. |
| `src/integrations/astro/{adapter,adapter.test}.ts` | `reusable-core` | Use as a behavioral reference for `packages/content-model/src/astro/`; expose it through `@rm-industries/content-model/astro`. |
| `src/config/content-models/blog.ts` | `configurable-example` | Create a generic article declaration at `templates/default/src/config/content-models/articles.ts` using the published model package. Keep only fields required by the v1 content contract. |
| `src/config/content-models/{registry,shared-fields}.ts` | `reusable-core` | Reimplement registry and reusable declaration patterns in `templates/default/src/config/content-models/`. Site-specific collections must not enter the registry. |
| `src/config/content-models/{experience,financial-scopes,skills}.ts` | `site-specific` | Exclude from v1. They support the personal resume domain rather than the generic article template. |
| `src/content/blog/**` | `exclude` | Do not copy articles, titles, dates, tags, links, or front matter. Add newly written generic seed articles under `templates/default/src/content/`. |
| `src/content/{experience,financial-scopes,skills}/**` | `exclude` | Do not copy personal employment history, program values, skill claims, or identifiers. These collections are not enabled in v1. |

### CMS

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/integrations/sveltia/{adapter,adapter.test}.ts` | `reusable-core` | Use as a behavioral reference for an original adapter in `packages/content-model/src/sveltia/`; expose it through `@rm-industries/content-model/sveltia`. Core and both adapters ship as one package version. |
| `src/integrations/sveltia/{config,config.test}.ts` | `configurable-example` | Reimplement site-level CMS composition in `templates/default/src/integrations/sveltia/`. Repository, title, logo, media paths, and backend values must derive from project configuration or explicit generator input. No token may be embedded. |
| `src/pages/admin/index.astro` | `reusable-core` | Reimplement the loader and accessible fallback at `templates/default/src/pages/admin/index.astro`; keep Sveltia initialization isolated from normal site routes. |
| `src/integrations/sveltia/{previews,experience-preview}*` | `site-specific` | Exclude resume previews. Add a newly implemented generic article preview under `templates/default/src/integrations/sveltia/previews/` only if it can share template tokens and generic model declarations. |
| Local-repository editing flow documented in `README.md` | `configurable-example` | Document the generic local workflow in `templates/default/README.md` without naming the reference account or repository. |

### Testing and quality tooling

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/**/*.test.ts`, `vitest.config.ts`, `test-support/**` | `reusable-core` | Reimplement unit and contract testing patterns beside their production code. Package adapter tests belong in `packages/content-model/`; template tests belong in `templates/default/src/` and `templates/default/test-support/`. Replace all personal fixtures and assertions. |
| `tests/site.spec.ts`, `playwright.config.ts` | `configurable-example` | Reimplement route, keyboard, metadata, axe, and analytics-state checks in `templates/default/tests/`. Assertions must consume generic configuration rather than reference names, URLs, posts, resume downloads, or measurement IDs. |
| `.lighthouserc.json` | `configurable-example` | Establish evidence-based budgets for `templates/default/.lighthouserc.json`; do not assume the reference routes or thresholds without review. |
| `oxfmt.config.ts`, `cspell.config.ts`, `.markdownlint.json`, `stylelint.config.ts`, `tsconfig.json` | `configurable-example` | Recreate workspace-aware root configuration and standalone template configuration in their respective roots. Remove the personal spelling dictionary and reference-only exclusions. |
| `package.json`, `package-lock.json` | `configurable-example` | Use dependency and script coverage as input to the roadmap, then create Forge-owned manifests and lockfiles. Do not copy the reference package name, version, dependency ranges, or lockfile wholesale. |

### Project configuration and repository files

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `src/data/site.ts`, `src/data/socials.ts` | `configurable-example` | Replace coupled, resume-derived values with a typed, validated contract at `templates/default/src/config/site.ts`. Navigation, SEO, footer, sitemap, RSS, and CMS branding consume this contract. |
| `astro.config.ts` | `configurable-example` | Reimplement static output, sitemap, Tailwind, and trailing-slash behavior in `templates/default/astro.config.ts`. The canonical URL must come from project configuration; the reference domain is excluded. |
| `src/config/analytics.ts`, `src/components/ui/Analytics.astro` | `configurable-example` | If analytics remains in scope, make it optional and disabled by default under `templates/default/src/integrations/analytics/`. Never include the reference measurement ID. |
| `.editorconfig`, `.gitignore`, `.vscode/**` | `configurable-example` | Recreate repository and template hygiene from Forge requirements. Editor recommendations must be optional and contain no machine-specific paths. |
| `README.md` | `configurable-example` | Use topic coverage as an input to new root and generated-project documentation. Do not copy personal descriptions, domains, repository names, or resume instructions. |
| `CNAME`, `public/robots.txt` | `exclude` | Never copy the custom domain or domain-bearing robots content. Generate robots and sitemap locations from typed site configuration; do not generate `CNAME` unless the user supplies a domain. |

### Workflows and automation

| Reference paths | Class | Disposition and future Forge location |
| --- | --- | --- |
| `.github/actions/setup-project/action.yml` | `reusable-core` | Reimplement deterministic Node/npm setup in `templates/default/.github/actions/setup-project/action.yml` or inline it if that is simpler. Pin third-party actions to reviewed commit SHAs. |
| `.github/workflows/project.yml` | `configurable-example` | Reimplement generated-project CI at `templates/default/.github/workflows/ci.yml` after the final quality pipeline exists. Preserve least privilege, concurrency, clean installs, independent jobs, artifacts, and required gates; derive commands from template scripts. |
| `.github/workflows/automation.yml` | `reusable-core` | Reimplement workflow linting and security checks under `templates/default/.github/workflows/`; keep immutable action pins and least-privilege permissions. |
| `.github/workflows/security.yml` | `configurable-example` | Reimplement CodeQL and dependency review under `templates/default/.github/workflows/`, subject to repository visibility and GitHub feature availability. Do not retain unused branch names. |
| `.github/dependabot.yml` | `configurable-example` | Create Forge-owned npm and Actions update groups at `templates/default/.github/dependabot.yml`; labels and cadence must match documented generated-project policy. |

## Mandatory exclusions

The following material is excluded even when it appears inside an otherwise
reusable subsystem:

- names, biography, contact details, social profiles, usernames, account names,
  and repository identifiers;
- all resume, employment, education, award, interest, skill, project, program,
  and financial-scope data;
- `rahulmohandas.com`, `www.rahulmohandas.com`, `rahul0705`, the `CNAME` file,
  and every canonical, sitemap, feed, CMS backend, or test value derived from
  them;
- Google Analytics measurement ID `G-K6P860TJ0W` and all other analytics,
  telemetry, advertising, or verification identifiers;
- tokens, credentials, private keys, environment files, repository secrets,
  personal access tokens, and any secret-like fixture values;
- blog articles, resume exports, PDFs, photographs, cover images, diagrams,
  favicons, and other reference media;
- reference-specific CMS branding, preview copy, filenames, test snapshots,
  spellcheck words, and route assertions; and
- third-party material without an explicit compatible license and preserved
  attribution.

A heuristic scan of the inspected snapshot found the personal identifiers and
analytics value listed above and did not find common committed private-key or
provider-token signatures. That result is not evidence that the repository is
free of secrets; Forge must copy no secret-bearing files and must run dedicated
secret and personal-identifier scans at release checkpoints.

## Provenance record for future reuse

No source has been copied into Forge by this inventory. When a later issue
implements a `reusable-core` or `configurable-example` row, its pull request must
add a provenance entry containing:

| Field | Required value |
| --- | --- |
| Source | Repository URL, immutable commit SHA, and exact source paths |
| Destination | Exact Forge package or template paths |
| Method | `original`, `adapted`, or `copied` |
| Rights | SPDX license identifier or link to recorded permission |
| Changes | Concise description of the adaptation |
| Notices | Attribution or notice files that must be retained |

If `Method` is `adapted` or `copied`, missing rights information blocks the
change. Dependency installation records the package name and resolved version
rather than a copied-source provenance entry.

## Release-checkpoint verification

Before every release checkpoint, scan the proposed template, packed generator,
and generated fixture—not only Git-tracked source—for at least:

- `Rahul`, `Mohandas`, `rahul0705`, and `rahulmohandas.com`;
- `G-K6P860TJ0W` and unexpected `G-`, `UA-`, or similar analytics identifiers;
- reference employer, program, resume, repository, and asset names;
- email addresses, telephone numbers, usernames, custom domains, and social
  profile URLs; and
- private-key headers and provider-specific token signatures.

Any match must be removed or explicitly documented as a safe generic test
fixture before release. The automated scan and its allowlist belong in the
template-isolation and release-validation work; this document defines the
minimum policy and known-reference baseline.
