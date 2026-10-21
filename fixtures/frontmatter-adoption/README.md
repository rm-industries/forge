# Frontmatter ordering release handoff

The starter, repository, and website use Markdownlint CLI2 0.24.0, which directly
uses Markdownlint 0.42.0 and its public frontmatter diagnostic/fix API. No
dependency override is needed.
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

## Native save and normalization proof

Run `npx playwright install chromium` once, then `npm run test:frontmatter:cms`.
The focused test serves the installed, unmodified Sveltia CMS distribution and
uses its native `test-repo` backend in a fresh Chromium context. It seeds OPFS,
edits metadata, raw Markdown, and rich text through the editor UI, and reads the
persisted files. Every save must pass the public Markdownlint rule configured
from the same model as the Sveltia collection. Draft state, unknown metadata,
missing optional description (with native `omit_empty_optional_fields` enabled),
bold text and link meaning are checked. Native default output can add an empty
optional value; omission is an editor output setting, independent of ordering. No save
hooks, serializer replacement, backend mocks, or fixed readiness sleeps are used.
This browser proof is an explicit
command because ordinary unit tests do not require downloaded browser binaries.

`normalization.before.md.txt` and `normalization.after.md.txt` record a reviewed,
representative article migration. The ordering fix moves complete field blocks;
the configured starter Oxfmt then changes the title's quote style. Comments,
parsed values, the unknown nested mapping, draft state and absent optional keys
survive. The Markdown body is unchanged in this fixture. Applying the public rule
and Oxfmt again must produce identical bytes. Initial header comments remain at
the top; later attached comments travel with their field.

Native CMS saves can normalize YAML representation and trailing body newlines;
rich text can normalize Markdown syntax. This proof checks the demonstrated body
meaning, not arbitrary byte preservation across rich-text editing. Before migrating
existing content, commit or back it up, run check before fix, inspect the complete
diff (including comments and editor normalization), then run formatting, check and
normal site validation. Roll back content by restoring that reviewed commit or
backup; disabling ordering alone does not undo reordered files. Keep schema,
Astro, accessibility and ordinary Markdown checks enabled. Publication and actual
starter activation still follow the release handoff above.
