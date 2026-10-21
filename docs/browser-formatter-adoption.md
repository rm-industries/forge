# Existing-site browser formatter adoption

This is a maintainer-controlled migration, not a published installation recipe.
Content-model `1.1.9` and browser-oxfmt `0.1.0` are unpublished candidates.
Do not replace a generated project's dependencies with these versions until
registry verification and the [release gates](reviews/browser-formatter-release.md)
are complete. The template integration and authoritative configuration helper
must also be validated before their source changes can be adopted.

## Ordered migration

1. Commit the site's current source and lockfile. Record its working CMS save
   behavior and current package versions. Keep rollback available throughout.
2. Adopt the published, verified content-model compatibility release first.
   Native serialization requires Sveltia CMS `0.250.0` and content-model `1.1.9`.
   Its peer policy preserves `>=0.193.2 <0.246.0` and adds
   `>=0.250.0 <0.251.0`; versions `0.246`–`0.249` remain excluded.
3. After the browser formatter release is verified, install the exact reviewed
   browser-oxfmt version as a direct dependency of the site and commit its lock.
   Keep Oxfmt `0.72.0` aligned with the package's engine identity. Do not rely on
   Forge root workspaces or a global installation for the site's dependencies.
4. Review the template's formatter integration as a source patch. Derive browser
   options at build time from the site's authoritative Oxfmt config and
   EditorConfig; never maintain a separate handwritten browser formatting policy.
   Resolve physical Markdown host paths, not virtual fenced-code filenames.
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
   and actual macOS Safari/iPhone Safari checks, including background/resume.
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
is not project-site adoption evidence. Final commands and source patches must
match the approved integration candidate, not an earlier feasibility prototype.

## Rollback

Stop rollout if serialization changes content unexpectedly or a browser cannot
recover from failures. Restore the prior reviewed admin/CMS source patch,
package manifests, and lockfile from the migration commit, reinstall with
`npm ci`, and rebuild. Test saves again before deployment. Retain the existing
content: do not discard editor drafts or restore content files merely to revert
formatter wiring. If content has already been committed, review those diffs
separately with the owner. An already published npm version remains immutable;
ship a new corrective version rather than overwriting or recreating its tag.
