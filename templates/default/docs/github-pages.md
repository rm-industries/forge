# GitHub Pages deployment

The project workflow publishes the validated production build to GitHub Pages
after every push to `main`. Pull requests build and test the site, but they do
not upload a Pages artifact or run a deployment.

## Enable deployment

1. Open the repository's **Settings → Pages** page.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open **Settings → Environments → github-pages** after its first appearance.
4. Restrict deployment branches to `main`. Add required reviewers when the site
   needs a manual production approval.

The build job has read-only repository access. The separate deployment job is
the only job granted `pages: write` and `id-token: write`, and it depends
directly on every source, unit, build, validation, browser, and Lighthouse job.
After deployment, one Chromium smoke test verifies the live URL, assets, and
mobile layout.

## Choose the public URL

Set the canonical default in `astro.config.ts` to the complete public address.
Keep the existing `PUBLIC_SITE_URL` override and URL validation. Astro derives
the deployment base from this value, so canonical metadata, navigation,
assets, the RSS feed, the web manifest, and CMS branding use the same path.

For a project site, include the repository name:

```ts
const publicSite = new URL(process.env.PUBLIC_SITE_URL ?? 'https://owner.github.io/repository/');
```

For an organization or user site, use the root address:

```ts
const publicSite = new URL(process.env.PUBLIC_SITE_URL ?? 'https://owner.github.io/');
```

Run `npm run build && npm run validate:build` after changing the URL. Once the
workflow succeeds on `main`, its deployment summary links to the published site.

## Use a custom domain

Set the site URL to the custom origin without a repository pathname:

```ts
const publicSite = new URL(process.env.PUBLIC_SITE_URL ?? 'https://www.example.com/');
```

Add `public/CNAME` containing only the domain name, configure the same domain in
**Settings → Pages**, and create the DNS records GitHub documents for the chosen
domain. The template does not include a `CNAME` file because generated projects
do not share a domain. Enable **Enforce HTTPS** after GitHub verifies the DNS
configuration.

Do not configure both a repository pathname and a custom domain. A custom domain
is served from its root, while a project site uses the repository name as its
base path.

A project-path `robots.txt` is not the origin-root policy. Shared hosting must
serve applicable crawler directives at the origin root.
