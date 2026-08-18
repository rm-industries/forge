# 0002: Ship one default template in v1

- Status: Accepted
- Date: 2026-08-18
- Roadmap: [FGE-001](https://github.com/rm-industries/forge/issues/1)

## Context

Multiple templates multiply the compatibility, accessibility, security, test,
and documentation surface before the product contract is stable.

## Decision

Forge v1 ships exactly one supported template at `templates/default/`: a
content-driven Astro static site. The CLI may retain a template-selection seam,
but v1 must not advertise or carry additional templates.

## Consequences

All validation and documentation can target one coherent experience. New
templates require a later ADR that defines their ownership, support guarantees,
and test matrix. Configuration within the default template is preferred over
near-duplicate template variants.

## Rejected alternatives

- Shipping several framework or feature variants would dilute v1 quality.
- Generating a site from many optional fragments would create a large,
  difficult-to-test configuration matrix.
- Embedding a single unnamed template inside generator source would prevent
  isolated template development and validation.
