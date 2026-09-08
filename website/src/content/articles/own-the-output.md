---
title: Own the output
description: Why Forge generates ordinary project source instead of creating a permanently managed installation.
publishedAt: 2026-09-04
tags:
  - Architecture
  - Ownership
draft: false
---

Forge is responsible for creating a coherent starting point. After generation,
the source belongs to the project that contains it.

That boundary keeps the result understandable. Teams can inspect every route,
component, configuration file, dependency, and workflow without depending on a
hosted Forge service or a hidden update layer.

## Updating an existing project

- Update compatible content-model behavior through npm.
- Review template improvements and migrate the pieces that fit.
- Never regenerate over customized source.

Ownership requires deliberate maintenance, but it also means the site can keep
evolving when its needs no longer match the original template.
