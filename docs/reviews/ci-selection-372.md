# GitHub validation isolation

Project and generator workflows select impact on every pull request and main push.
Only a complete nonempty set of paths under `website/` and `docs/` skips package
and generator execution. Root formatting, code lint, Markdown lint, spelling and
documentation validation still run. Documentation feeds website pages, so website
validation remains necessary. Shared, mixed and unknown paths retain broad checks.
Renames include both paths; additions and deletions participate in the same selection.
Missing event revisions fall back to broad work; an actual Git diff error fails selection.

No existing required context was renamed or removed. Each unaffected context starts
and reports success explicitly. Each context checks selection and all its prerequisites;
failed, cancelled, skipped or missing prerequisite results cannot become successful
no-ops. Selection itself appears as **Select validation impact** in each workflow.
There is no repository-settings migration in this change. The 27 required contexts
recorded in [the baseline](ci-baseline-367.md) remain the protection contract.

To roll back, revert the selection commit; the original broad execution and context
names return together. Any future consolidation of required contexts needs a separate
approved protection migration. Local workflow contracts validate selection and guard
behavior; live GitHub runs are still needed to establish runner and protection behavior.
