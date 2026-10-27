# Markdownlint frontmatter ordering

`@rm-industries/markdownlint-frontmatter` provides the
`forge/frontmatter-order` Markdownlint rule. It has no Astro, Sveltia, or CLI
runner dependency. Markdownlint **0.42.0 or later in the 0.42 series** is required:
that version introduced the supported frontmatter diagnostic and fix API.

```js
import rule from '@rm-industries/markdownlint-frontmatter';
import { applyFixes } from 'markdownlint';
import { lint } from 'markdownlint/sync';

const source = '---\ndraft: false\ntitle: Hello\n---\nBody\n';
const errors = lint({
  strings: { 'article.md': source },
  customRules: [rule],
  config: {
    default: false,
    'forge/frontmatter-order': { orderedKeys: ['title', 'description', 'draft'] },
  },
})['article.md'];
const fixed = applyFixes(source, errors);
```

Keep Markdownlint's default frontmatter handling when combining this rule with
ordinary Markdown rules. The rule uses `frontMatter: true` on diagnostics and fixes
so source line numbers remain accurate and ordinary rules only see the body.
Checking does not write files. Applying fixes is the caller's responsibility.

`orderedKeys` must be an explicit array of unique nonempty strings. Present keys
follow that order; unknown keys follow afterward in their original relative
order. Missing keys stay missing. Neither draft state nor values are changed.

Fixes move original source blocks without YAML serialization. Quotes, nested
mapping order, scalar styles, multiline values, delimiters, body bytes, and
uniform LF or CRLF line endings are preserved. Contiguous comments immediately
before a key move with that key. Separate a document header from fields with
a blank line; comments before the first field without that separation are
ambiguous and prevent fixes. Trailing document comments stay in place.
Blank-separated comments between keys, including indented comments, also prevent
fixes. A proposed reorder is parsed again and refused if YAML values change
(for example, when a keep-chomp scalar would absorb trailing blank lines).
Each changed line receives one non-overlapping replacement;
ordinary body fixes can be applied simultaneously.

Duplicate keys, anchors, aliases, malformed YAML, ambiguous comments, complex
keys, and flow-style root mappings receive explanatory diagnostics without edits,
even if their keys already look ordered. Custom YAML tags are unsupported.
Absent and empty YAML frontmatter produce no diagnostics. Mixed newline styles
are outside the preservation guarantee because Markdownlint's fix API normalizes
line endings. Non-YAML frontmatter is ignored.

Markdownlint 0.41 cannot target stripped frontmatter through its public fix API:
its line validation is limited to body lines and adds the frontmatter offset.
Do not use this rule with that version or disable frontmatter parsing globally to
work around it; upgrade Markdownlint instead.

## Shared content models and CLI2

`frontmatterOrderFromModel(model)` returns `{ orderedKeys: Object.keys(model.fields) }`.
It uses the existing public content-model shape, excludes the separate `model.body`,
and follows the same insertion order as `createSveltiaCollection`. Use it once per
collection; changing the model changes both consumers. It adds no defaults or model
validation. The rule validates the resulting list. Explicit lists remain supported.

For a project using Markdownlint CLI2, put its configuration in `.markdownlint-cli2.mjs`:

```js
import rule, { frontmatterOrderFromModel } from '@rm-industries/markdownlint-frontmatter';

import { articleModel, pageModel } from './content-models.ts';

export default {
  customRules: [rule],
  config: { 'forge/frontmatter-order': false },
  overrides: [
    {
      filter: ['content/articles/**/*.md'],
      config: { 'forge/frontmatter-order': frontmatterOrderFromModel(articleModel) },
      combine: 'merge',
    },
    {
      filter: ['content/pages/**/*.md'],
      config: { 'forge/frontmatter-order': frontmatterOrderFromModel(pageModel) },
      combine: 'merge',
    },
  ],
};
```

CLI2 requires `.mjs` or `.cjs` configuration modules. The imported models and
maintained implementation code remain TypeScript.

If an existing `.markdownlint.json` is present, rename it to a non-config name
and import/spread its rules into the `config` above. CLI2 gives recognized
Markdownlint config files precedence over its `config` option. Leaving one in
place discards the rule configuration, including the default disable.

Load model modules supported by your Node runtime (or their compiled JavaScript).
Keep the rule disabled outside matching collections. CLI2 0.24.0 directly uses
Markdownlint 0.42.0; no dependency override is needed. Runner compatibility and model imports belong to the
consumer, not this generic package.

Content-model needs no release or compatibility change: this helper consumes its
existing `fields` property without importing or depending on content-model.
The packages remain independently versioned. Install the rule from npm with
`npm install --save-dev @rm-industries/markdownlint-frontmatter markdownlint@^0.42.0`.
Adopting its CLI2 configuration remains an explicit consumer change.

## Runtime and release contract

Supported engines are Node `^22.22.2 || ^24.0.0 || ^26.0.0` and npm
`^10.9.0 || ^11.0.0`. The required Markdownlint peer is `^0.42.0`;
CLI2 `0.24.0` is the tested runner. The package is ESM, exposes JavaScript and
TypeScript declarations at its root export, and ships only `dist` plus npm's
README, changelog, manifest, and MIT license metadata. YAML is its only direct
runtime dependency; it does not install content-model, Astro, or Sveltia.

The opening delimiter must be `---` on the first line; closing `---` and `...`
are supported. Non-YAML frontmatter is ignored. Keep the default Markdownlint
frontmatter handling and review diagnostics before applying fixes.

Version `0.1.0` is published on npm. See the
[existing-site migration and rollback](../../fixtures/frontmatter-adoption/README.md).
Existing sites adopt the configuration selectively; never regenerate over owned source.

Strict TypeScript consumers may need `markdown-it@15.0.3` because Markdownlint
0.42's public declarations reference that optional parser's types. The packed
consumer test installs this prerequisite explicitly without `skipLibCheck`.
JavaScript consumers do not need it, and it is not a plugin runtime dependency.
