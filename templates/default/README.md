# Forge site

This directory is a standalone Astro project and is intentionally excluded from
the parent npm workspace. Install and run all commands from this directory.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

Edit `src/config/site.ts` to change the site name, description, canonical URL,
language, navigation, social links, and derived CMS branding. The Astro
configuration, shared layout, and reusable SEO head consume this single
validated source. New pages should use `src/layouts/BaseLayout.astro` to inherit
the document shell and canonical metadata.

The initial template uses `https://example.com` as a valid, non-production site
origin. Generator-driven customization is introduced by later Forge milestones.
