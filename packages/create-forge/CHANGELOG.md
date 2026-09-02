# Changelog

All notable changes to `@rm-industries/create-forge` are documented here.

## 0.4.0-beta.4

- Correct the bundled article-authoring example so following it passes the
  generated project's Markdownlint rules without duplicating the document title
  as a top-level heading.
- Add a regression test that keeps the documented article example aligned with
  the article layout's title ownership.
- Existing generated projects need no runtime migration. Projects created with
  beta.3 can remove a repeated top-level heading from articles copied from that
  guide, or copy the corrected guide from this release.

## 0.4.0-beta.3

- Add complete generated-project guides for setup, content and CMS workflows,
  themes, accessibility, quality troubleshooting, and GitHub Pages deployment.
- Refresh the bundled project README and maintainer-facing command guidance so
  public claims correspond to automated checks or explicit manual validation.
- Add repository documentation validation for internal links, heading anchors,
  critical commands, spelling, Markdown quality, and resilient external links.
- Existing generated projects remain unchanged; this release affects projects
  created from the new generator version. Users can copy the new guides without
  regenerating their project, and no runtime migration is required.

## 0.4.0-beta.2

- Add the bundled template's quality-gated GitHub Pages deployment, including
  project-path URL handling and custom-domain guidance.
- Harden generated-project automation with a conditional workflow-validation
  aggregate and strict Lighthouse evidence retention.
- Update the bundled template to Astro 7.2.9, DaisyUI 5.7.22, and Oxfmt 0.65.0.
- Update the generator runtime to Commander 15 without changing its documented
  command-line interface or supported Node.js versions.
- Existing generated projects remain unchanged; this release affects projects
  created from the new generator version. No migration is required for generator
  users.

## 0.4.0-beta.1

- Update the bundled default template to
  `@rm-industries/content-model@0.2.0-alpha.0` and its tested
  `@sveltia/cms@0.203.2` integration.
- Existing generated projects remain unchanged; this release affects projects
  created from the new generator version.

## 0.4.0-beta.0

- Add the interactive generator, deterministic materialization, rollback, and
  standalone template verification introduced for the quality beta.

## 0.3.0-alpha.0

- Publish the initial generator alpha with the default template snapshot.
