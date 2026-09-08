# Lighthouse performance budget

Lighthouse CI protects the generated site's public-page baseline. Run
`npm run lighthouse:ci` after changes that can affect rendering, assets,
metadata, or client behavior. The command builds the production site, collects
three reports per route from Astro's preview server, and evaluates the median
result. The typed runner derives Astro's optional deployment base from
`src/config/site.ts`, ensuring project-path assets and routes are measured at
their production-relative locations.

## Enforced routes

- `/` represents the landing-page layout and card content.
- `/features/` represents a denser reusable-component route and typography.

The about and custom 404 pages reuse the same public layout with smaller or
equivalent resource profiles and remain covered by browser and accessibility
tests.

## Category thresholds

| Category       | Minimum |
| -------------- | ------: |
| Performance    |      90 |
| Accessibility  |     100 |
| Best practices |      95 |
| SEO            |      95 |

Accessibility remains at 100 because FGE-063 separately enforces serious and
critical axe findings. The other thresholds allow ordinary Lighthouse runtime
variance while still failing a meaningful regression.

## Transfer budgets

| Resource | Maximum bytes | Rationale                                                           |
| -------- | ------------: | ------------------------------------------------------------------- |
| Script   |             0 | The public template ships no client JavaScript.                     |
| Total    |       170,000 | Approximately 10% headroom above the measured 154,453-byte maximum. |

The 2026-09-08 project-website baseline used Lighthouse 12.6.1 and three CI
Chromium runs per route. Script transfer remained zero bytes. Total transfer was
stable at 154,453 bytes for home, 154,385 bytes for getting started, and 130,360
bytes for features. These measurements reflect the maintained Forge website,
including its local fonts and project documentation, rather than the smaller
generated-site template.

The total budget leaves room for minor generated-content and toolchain variance
without allowing an unreviewed asset or client bundle. Do not raise a threshold
or exclude a route merely to make CI pass. If a product requirement deliberately
changes the budget, record the new three-run measurements, explain the user
benefit and cost, and review the change in its pull request.

## Dependency note

`@lhci/cli` 0.15.1 pins Lighthouse 12.6.1. Forge keeps that upstream-tested
dependency graph instead of overriding Lighthouse or its transitive
dependencies independently. Upgrade the top-level Lighthouse CI package when a
release supports a newer Lighthouse runtime, then repeat the three-run
collection and assertion compatibility checks.

The pinned graph currently includes high-severity `extract-zip` and `tmp`
advisories. Both are confined to development-only Lighthouse tooling:
Lighthouse uses the installed browser rather than extracting an
attacker-provided browser archive, and its temporary paths are tool-controlled.
`audit-ci.jsonc` records narrow, expiring exceptions for those two advisory IDs.
All other high or critical advisories still fail `npm run audit`. Review or
remove the exceptions by 2026-11-30 rather than extending them automatically.
