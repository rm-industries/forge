# Delivered test ownership

This disposition implements [ticket 376](https://github.com/rm-industries/forge/issues/376)
under [spec 367](https://github.com/rm-industries/forge/issues/367). Generated projects own
all their scripts, tests and YAML after bootstrap. No regeneration is required.

## Retain, move and remove

| Existing delivered tests                                                   | Decision     | Behavior and maintenance rationale                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/site.test.ts`, `deployment.test.ts`                            | Retain       | Validate configuration, URL trust boundaries, environment overrides and CMS branding derived from current site configuration.                                                                                          |
| `src/config/content-models/registry.test.ts`, `src/content.config.test.ts` | Retain       | Protect the shared content model and Astro collection contract rather than example article values. Adapt with intentional model changes.                                                                               |
| `src/integrations/sveltia/{config,preview-collections,previews}.test.ts`   | Retain       | Protect CMS authentication/configuration, model-derived fields and configured preview registration. Move exact article/tags shape and preview classes into Forge fixtures.                                             |
| `src/lib/{articles,paths,navigation}.test.ts`                              | Retain       | Protect draft exclusion, ordering, pagination boundaries, deployment paths and link classification with synthetic content.                                                                                             |
| `src/themes/site-theme.test.ts`                                            | Retain       | Derive expectations from configured flavors; no fixed Latte/Mocha obligation. Remove with the Catppuccin implementation if replacing the theme system.                                                                 |
| `scripts/documentation-examples.test.ts`                                   | Retain       | Checks that the local documentation matches the shipped CMS/configuration contract.                                                                                                                                    |
| `scripts/validate-build.test.ts`                                           | Retain/adapt | Require infrastructure outputs and reject unresolved bootstrap tokens. Optional About and example article paths are no longer required. The replacement-route case guards this boundary.                               |
| `scripts/run-lighthouse.test.ts`                                           | Retain/adapt | Protect root/nested preview URL mapping. Audit current internal navigation rather than one starter article slug; accessibility browser coverage includes all built public pages.                                       |
| `tests/accessibility.spec.ts`                                              | Retain/adapt | Discover built public HTML pages; protect serious/critical axe violations in light/dark modes, main/heading landmarks and small-screen overflow after content or route edits.                                          |
| `tests/accessibility.spec.ts` starter interaction assertions               | Move         | Forge fixtures retain named navigation, skip-link keyboard behavior, mobile menu and reduced-motion CTA coverage against the unmodified starter. Consumers can use these as patterns for their replacement components. |
| `tests/navigation.spec.ts`                                                 | Move         | Forge fixtures retain starter navigation, named routes/headings and article pagination. These assertions do not ship.                                                                                                  |
| `tests/theme.spec.ts`                                                      | Move         | Forge fixtures retain fixed Catppuccin colors/flavors, local font loading and starter focus styling. Axe remains shipped; replacement widgets still need their own keyboard/focus tests.                               |
| `tests/routes.spec.ts`                                                     | Retain/adapt | Check metadata against site configuration, CMS noindex, internal link resolution, feed/crawler/manifest availability and HTTP 404 status. Discover pages from output rather than pinning article slugs.                |
| `tests/routes.spec.ts` starter values                                      | Move         | Forge fixtures retain attribution, tags, example feed/draft values and named 404 recovery. Remove duplicated exact-text expectations from consumers.                                                                   |
| `tests/smoke/deployment.spec.ts`                                           | Retain/adapt | Verify the real deployed page/assets, heading and mobile overflow. Remove fixed generator attribution because README explicitly permits its removal.                                                                   |

The baseline proposed moving article and theme unit suites. Inspection showed their
fixtures are synthetic and their color/default expectations derive from current configuration;
retaining those functional contracts protects draft handling and supported theme selection
without fixing starter names, routes or colors. Exact article/tag/preview/documentation
values are split into Forge fixtures as proposed.

## Integration evidence and adaptation boundary

The existing packed-generator end-to-end harness runs the isolated default project's public
`test`, `build`, `validate:build` and Chromium `test:e2e` commands. Only that default fixture
receives Forge's starter browser regression files from
`packages/create-forge/fixtures/starter-tests/`; those files are outside the published package.
Starter unit fixtures under `packages/create-forge/fixtures/starter-unit/` are also copied
into the default project only, protecting the example registry/tags, preview classes and
documentation snippet. The harness then removes both fixture sets, renames About to Studio,
changes a published article title/slug,
and selects another dark flavor. The same consumer commands must pass, and the built edited
article/new route must exist while the old About output is absent. This covers actual emitted
source and registry-pinned dependencies, without overlaying local package candidates.

The existing Forge CMS frontmatter preservation/integration checks remain responsible for
serialization and editing-to-build regressions; this change does not replace or duplicate them.
CMS unit contracts and configuration remain delivered. No CMS security or preservation assertion
is removed. A browser suite does not establish live GitHub/GitLab execution or branch protection.

Ordinary content/design edits should not require updating example names, slugs or palette values
in delivered browser/build checks. Changes to capabilities still need deliberate adaptation:
removing RSS, moving the CMS, changing content models, replacing theme implementation or replacing
SEO metadata changes the relevant contracts. Keep accessibility/security checks and add behavioral
keyboard tests for your own interactive controls. Lighthouse budgets and navigation remain plain
consumer-owned configuration; audit added routes and adjust budgets only for intended product needs.
