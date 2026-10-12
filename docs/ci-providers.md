# CI provider definitions

Forge models site work in TypeScript and validates the work graph with Zod.
Provider renderers preserve native GitHub permissions, environments and outputs,
and GitLab rules, stages and artifact transfer. Serialized YAML is parsed and
validated before writing. The schemas cover the fields Forge emits, rather than
the entire provider specifications.

Hosted consumers reuse build artifacts instead of executing prerequisites again.
GitHub retains same-run Pages deployment after the Project aggregate. GitLab
provides validation here; switchable deployment follows in a separate review.

Action pins are read from existing workflows, preserving Dependabot updates and
rejecting conflicting or mutable references. Packaged bootstrap defaults and CLI
integration follow in the next review.

Run `npm run test:root` to validate graph, provider, serialization and pin contracts.
