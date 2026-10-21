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
before a later key move with that key; initial and trailing document comments
stay in place. Blank-separated comments between keys have ambiguous ownership
and prevent fixes. Each changed line receives one non-overlapping replacement;
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

Run `npm test --workspace @rm-industries/markdownlint-frontmatter` for public API
coverage, and `npm run test:packed --workspace @rm-industries/markdownlint-frontmatter`
for an isolated consumer test of the built npm artifact.
