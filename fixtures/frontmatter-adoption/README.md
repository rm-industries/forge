# Frontmatter ordering release handoff

The starter, repository, and website use Markdownlint CLI2 0.23.3. Their narrow
npm override selects Markdownlint 0.42.0, whose public API supports frontmatter
fixes. Keep the override until a tested CLI2 version uses a compatible engine.
Existing Markdown rules, 120-character line length, code/table exceptions, root
`.gitignore` handling, and `lint:markdown` / `lint:markdown:fix` script names remain.
Each script performs one Markdown scan; CI quality commands retain those names.

**Ordering is not yet enabled in normal generated projects.** The plugin is
unpublished. The active starter deliberately has no dependency on an unavailable
registry package. This directory is a candidate adoption overlay, outside the
starter; it is not copied into generated sites. There is no optional import or
silent fallback.

After the maintainer publishes and verifies `@rm-industries/markdownlint-frontmatter@0.1.0`:

1. In the starter, run `npm install --save-dev --save-exact @rm-industries/markdownlint-frontmatter@0.1.0`.
2. Replace `.markdownlint-cli2.jsonc` with this directory's `markdownlint-cli2.mjs`, named `.markdownlint-cli2.mjs`.
   Rename `.markdownlint.json` to `.markdownlint-rules.json`; the overlay imports
   these ordinary rules. CLI2 gives a recognized `.markdownlint.json` precedence
   over its `config` option, so leaving it in place loses the collection settings.
3. Run `npm ci` in an isolated starter copy, then `npm run lint:markdown`,
   `npm run lint:markdown:fix`, and the normal template/generator verification.
   Review content diffs before committing the manifest, registry lock, and config.
4. Activate in a separate reviewed change. Existing sites should selectively copy
   the runner/configuration changes and install the published dependency; never
   regenerate an existing site to migrate it.

The configuration imports the starter's existing TypeScript model registry using
Node's native type stripping (the supported Node 22.22.2+ / 24 / 26 versions),
and derives each collection's order from that same model used by Sveltia.
The existing `**/*.md` scan remains unchanged (MDX is outside this gate).
Only matching `model.folder/**/*.md` content receives the ordering rule; ordinary
documentation keeps its normal checks. Missing optional keys remain absent,
unknown keys remain after known keys, and unsafe YAML fails without changes.
The generic plugin also supports explicit `orderedKeys` for projects without models.

Before publication, build the plugin and run the isolated candidate proof:

```sh
npm run build --workspace @rm-industries/markdownlint-frontmatter
node scripts/verify-frontmatter-adoption.mjs
```

The proof first installs the unchanged registry-only starter lock with `npm ci`,
then explicitly installs the packed candidate in the temporary copy. It runs the
real starter check/fix scripts against two model-derived orders, safe and unsafe
YAML, ordinary documentation, non-mutating check, and repeated fixes. Temporary
packed installation proves the handoff, not registry availability. No file or
workspace dependency is committed to the starter.

Rollback: restore the prior runner manifests, lockfiles and config together;
content already reordered remains valid YAML. After activation, removing the plugin
requires removing its import and overrides as well as the dependency. Keep ordinary
Markdown rules and formatting/validation gates in place.
