# Changelog

## 0.1.0

- Add the independently versioned `forge/frontmatter-order` Markdownlint rule
  and `frontmatterOrderFromModel` helper.
- Preserve source blocks and body bytes during safe fixes; report unsupported
  YAML without edits. Require Markdownlint 0.42 and the supported Node/npm matrix.
- Provide per-collection CLI2 integration and a staged existing-site migration;
  publication and registry-based starter adoption remain separate release steps.
