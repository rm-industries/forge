# Lighthouse performance budget

Lighthouse CI protects the generated site's public-page baseline. Run
`npm run lighthouse:ci` after changes that can affect rendering, assets,
metadata, or client behavior. The command builds the production site, collects
three reports per route, and evaluates the median result.

## Enforced routes

- `/` represents the landing-page layout and card content.
- `/articles/` represents a content collection and repeated cards.
- `/articles/designing-a-calm-starting-point/` represents rendered Markdown,
  typography, tags, and article pagination.

The about and custom 404 pages reuse the same public layout with smaller or
equivalent resource profiles and remain covered by browser and accessibility
tests. The `/admin/` route is intentionally excluded: it loads the pinned
third-party Sveltia editor application and is not representative of public
visitor performance. Reassess that editor separately before deploying it for a
specific team.

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
| Total    |       125,000 | Approximately 24% headroom above the measured 100,675-byte maximum. |

The 2026-08-30 baseline used Lighthouse 13.4.1 and three local Chromium runs per
route. Every run scored 99 performance and 100 for accessibility, best
practices, and SEO. Script transfer was zero bytes. Total transfer was stable at
100,675 bytes for home, 100,447 bytes for the listing, and 100,498 bytes for the
article detail.

The total budget leaves room for minor generated-content and toolchain variance
without allowing an unreviewed asset or client bundle. Do not raise a threshold
or exclude a route merely to make CI pass. If a product requirement deliberately
changes the budget, record the new three-run measurements, explain the user
benefit and cost, and review the change in its pull request.

## Dependency note

`@lhci/cli` 0.15.1 currently declares an older Lighthouse runtime. The template
uses npm overrides for Lighthouse 13.4.1, `tmp` 0.2.7, and `uuid` 11.1.1 so the
installed graph passes the high-severity dependency audit. Keep the overrides
until Lighthouse CI publishes an equivalent patched dependency graph; remove
them only after `npm audit`, three-run collection, and assertion compatibility
all pass without them.
