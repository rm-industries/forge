# Compatibility and support

Forge supports declared and tested combinations. Check each installed package's
`engines` and `peerDependencies`; independent packages can have different needs.

## Node.js and npm

The create-forge 2.0 generator, repository tooling and newly generated sites support Node.js `^22.23.4 || ^24.0.0 || ^26.0.0`
and npm `^10.9.0 || ^11.0.0`. Use a patched supported release. Other package
managers, older Node versions and experimental builds are unsupported.
Independently released content-model, browser-oxfmt and frontmatter lint packages
retain their published `^22.22.2 || ^24.0.0 || ^26.0.0` contracts; inspect each
installed package's engines before upgrading. The Forge project website
separately requires Node 26 for build tooling; this
does not change generated sites or visitor browser requirements.

## Platforms and browsers

Ubuntu LTS is the primary CI platform. macOS on supported Apple releases is
supported for creation, installation, build and Git initialization. Windows,
WSL and other Unix systems are best effort; reproduce defects on a supported
platform when possible.

Public generated sites target the latest two stable major releases of Chrome,
Edge, Firefox, Safari on macOS/iOS and Chrome on Android. Core navigation and
content remain available without JavaScript. The automated suite uses the exact
committed Playwright Chromium, Firefox and WebKit builds; emulation does not
prove every physical device or Safari-specific behavior.

Sveltia has its own editor requirements. Its local directory picker needs a
Chromium-based browser. Browser formatter adoption needs testing against actual
CMS saves, including Safari and mobile background/resume behavior; see the
[adoption guide](browser-formatter-adoption.md).

## Dependencies and versions

The template has no committed or delivered lock. New projects resolve reviewed
ranges with `npm install`, then own and commit the resulting lock for `npm ci`
replay. Root and website authoring locks remain committed. Keep generated-site
manifests and locks together. Content-model declares tested
Astro and Sveltia peers; pre-1.0 Sveltia minor updates can break compatibility.
Do not widen a peer range merely to install an update. Native action pins use
full immutable SHAs with readable version comments.

The four packages release independently using semantic versions: breaking
changes before 1.0 require a minor and migration notes; after 1.0 they require a
major. Compatible capabilities use minor versions and fixes use patches.
Runtime increases, removed peers, changed CLI/defaults and changed lint/fix
contracts can be breaking. Stable releases use `latest`; prereleases use `next`
and require explicit adoption. Generated source does not update automatically.

## Support and security

Report reproducible defects with versions, operating system, command and safe
minimal reproduction through [GitHub Issues](https://github.com/rm-industries/forge/issues).
Remove secrets and private content. Report vulnerabilities privately through
[SECURITY.md](../SECURITY.md). A local successful build does not waive dependency
audits, provider checks or release approval. See [upgrades](upgrades.md) for safe
maintenance of existing sites.
