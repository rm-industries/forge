# Changelog

All notable changes to `@rm-industries/content-model` are documented here.

## 1.0.0-rc.1

- Promote the reviewed integration-neutral model, runtime validation, Astro
  adapter, and Sveltia adapter contracts to the first 1.0 release candidate.
- Confirm compatibility with Astro `^7.2.3`, Sveltia CMS
  `>=0.203.2 <0.204.0`, Node.js 22.22.2/24/26, and npm 10/11 through the
  release-candidate matrix.
- Preserve the root, `astro`, and `sveltia` package exports without behavioral
  or type-level changes from `0.2.0-alpha.0`; no consumer migration is required.

## 0.2.0-alpha.0

- Validate @sveltia/cms 0.203.2 and update its supported peer range from `>=0.193.2 <0.194.0` to `>=0.203.2 <0.204.0`.

## 0.1.0-alpha.0

- Introduce integration-neutral content models, runtime validation, and Astro
  and Sveltia adapters.
