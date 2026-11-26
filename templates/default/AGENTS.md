# Working on this Forge site

Use Astro and TypeScript for routes and components. Compose public pages with
[BaseLayout.astro](src/layouts/BaseLayout.astro) and add client-side JavaScript
where an interaction needs it.
Use Tailwind CSS utilities, daisyUI components, and semantic colors such as
`bg-base-100` and `text-base-content`. Follow the Catppuccin themes and check
UI changes in both light (Latte) and dark (Mocha) modes.

## Reusable components

The starter components are examples you can reuse, adapt, or replace. To add
a reusable component, create a PascalCase `.astro` file under `src/components/`
and group it by responsibility. For example, put a `Callout.astro` in
`src/components/ui/`. Define typed props for inputs and use slots for content
the caller supplies. Import the component into the pages or layouts that use it.

## Where to edit

- Edit [src/config/site.ts](src/config/site.ts) for site identity and navigation.
- Add or edit routes in `src/pages/`.
- Put Markdown articles in `src/content/articles/`. Match the existing front
  matter and set `draft: false` for articles that should appear in production.
- Change article fields in the shared
  [article model](src/config/content-models/articles.ts). Astro derives
  collection validation in [src/content.config.ts](src/content.config.ts), and
  [the Sveltia configuration](src/integrations/sveltia/config.ts) derives the
  editor fields from the same model. Check existing Markdown against the new
  contract and update entries when a field change requires it.

Let `npm run build` generate `dist/` from source.

## Checks by change

- Articles: run `npm run lint:markdown` and `npm run build`. For a published
  article, confirm it appears in the article index and has a page in `dist/`.
- Article fields: run `npm run typecheck`, `npm run test:unit`, and
  `npm run build`. Verify existing Markdown builds and the Sveltia field
  configuration reflects the model change.
- Routes and UI: run `npm run typecheck`, `npm run build`, and
  `npm run validate:build`. Review changed pages with `npm run dev` and run
  `npm run test:a11y` for changes to layout or interactions.

See the [README](README.md) for setup and detailed workflows and
[package.json](package.json) for dependency versions and available scripts.
