# Changelog

All notable changes to `@rm-industries/content-model` are documented here.

## 1.0.0

- Promote the reviewed content-model API and its root, `astro`, and `sveltia`
  exports to the first stable release without behavioral or type-level changes
  from `1.0.0-rc.1`; no consumer migration is required.
- Support Astro `^7.2.3`, Sveltia CMS `>=0.203.2 <0.204.0`, Node.js
  22.22.2/24/26, and npm 10/11. Astro and Sveltia remain optional peers so
  consumers install only the adapters they use.
- Keep peer ranges intentionally narrow because Sveltia remains pre-1.0 and
  adapter compatibility is expanded only after Forge validation. Generated
  projects are owned source and are not updated automatically by this package.
- Report reproducible defects and feature proposals through Forge GitHub Issues;
  report vulnerabilities privately through the repository security policy.

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
