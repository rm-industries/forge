# Package and candidate validation impact

The shared impact action now selects local workspaces by their actual consumption.
It supersedes the broad package fallback in [the first isolation step](ci-selection-372.md).
Root formatting, code/Markdown lint, spelling and documentation checks still run.
Other root tests and types run whenever package execution is selected.

| Changed input                                                       | Package build, pack and runtime checks  | Other selected consumers                                                     |
| ------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/content-model/**`                                         | content-model, markdownlint-frontmatter | Explicit packed frontmatter/CMS and browser serialization candidates         |
| `packages/markdownlint-frontmatter/**`                              | markdownlint-frontmatter                | Explicit packed model/frontmatter and CMS candidate                          |
| `packages/browser-oxfmt/**`                                         | browser-oxfmt                           | Rust quality, native reproducibility, packed browsers and CMS serialization  |
| `packages/create-forge/**`                                          | create-forge                            | Packed CLI, isolated registry-pinned consumers and generated workflow checks |
| `templates/default/**`                                              | create-forge                            | Generated consumers and native CMS/browser integration                       |
| `website/**`, `docs/**`                                             | None                                    | Website, including documentation content                                     |
| Shared root config, lock, scripts, workflows, setup, unknown inputs | All four                                | All validation lanes                                                         |

Frontmatter unit tests import local content-model source, so model changes select those
tests. The explicit candidate lanes intentionally combine the local model with
frontmatter ordering and native CMS serialization. They prove compatibility of those
candidates; they neither substitute them into the registry-pinned generated consumer
nor imply a consumer release. Website has no local package dependencies. Build and pack
jobs operate on the same selected workspace list; runtime jobs inspect those artifacts
and restore native bindings only when browser-oxfmt was built. Existing packed-consumer
checks still install the emitted consumer's own lockfile without a candidate overlay.

Mixed changes union the consumers. Git diffs disable rename collapsing so both old
and new paths participate; deletions remain inputs. Missing revisions, empty change sets
and unknown ownership request broad work. Actual diff errors fail selection. Weekly
and manual events without revisions request broad validation. The website action also
exposes a full-browser flag: only complete docs Markdown changes can narrow its matrix.

The existing 27 required contexts, permissions and release gates remain unchanged.
New candidate checks feed Tool validation; all required contexts and summaries reject
failed, cancelled, skipped or missing prerequisites. Reverting this change restores
broad package execution without changing protected context names. No branch protection,
publication, dependency-resolution or independent-release policy changed.

Local validation exercises the representative routing matrix, selected workspace
commands, failure propagation, packed public frontmatter/model declarations and consumer
behavior. Live provider execution and timing still require authorized workflow runs.
