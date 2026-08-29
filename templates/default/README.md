# Forge site

This directory is a standalone Astro project and is intentionally excluded from
the parent npm workspace. Install and run all commands from this directory.

Install dependencies with `npm ci`, then use the local scripts below. Every
command resolves tools from this project's dependencies; no global installation
is required.

The template's `.editorconfig` shares UTF-8, LF, final-newline, two-space, and
120-column settings with supported editors and Oxfmt. `oxfmt.config.ts` contains
only formatter-specific behavior such as quote and import ordering.

| Command                 | Purpose                                                                     |
| ----------------------- | --------------------------------------------------------------------------- |
| `npm run dev`           | Start Astro's local development server.                                     |
| `npm run build`         | Create the production site in `dist/`.                                      |
| `npm run preview`       | Serve the production build locally. Run `build` first.                      |
| `npm run typecheck`     | Generate Astro types and run TypeScript without emitting files.             |
| `npm run astro:check`   | Validate Astro components, content, and diagnostics.                        |
| `npm run format`        | Check formatting with Oxfmt.                                                |
| `npm run format:fix`    | Apply Oxfmt formatting.                                                     |
| `npm run lint`          | Run code, CSS, Markdown, and spelling checks.                               |
| `npm run lint:code`     | Check JavaScript and TypeScript with Oxlint.                                |
| `npm run lint:css`      | Check CSS with Stylelint.                                                   |
| `npm run lint:markdown` | Check Markdown with Markdownlint.                                           |
| `npm run spellcheck`    | Check repository text with cspell.                                          |
| `npm test`              | Run TypeScript unit tests with Vitest.                                      |
| `npm run test:e2e`      | Run browser and accessibility tests with Playwright.                        |
| `npm run audit`         | Report high-severity dependency vulnerabilities with npm.                   |
| `npm run quality`       | Run the deterministic formatting, linting, type, unit-test, and build gate. |

During development, run `npm run dev`. Before committing, run
`npm run quality` and `npm run test:e2e`. Run `npm run audit` separately because
it queries the npm registry and its result can change without a source change.
The quality command remains deterministic and suitable for offline work after
dependencies are installed.

Edit `src/config/site.ts` to change the site name, description, author,
canonical URL, repository, language, navigation, social links, and derived CMS branding. The Astro
configuration, shared layout, and reusable SEO head consume this single
validated source. New pages should use `src/layouts/BaseLayout.astro` to inherit
the document shell and canonical metadata.

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
