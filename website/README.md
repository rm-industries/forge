# Forge project website

This standalone Astro project serves Forge's product pages and consumer
documentation at <https://www.rm-industries.com/forge/>. It is owned source,
excluded from the root npm workspace. Adopt template improvements selectively;
do not regenerate over this directory. It was originally bootstrapped from
published create-forge `1.0.0`; subsequent changes are reviewed source migrations.

## Local development

Use **Node.js 26** and an npm version accepted by `package.json`. This requirement
applies to website tooling; generated Forge sites and independently released
packages retain their own supported runtimes. Browser compatibility targets are
unchanged.

Run commands from this directory, using the committed standalone lockfile:

```sh
npm ci
npm run dev
```

| Command                  | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `npm run quality:static` | Formatting, linting, spelling, unused code, and Astro checks. |
| `npm run quality:core`   | Static checks, unit coverage, build, and output validation.   |
| `npm run quality`        | Core checks, browser/accessibility tests, and Lighthouse.     |
| `npm run audit`          | Separate registry-backed dependency vulnerability policy.     |
| `npm run format:fix`     | Apply Oxfmt formatting.                                       |
| `npm run build`          | Produce the static website in `dist/`.                        |
| `npm run preview`        | Serve an existing production build.                           |
| `npm run validate:build` | Check the built artifact.                                     |
| `npm run test:coverage`  | Run unit tests with the maintained 100% coverage thresholds.  |
| `npm run test:e2e`       | Browser navigation, metadata, link, and accessibility checks. |
| `npm run test:a11y`      | Focused Playwright and axe accessibility checks.              |
| `npm run lighthouse:ci`  | Measure production routes against the performance budget.     |

Run `npm run quality` before review. Run `npm run audit` when manifests or locks
change; it is deliberately separate from deterministic quality checks. Browser
and Lighthouse commands inspect the existing production build through Astro
preview; run `npm run build` first when invoking them separately. CI supplies its
already validated build artifact. Do not lower coverage,
accessibility, or performance thresholds to hide a regression.

## Website architecture

This is a static product and documentation website. It has no CMS application,
admin route, article collection, or feed. Generated-site content and CMS guides
explain the product's output and do not describe this website's runtime.

`src/config/site.ts` owns identity, canonical URL, navigation, and repository
links. The canonical URL's `/forge/` pathname supplies the production base;
local development uses `/`. Shared URL helpers apply the base to navigation,
assets, metadata, and supporting files. Keep the existing origin and base when
editing content.

Use `src/layouts/BaseLayout.astro` for the single main landmark, skip link,
header, footer, and canonical/social metadata. Reuse the existing Astro and
DaisyUI components. Styles live in `src/styles/`; Catppuccin theme definitions
live in `src/themes/`. Fira Sans and Fira Code are bundled locally through
Fontsource. The default theme follows the operating-system color preference
without client JavaScript.

Consumer documentation is rendered through `src/content.config.ts`. Maintain
one canonical source per topic rather than copying guides into this directory.
The root README contains repository operating guidance and is not website
consumer documentation.

## Validation and deployment

The root `.github/workflows/website.yml` and `.gitlab/ci/website.yml` use Node 26
and the website's own lockfile. Source checks and unit coverage precede one
production build; output validation, browser tests, Lighthouse, and deployment
consume that same artifact. Review affected results before merging.

GitHub Pages deployment is limited to eligible pushes to `main` and depends on
the website checks. Pull requests receive no deployment credentials. Preserve
immutable action pins, least-privilege permissions, cancellation of superseded
PR runs, retained failure evidence, and the standalone dependency boundary.
See [website deployment](docs/github-pages.md) for current hosting details.

Repeat the [manual accessibility checklist](docs/accessibility-checklist.md)
after interface or content changes; axe cannot replace manual judgment. Keep the
[Lighthouse budget](docs/performance-budget.md) and its measured limits intact.
Coverage, Playwright traces/screenshots, and Lighthouse reports are generated
artifacts and remain ignored. Dependency exceptions require exact advisory
scope and expiry; they are not permission to ignore unrelated audit failures.

## Isolated browser previews

Build the site before running browser checks. Playwright asks Astro for the
production deployment settings and owns a foreground preview server at
`http://127.0.0.1:4321`, including the configured mount path. It does not reuse,
stop, or replace a developer preview session. Choose another free local port
when needed:

```sh
PLAYWRIGHT_PORT=5432 npm run test:e2e
```

Use `PLAYWRIGHT_PORT` in place of the former website-only
`FORGE_PREVIEW_ORIGIN` override. The port must be an integer from 1 through 65535. Remote deployment smoke checks
continue to use `DEPLOYMENT_URL` with HTTPS; they neither start a local preview
nor rebuild the deployed artifact.
