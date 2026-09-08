# GitHub Pages deployment

The root project workflow invokes `.github/workflows/website-deployment.yml`
after every validated push to `main`. Pull requests build and test the site, but
they do not upload a Pages artifact or run a deployment. The called workflow
deploys the `website/dist` artifact produced by the existing coverage-and-build
job, then smoke-tests the public URL. It does not repeat the install, build, or
generated-output validation that the root `Project` gate already accepted.

## Enable deployment

1. Open the repository's **Settings → Pages** page.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open **Settings → Environments → github-pages** after its first appearance.
4. Restrict deployment branches to `main`. Add required reviewers when the site
   needs a manual production approval.

Forge Pages uses GitHub Actions as its source and enforces HTTPS. The RM
Industries organization custom domain also applies to this project site, so its
public URL is `https://www.rm-industries.com/forge/` and the corresponding
`rm-industries.github.io` project path redirects there.

The coverage-and-build job has read-only repository access and uploads a Pages
artifact only for an eligible `main` push. The separate deployment job is the
only job granted `pages: write` and `id-token: write`, and it cannot begin until
the complete `Project` quality gate succeeds. Deployment concurrency does not
cancel an in-progress production release, preventing a newer push from
interrupting a partially completed publication.

## Choose the public URL

Set `url` in `src/config/site.ts` to the complete public address. Forge derives
Astro's deployment base from this value, so canonical metadata, navigation,
assets and the web manifest use the same path.

For a project site, include the repository name:

```ts
url: 'https://owner.github.io/repository',
```

For an organization or user site, use the root address:

```ts
url: 'https://owner.github.io',
```

Run `npm run build && npm run validate:build` after changing the URL. Once the
workflow succeeds on `main`, its deployment summary links to the published site.

## Verify and trace a deployment

The workflow's `github-pages` environment records the deployment URL and commit.
The `github-pages` artifact contains only `website/dist`, and the final smoke job
requests every baseline section plus the manifest, sitemap, canonical metadata,
the Forge generator marker, and production 404 behavior. Browser accessibility
and Lighthouse thresholds remain blocking inputs through the root `Project`
gate.

To inspect or retry a deployment, open **Actions → Project Continuous
Integration**, select the push run, and follow **Deploy project website** into
the called workflow. Use **Re-run failed jobs** only after identifying a
transient Pages or network failure; code, quality, or generated-output failures
must be corrected through a pull request.

To roll back, revert the responsible commit on `main` through a reviewed pull
request. The successful validation and deployment of that revert publishes the
previous website state while preserving an auditable history. Do not deploy an
older artifact manually because it would separate production from the reviewed
commit recorded by the workflow.

## Use a custom domain

Set the site URL to the custom origin without a repository pathname:

```ts
url: 'https://www.example.com',
```

Add `public/CNAME` containing only the domain name, configure the same domain in
**Settings → Pages**, and create the DNS records GitHub documents for the chosen
domain. The template does not include a `CNAME` file because generated projects
do not share a domain. Enable **Enforce HTTPS** after GitHub verifies the DNS
configuration.

Do not configure both a repository pathname and a custom domain. A custom domain
is served from its root, while a project site uses the repository name as its
base path.
