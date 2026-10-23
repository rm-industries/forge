# Proposed GitHub required-check migration

Status: prepared for separate maintainer approval; no settings API writes, merge,
or production action performed. This is the exact replacement for the historical
27 contexts in the [baseline](ci-baseline-367.md), under the approved
[design](../superpowers/specs/2026-10-23-github-project-workflows-design.md).

Remove each requirement below and require the one always-running `Repository quality`
context. This is a removal/replacement map, not a claim that Repository quality
executes all historical work: project-specific checks become optional in protection
and must be reviewed before merge.

| Remove existing required context                     | Proposed required context |
| ---------------------------------------------------- | ------------------------- |
| `Tool Format`                                        | `Repository quality`      |
| `Tool Lint code`                                     | `Repository quality`      |
| `Tool Lint Markdown`                                 | `Repository quality`      |
| `Tool Spellcheck`                                    | `Repository quality`      |
| `Tool Documentation links and commands`              | `Repository quality`      |
| `Tool Type-check`                                    | `Repository quality`      |
| `Tool Test`                                          | `Repository quality`      |
| `Tool Build`                                         | `Repository quality`      |
| `Tool Pack`                                          | `Repository quality`      |
| `Tool Compatibility (minimum Node 22)`               | `Repository quality`      |
| `Tool Compatibility (latest Node 22)`                | `Repository quality`      |
| `Tool Compatibility (latest Node 24)`                | `Repository quality`      |
| `Tool Compatibility (latest Node 26)`                | `Repository quality`      |
| `Package generator candidate`                        | `Repository quality`      |
| `Consumer compatibility (minimum Node 22 on Ubuntu)` | `Repository quality`      |
| `Consumer compatibility (latest Node 22 on Ubuntu)`  | `Repository quality`      |
| `Consumer compatibility (latest Node 24 on Ubuntu)`  | `Repository quality`      |
| `Consumer compatibility (latest Node 26 on Ubuntu)`  | `Repository quality`      |
| `Consumer compatibility (latest Node 26 on macOS)`   | `Repository quality`      |
| `Consumer source quality`                            | `Repository quality`      |
| `Consumer build validation`                          | `Repository quality`      |
| `Consumer browser tests`                             | `Repository quality`      |
| `Consumer Lighthouse budgets`                        | `Repository quality`      |
| `Generated workflow security`                        | `Repository quality`      |
| `Generated workflow syntax`                          | `Repository quality`      |
| `Generator behavior scenarios`                       | `Repository quality`      |
| `Consumer quality tool regressions`                  | `Repository quality`      |

Also remove old `Tool validation`, `Generator validation`, `Website validation`, or
historical proposed summary names only if they have subsequently been configured.
They are not part of the baseline 27. Preserve unrelated security, review,
environment and publication protections. Do not use a settings write to bypass
unrelated requirements.

Coordinate the reviewed workflow merge and separately authorized settings change;
this branch intentionally stops producing the legacy jobs and may wait for missing
old checks until migration. Keep main's functioning pair intact until transition.
Inspect hosted check names, optional project failures, artifacts and main-push-only
deployment gates before proceeding. Rollback restores the matching historical
workflow graph and exact original required-context settings together. Neither
local contract tests nor this document is approval to perform that operation.
