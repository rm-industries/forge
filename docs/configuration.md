# Configure and customize your site

## Change the site identity

Edit `src/config/site.ts`. The exported `site` object is the single source for
editorial metadata, navigation, and CMS branding. Astro owns deployment settings.

```ts
export const site = defineSiteConfig({
  name: 'Example Studio',
  description: 'Notes about thoughtful product design.',
  author: 'Example Team',
  repository: 'example/example-site',
  language: 'en',
  socialImage: '/social-card.svg',
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles/' },
    { label: 'About', href: '/about/' },
  ],
  socialLinks: [{ label: 'GitHub', href: 'https://github.com/example' }],
});
```

Set the canonical default in `astro.config.ts`, keeping its existing validation and integrations.
`PUBLIC_SITE_URL` overrides that default for environment-specific builds; application code
reads Astro’s resolved settings. Use the complete public URL. A GitHub Pages project site includes
its repository path, for example `https://example.github.io/example-site`.
Root-hosted and custom-domain sites use only their origin. The
[GitHub Pages guide](deployment.md) explains each form.

Keep `repository` in `owner/repository` form. An empty value is valid while a
repository does not exist, but configure it before using the deployed CMS.

## Replace identity assets

- Replace `public/favicon.svg` with the browser icon.
- Replace `public/social-card.svg` with the default sharing image.
- Change `site.socialImage` when the sharing image has a different path. An authored
  string is a logical public path. For an Astro-imported asset, pass the native imported
  value, not its `src` string; Astro already mounts that compiled asset URL.
- Edit `src/pages/about.astro` and the homepage copy in
  `src/pages/index.astro` to describe the project.

Files under `public/` are copied to the production build without processing.
Reference them with site-relative paths and use the path helpers already used
by the template for logical routes when a component must support a project prefix.
Do not pass mounted request paths or imported asset URLs through logical prefixing.

## Add a page

Create an Astro file under `src/pages/` and compose the shared layout:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Contact" description="How to contact Example Studio.">
  <h1>Contact</h1>
  <p>Send us a message.</p>
</BaseLayout>
```

Add the route to `site.navigation` if it belongs in primary navigation. Do not
add another `main` element: `BaseLayout` already supplies the document shell,
skip link, landmarks, metadata, header, and footer.

## Verify the first customization

```sh
npm run quality:core
npm run dev
```

Inspect the homepage, the changed page, `/articles/`, and `/admin/` in the
browser. Run the complete `npm run quality` gate before opening a pull request.

Continue with [content and CMS editing](content-and-cms.md), then review
[themes and accessibility](themes-and-accessibility.md).
