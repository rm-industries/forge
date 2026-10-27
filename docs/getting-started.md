# Create a Forge site

Forge generates an Astro application you own, with accessible components,
Markdown content, Sveltia CMS editing, and native CI configuration.

This tutorial describes the create-forge 2.0 generation contract for the
coordinated release. Documentation does not mean 2.0 has been published: check
[available npm versions](https://www.npmjs.com/package/@rm-industries/create-forge?activeTab=versions)
before selecting that version. Until it is available, use the published version
and its matching package reference rather than assuming the new contract exists.

## Prepare your tools

Use Node.js 22.23.4 or newer on the supported 22, 24, or 26 lines, and npm
10.9 or 11. These are generated-site requirements. Building the Forge project
website itself requires Node 26; visitors need only a supported browser.

## Generate a new project

Once 2.0 is available, create a new directory with the versioned initializer:

```sh
npm create @rm-industries/forge@2.0.0 my-site
cd my-site
npm run dev
```

The initializer asks for project and site identity, the production URL and
repository details. It installs dependencies with `npm install` and initializes
Git unless you disable those steps. The 2.0 generator delivers template source
and dependency ranges without a lockfile. Installation resolves published packages
inside those ranges and their peers, then validates the new consumer-owned lock
before Git initialization. Commit the resulting `package-lock.json` with your
source; later dependency updates remain your project's responsibility.

Astro prints the development address, normally `http://localhost:4321`. Stop it
with `Control+C`.

Ordinary `--no-install` creation leaves no lockfile. Run `npm install` before
starting development, or retry it in the generated directory after an installation
failure; generated source is preserved.
Use `npm ci` for later clean installs once your project has a committed lock.
Cloudflare Pages selection resolves Wrangler lock metadata even with
`--no-install` and therefore needs registry access. See the
[initializer reference](../packages/create-forge/README.md) for flags and
provider-specific requirements.

## Make the site yours

Edit `src/config/site.ts` for the name, description, author, repository, navigation,
and sharing image. Set the canonical default in `astro.config.ts`; the existing
`PUBLIC_SITE_URL` override selects environment-specific deployment settings. Replace the assets under `public/`
and customize `src/pages/index.astro` and `src/pages/about.astro`.

Use the complete production URL, including any project path such as
`https://example.github.io/my-site/`. Keep the existing URL helpers when linking
local pages so that the same source works at the root and under a deployment
base. Generated sites include article and CMS routes; the Forge project website
is a separate product and documentation site.

## Check and publish

Before requesting review or publishing, run the generated project's checks:

```sh
npm run quality
```

The pipeline checks static quality, coverage, build output, browser behavior,
accessibility, and Lighthouse budgets. Install the supported Playwright browsers
when prompted by the browser checks. Review the generated native CI files and
configure the selected provider's hosting and secrets before deployment.

## Own and maintain the source

Generated files are your application source. Do not regenerate over an existing
project: update npm dependencies deliberately and migrate template improvements
with review of your own changes. Each Forge package is independently versioned;
a generator update does not rewrite an existing application.
