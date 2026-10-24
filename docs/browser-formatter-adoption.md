# Existing-site browser formatter adoption

Use published browser-oxfmt `0.1.2` with Oxfmt `0.74.0`, content-model
`1.1.10` and Sveltia CMS `0.251.0`. The formatter's
[verified release and remaining evidence](reviews/browser-formatter-release.md)
are recorded separately. Adoption is a reviewed source change to an owned site;
package publication does not authorize deployment or regeneration.

## Ordered migration

1. Commit the site's current source and lockfile. Record its working CMS save
   behavior and current package versions. Keep rollback available throughout.
2. Install content-model `1.1.10` and Sveltia CMS `0.251.0` together. Native
   serialization requires the bound callback introduced in Sveltia `0.250.0`;
   content-model `1.1.10` accepts CMS `>=0.193.2 <0.252.0`. Older compatible CMS
   versions alone do not provide the callback required by this integration.
3. Install browser-oxfmt `0.1.2` directly in the site, align Oxfmt exactly to
   `0.74.0`, and commit the site's lockfile. Do not rely on Forge root workspaces
   or a global installation for the site's dependencies.
4. Review the template's formatter integration as a source patch. Derive browser
   options at build time from the site's authoritative Oxfmt config and
   EditorConfig; never maintain a separate handwritten browser formatting policy.
   Resolve physical Markdown host paths, not virtual fenced-code filenames.
   Request `requireUniformPolicy: true` for the global CMS callback, which lacks
   filename and collection context; prove the policy covers future Markdown
   paths, not only existing articles. Use the standalone site root.
   Unsupported settings and version mismatches must fail with diagnostics.
5. Apply only the reviewed admin/CMS serialization and asset-loading source
   changes. Preserve collection declarations, schema, field order, draft state,
   frontend content handling, and existing editor configuration. Do not regenerate
   or overwrite the project. Wire formatting into Sveltia's bound native
   serialization callback and retain its recoverable failure behavior. A rejected
   formatter blocks the tested save; it does not substitute unformatted output.
   Do not replace save operations or mutate a live editor to trigger formatting.
6. Build the site using its own installation and lockfile. Verify worker/WASM
   assets load under its deployment base path and actual CSP. Use the
   [package deployment contract](../packages/browser-oxfmt/README.md) for loading,
   supported languages/options, and resource limitations. Native CSS formatting
   stays enabled, but browser formatting preserves Tailwind class order; repository
   Oxfmt can reorder those classes. Review that expected difference explicitly.
7. Run the site's existing checks, then exercise real CMS saves with front matter,
   supported fences, unknown-language preservation, repeated and large edits,
   formatter/worker failures and recovery. Confirm the failed save remains
   recoverable without losing content. Run the required desktop browser suite
   and record actual macOS Safari/iPhone Safari coverage, including
   background/resume. The 0.1.2 publication waiver is limited to publication;
   the current maintainer iPhone attestation and unspecified device details are
   recorded in the readiness review.
8. Review the final content diff and publish only through the site's existing
   deployment process after maintainer approval. Package installation and local
   builds do not authorize production deployment.

For a site with the default Forge scripts, the standalone boundary is:

```sh
npm ci
npm run quality:static
npm run test:coverage
npm run build
npm run validate:build
npm run test:e2e
```

Use the site's actual scripts if it has evolved. The Forge project site uses
`npm ci --prefix website` and its own scripts/lockfile; a successful root build
is not project-site adoption evidence. Review the source patch and actual CMS integration results before adopting it.
The #348 template integration is being validated separately from the published
package; no existing site is automatically updated by this release.

## Rollback

Stop rollout if serialization changes content unexpectedly or a browser cannot
recover from failures. Restore the prior reviewed admin/CMS source patch,
package manifests, and lockfile from the migration commit, reinstall with
`npm ci`, and rebuild. Test saves again before deployment. Retain the existing
content: do not discard editor drafts or restore content files merely to revert
formatter wiring. If content has already been committed, review those diffs
separately with the owner. An already published npm version remains immutable;
ship a new corrective version rather than overwriting or recreating its tag.
