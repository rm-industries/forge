# 0004: Materialize a copied template with explicit tokens

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1), [FGE-052](https://github.com/rm-industries/forge/issues/20)

## Context

The generator must preserve a complete standalone project, customize a small
set of values, and avoid corrupting binary assets or existing user files.

## Decision

Materialize projects by recursively copying `templates/default/`, including
dotfiles, then replacing a documented allowlist of collision-resistant tokens
in known UTF-8 text files. Treat all other files as opaque bytes. Normalize
package metadata through structured parsing rather than broad text replacement.

Resolve and validate every source and destination path within its expected
root. Refuse traversal and symlink escapes. Refuse a non-empty destination
unless the user explicitly confirms; even after confirmation, never silently
overwrite an existing file. Track files created by the invocation so rollback
removes only those files when doing so is safe.

## Consequences

The checked-in template is directly inspectable and testable. Adding a token
requires updating the allowlist and tests. Materialization needs explicit cases
for binary files, dotfiles, collisions, interruption, and unsafe paths.

## Rejected alternatives

- Rendering every file through a template engine risks changing binaries and
  literal syntax.
- Global search-and-replace can mutate unintended content.
- Downloading a remote template at runtime harms reproducibility and offline
  use.
- Force-copying into existing directories risks data loss.
