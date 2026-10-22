# Browser formatter security feedback

## Inline probe configuration (CodeQL 176)

The Sveltia compatibility harness previously interpolated JSON into a script tag.
JSON serialization alone does not escape HTML script termination. Configuration
and scenario mode now travel as Playwright `addInitScript` arguments, and the
served module script contains constant code. No configuration is inserted into
HTML or JavaScript source.

## Dedicated worker messages (CodeQL 181 and 186)

The formatter uses a dedicated module worker constructed by its owner, rather
than a Window message listener. Other windows cannot address this private worker
channel through `window.postMessage`; checking a Window origin would reject
ordinary worker messages, whose origin is empty. No ports are transferred or
forwarded to other windows. Incoming messages still receive validation before
native code loads: request IDs must be nonnegative safe integers, source must be
text, and options must pass the same bounded configuration validator as the
public API. Malformed envelopes are ignored, and identifiable invalid options
receive a configuration error. Unit tests cover both rejection and successful
messages without a Window origin. Alert 186 was individually dismissed as a false positive with this rationale.
There is no query or scanner suppression.

## Native source downloads (CodeQL 180, 184 and 185)

The custom archive downloader was removed. Cargo now resolves HTTPS Git
dependencies pinned to the supported Oxfmt revision and locked registry
packages. Dependabot can inspect this graph directly without generated local
path dependencies. Native builds use `--locked`; build metadata verifies the
Oxfmt revision before recording artifact identity. Dependency fetching and
integrity checks belong to Cargo rather than a second downloader in our code.

Historical review comments remain visible even after their code is removed.
The dedicated-worker finding was individually dismissed as documented above;
no global scanner suppression is used.
