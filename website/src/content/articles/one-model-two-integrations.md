---
title: One model, two integrations
description: How one Forge content definition keeps Astro rendering and Sveltia CMS editing aligned.
publishedAt: 2026-09-03
tags:
  - Content
  - Sveltia
draft: false
---

A content field should mean the same thing when an editor enters it and when a
site renders it. Forge puts that contract in
`@rm-industries/content-model`.

The integration-neutral definition describes collections, fields, defaults,
validation, labels, and sorting. The Astro adapter derives collection schemas,
while the Sveltia adapter derives editor configuration from the same registry.

This does not remove the need to test either integration. It gives both sides a
shared source and makes differences explicit when upstream libraries evolve.
