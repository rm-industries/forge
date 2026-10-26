# Maintain and upgrade your site

A generated site is owned source. A newer generator creates new projects; it
never upgrades yours. Do not regenerate over an existing directory to obtain
new features. Commit a working baseline and compare selected template changes
with your own pages, configuration, content and native CI before applying them.

## Dependency updates

Use `npm install` when deliberately changing dependencies, review both the
manifest and consumer-owned lockfile, and commit them together. Use `npm ci`
for subsequent clean installations. Do not delete the lock to bypass errors.
Dependabot updates your dependencies and action pins independently of Forge.
Review release notes, licenses, lifecycle scripts, security findings and changed
output before merging an update.

Keep Astro and Sveltia inside the installed content-model package's tested peer
ranges. A successful installation is not compatibility evidence; do not widen
peer claims locally. Install a compatible published content-model release first.
The four Forge packages have independent versions and migration requirements.
The standalone frontmatter lint package is optional; installing a generator
does not activate it in an existing site.

## Source migrations

Adopt improvements in small reviewed changes. Preserve your content schema,
editor configuration, drafts and deployment settings. Follow the
[browser formatter migration](browser-formatter-adoption.md) for existing CMS
formatting and the [frontmatter adoption fixture](../fixtures/frontmatter-adoption/README.md)
for selective key-ordering integration and rollback limits.

Run `npm run audit` and `npm run quality`, inspect the production preview and
exercise affected CMS saves before authorizing deployment. Preserve a tested
rollback commit; reverting tooling must not discard content or editor drafts.
See [quality and troubleshooting](quality-and-troubleshooting.md) and
[compatibility](support-policy.md) when an update fails.
