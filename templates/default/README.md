# Forge site

This directory is a standalone Astro project and is intentionally excluded from
the parent npm workspace. Install and run all commands from this directory.

Install dependencies with `npm ci`, then use the local scripts below. Every
command resolves tools from this project's dependencies; no global installation
is required.

The template's `.editorconfig` shares UTF-8, LF, final-newline, two-space, and
120-column settings with supported editors and Oxfmt. `oxfmt.config.ts` contains
only formatter-specific behavior such as quote and import ordering.

## Start here

The generated documentation is organized by task:

- [Getting started and site configuration](docs/guides/getting-started.md)
  covers installation, local development, branding, identity assets, pages, and
  the first verification pass.
- [Content and CMS editing](docs/guides/content-and-cms.md) covers Markdown
  articles, drafts, Sveltia local mode, deployed editing, shared model changes,
  media, and recovery.
- [Themes and accessibility](docs/guides/themes-and-accessibility.md) covers
  themes, fonts, layout semantics, automated checks, and manual review.
- [Quality checks, dependency updates, and troubleshooting](docs/guides/quality-and-troubleshooting.md)
  explains the validation layers, common failures, Dependabot review, and safe
  support requests.
- [GitHub Pages deployment](docs/github-pages.md) covers project sites, custom
  domains, environment protection, and deployment diagnosis.
- [Accessibility review](docs/accessibility-checklist.md) and the
  [Lighthouse performance budget](docs/performance-budget.md) record the
  generated baseline and the manual checks projects must maintain.

The remainder of this README is the complete command and implementation
reference.

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run dev`            | Start Astro's local development server.                          |
| `npm run build`          | Create the production site in `dist/`.                           |
| `npm run validate:build` | Validate required output and scan generated text.                |
| `npm run preview`        | Serve the production build locally. Run `build` first.           |
| `npm run typecheck`      | Generate Astro types and run TypeScript without emitting files.  |
| `npm run astro:check`    | Validate Astro components, content, and diagnostics.             |
| `npm run format`         | Check formatting with Oxfmt.                                     |
| `npm run format:fix`     | Apply Oxfmt formatting.                                          |
| `npm run lint`           | Run code, CSS, Markdown, and spelling checks.                    |
| `npm run lint:code`      | Check JavaScript and TypeScript with Oxlint.                     |
| `npm run lint:css`       | Check CSS with Stylelint.                                        |
| `npm run lint:markdown`  | Check Markdown with Markdownlint.                                |
| `npm run spellcheck`     | Check repository text with cspell.                               |
| `npm run audit:unused`   | Detect unused files, exports, and dependencies with Knip.        |
| `npm run lighthouse:ci`  | Build and enforce Lighthouse scores and transfer budgets.        |
| `npm test`               | Run the `test:unit` command.                                     |
| `npm run test:unit`      | Run deterministic TypeScript unit tests with Vitest.             |
| `npm run test:a11y`      | Run focused Playwright and axe accessibility checks.             |
| `npm run test:coverage`  | Run unit tests and enforce V8 coverage thresholds.               |
| `npm run test:e2e`       | Run browser and accessibility tests with Playwright.             |
| `npm run audit`          | Reject unapproved high-severity dependency vulnerabilities.      |
| `npm run quality:static` | Run every static-quality and dependency audit.                   |
| `npm run quality:core`   | Run static checks, coverage tests, build, and output validation. |
| `npm run quality`        | Run the complete generated-project quality pipeline.             |

During development, run `npm run dev`. Before committing, run
`npm run quality`. It runs static validation and dependency auditing, unit tests
with coverage thresholds, a production build and generated-output validation,
the complete Playwright and axe suite, and Lighthouse budgets in that order.
Each stage is joined with `&&`, so the command stops immediately and returns a
non-zero status when any stage fails. Browser tests and Lighthouse start from
their own production build so they remain independently runnable and cannot
accidentally inspect stale output.

The complete command is intentionally high cost. Use `npm run quality:static`
for the quickest source-only feedback or `npm run quality:core` for every check
that does not launch a browser. Both commands include `npm run audit`, so they
query the npm registry and can change when new advisories are published. Run
the individual scripts when working offline. CI may execute independent stages
in parallel, but a project generated by the packed Forge initializer must pass
the documented `npm run quality` command as a single ordered pipeline.

## Continuous integration

The generated `.github/workflows/project.yml` runs on pull requests targeting
`main` and on pushes to `main`. It separates static quality, coverage-enforced
unit tests, the validated production build, browser and accessibility tests,
and Lighthouse budgets so failures identify the affected gate directly. The
required `Project` result succeeds only after every release-blocking job passes.
On pushes to `main`, that result unlocks a separate GitHub Pages deployment;
pull requests never upload or deploy a Pages artifact. Deployment setup,
project-site URLs, custom domains, and environment protections are documented in
[`docs/github-pages.md`](docs/github-pages.md).

The workflow installs dependencies with `npm ci`, caches npm downloads using
the lockfile, cancels superseded runs on the same Git reference, and grants only
read access to repository contents. Pull requests receive no secrets or write
permissions. Coverage, production builds, Lighthouse reports, and browser
failure evidence are retained for seven days. All third-party actions use
immutable commit pins.

Security automation is included alongside project CI. CodeQL analyzes the
project's TypeScript and GitHub Actions on pull requests, pushes to `main`, and
a weekly schedule. Dependency review rejects pull requests that introduce
known high- or critical-severity vulnerabilities. A separate scheduled
automation workflow validates workflow syntax and scans GitHub Actions with
Zizmor. Zizmor uploads its findings to GitHub code scanning for review in the
Security tab without failing the workflow solely because it found an issue.
The job receives `security-events: write` only for that upload; all other access
remains read-only. Repositories can make selected code-scanning severities
merge-blocking later through their ruleset without changing the workflow.
The `Automation` aggregate runs when `.github/**` changes and succeeds only after
both workflow syntax and security validation pass. Because it is path-filtered,
do not configure it as a globally required status check; review it whenever an
automation change causes it to appear.

Dependabot checks npm and GitHub Actions weekly. Minor and patch npm updates are
grouped by production or development scope, while major updates remain separate
for deliberate review. Updates use cooldown periods to avoid adopting newly
released versions immediately. Because pre-1.0 Sveltia minor releases may be
breaking, `@sveltia/cms` updates are kept separate from generic production
dependency groups. Its pull requests must satisfy the compatibility line
declared by `@rm-industries/content-model`; moving to a later minor requires a
tested content-model release first. No version is ignored, security updates
remain enabled, and every update must pass the complete project and security
workflows before merging.

GitHub chooses the Dependabot run times, distributing update checks across its
available schedule. Forge derives distinct weekly CodeQL and workflow-validation
minutes from the generated package name. This keeps generation reproducible
while preventing every Forge project from starting scheduled work simultaneously.

Playwright builds the site and runs Chromium against Astro's production preview,
not the development server. Its browser coverage exercises desktop and mobile
navigation, article listing/detail flows, article pagination, light and dark
themes, keyboard use, missing-page recovery, metadata, supporting site files,
and content-manager startup. Each test receives a fresh browser context, and
tests use accessible roles and names where the rendered interface provides
them. On failure, Playwright retains screenshots and traces in `test-results/`;
the HTML report is written to `playwright-report/`. CI retains both directories
for seven days, including failed runs.

Accessibility verification combines automation with the dated manual review in
`docs/accessibility-checklist.md`. Repeat that checklist after changing content,
navigation, themes, components, or interactive behavior; automated axe checks
cannot judge every aspect of reading order, language, focus order, contrast, or
alternative-text quality.

Lighthouse CI runs three times each against the production home, article
listing, and article detail pages, then enforces median category scores and
transfer budgets. The measured baseline, headroom, exclusions, and update rules
are documented in `docs/performance-budget.md`. Reports are written to the
generated `.lighthouseci/` directory; CI retains them for seven days even when
an assertion fails.

The configured exclusions cover only generated output, dependency directories,
and tool artifacts. Stylelint's exceptions recognize Tailwind and DaisyUI
directives used by `src/styles/global.css`; they do not suppress ordinary CSS
rules. Knip uses its Astro integration without an ignore list, and Oxlint uses
its recommended defaults without project-specific rule suppression.

Vitest coverage includes configuration, shared content-model registration,
Astro and Sveltia integration code, content utilities, URL helpers, theme
configuration, and preview registration. Statements, branches, functions, and
lines must remain at 100%. Add direct positive and negative tests when this
source grows; do not lower thresholds or exclude source merely to make a change
pass. HTML details are written to `coverage/`, which is generated and ignored.
CI enforces the same thresholds and retains the HTML report for seven days,
including when the coverage job fails.

Edit `src/config/site.ts` to change the site name, description, author,
canonical URL, repository, language, navigation, social links, and derived CMS branding. The Astro
configuration, shared layout, and reusable SEO head consume this single
validated source. New pages should use `src/layouts/BaseLayout.astro` to inherit
the document shell and canonical metadata.

The canonical URL may include a pathname for a GitHub Pages project site, such
as `https://owner.github.io/repository`. The Astro configuration derives its
deployment base from that pathname, and shared URL helpers apply it to local
navigation, metadata, supporting files, and assets. Root-hosted and custom-domain
sites use an origin-only URL and therefore have no deployment prefix.

The standalone source template uses `https://example.com` as a valid,
non-production site origin. Projects created by Forge receive the values
selected through the generator input contract.

## Styling and themes

The template uses Tailwind CSS v4 through its Vite plugin, DaisyUI, and the
Tailwind typography plugin. Catppuccin Latte is the default light theme and
Mocha is selected automatically for dark color-scheme preferences. All four
Catppuccin flavors are available by setting `data-theme` on the document:

- `data-theme="latte"`
- `data-theme="frappe"`
- `data-theme="macchiato"`
- `data-theme="mocha"`

Global styles live in `src/styles/global.css`; print-safe rules live in
`src/styles/print.css`; and theme configuration lives in `src/themes/`. The
default automatic theme behavior requires no client-side JavaScript.

### Fonts

The template pairs Fira Sans for interface and article text with Fira Code for
code. Both families remain legible at small sizes, have complementary forms,
and are bundled through Fontsource so rendering does not depend on a remote font
service. Only the weights imported by `src/styles/global.css` are included in
the build.

To replace them with other Fontsource families, uninstall both defaults and
install the packages for the new sans-serif and monospace families. For example:

```sh
npm uninstall @fontsource/fira-sans @fontsource/fira-code
npm install @fontsource/inter @fontsource/source-code-pro
```

Then replace the Fontsource imports near the top of `src/styles/global.css` with
the families and weights the site uses:

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/source-code-pro/400.css';
```

Finally, update the Tailwind font tokens in the same file:

```css
@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Source Code Pro', ui-monospace, monospace;
}
```

For a system-font-only site, uninstall the two default Fontsource packages,
remove their CSS imports, and remove the custom family name at the start of each
font token. After either change, run `npm run build` to confirm every imported
weight is installed and bundled.

## Layout primitives

`src/layouts/BaseLayout.astro` supplies the document shell, a keyboard-accessible
skip link, semantic header, main, and footer landmarks, and the shared metadata
components. Page content belongs inside `BaseLayout`; pages must not add another
`main` landmark.

Reusable components are organized by responsibility:

- `navigation/Header.astro` owns the semantic header and outer content boundary;
- `navigation/Navbar.astro` composes branding, responsive menus, configured links, and current-page state;
- `navigation/Footer.astro` renders site identity and optional social links;
- `navigation/Pagination.astro` provides typed previous and next navigation;
- `ui/Container.astro` provides consistent responsive content widths; and
- `ui/Card.astro` provides linked and non-linked DaisyUI card surfaces with typed sizing.

The template follows the operating-system light or dark preference and does not
include a theme control. This keeps the default experience functional without
client-side JavaScript; a future control can select any documented `data-theme`
value if a project chooses to persist a visitor preference.

`Pagination.astro` is intentionally not rendered on the starter homepage: the
template does not yet have a paginated collection, and fragment links would be
a misleading demonstration. The content-listing work will compose it with real
previous and next destinations.

## Routes and metadata

The starter includes home, about, article index, article detail, content
manager, and custom 404 pages. The shared article model lives in
`src/config/content-models/articles.ts`; `src/content.config.ts` converts the
model into Astro validation, while the Sveltia configuration converts the same
model into CMS fields. Generic Markdown fixtures live in
`src/content/articles/`. Draft entries are available during local development
but are excluded from production routes and the RSS feed.

The seed articles intentionally include no article images or other binary
media. This keeps generated projects and repository checkouts small and avoids
shipping decorative assets that most projects would immediately replace. Add
purposeful media only when the site needs it, and pair each meaningful image
with context-appropriate alternative text where it is rendered.

Site configuration drives page titles, descriptions, canonical URLs, Open
Graph and Twitter metadata, the RSS feed, the web manifest, and the sitemap
reference in `robots.txt`. Replace `public/favicon.svg` and
`public/social-card.svg` when establishing a project identity, and update
`socialImage` in `src/config/site.ts` if the sharing image path changes.

## Content manager

Run the development server and open `/admin/` to use Sveltia CMS. Sveltia
automatically offers its local repository workflow in a supported browser;
select the project root to write content directly to `src/content/articles/`.
Review and commit those file changes normally.

Before deploying the content manager, replace
`your-github-user/your-repository` in
`src/integrations/sveltia/config.ts` with the generated site's GitHub
repository. The default configuration offers Sveltia's token authentication
method but never stores a token in source: each editor supplies a token through
the CMS interface, and Sveltia stores it in that browser. A production project
can replace this with its own supported OAuth configuration.

The generated CMS configuration lives in code rather than a duplicated YAML
file. Change content fields in the shared model, then run `npm run typecheck`
and `npm test` to verify that Astro and Sveltia still derive the same contract.
