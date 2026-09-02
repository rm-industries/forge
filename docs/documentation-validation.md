# Documentation validation

Forge treats documentation as a tested part of the product. Pull requests and
pushes run deterministic checks for Markdown formatting, Markdown style,
spelling, internal links and anchors, and the critical commands used to create,
validate, and release Forge projects.

Run the same checks locally:

```sh
npm run docs:check
```

The internal-link validator scans every Markdown file outside generated and
dependency directories. It resolves relative files, directory README files, and
GitHub-style heading anchors. Critical commands are declared in
`scripts/documentation-validation.config.ts`; each declared `npm run` command is
also checked against its owning package manifest.

## External-link policy

External websites can be unavailable even when a documentation change is
correct, so external links do not block ordinary pull requests. A weekly
workflow, which maintainers can also start manually, runs:

```sh
npm run docs:links:external
```

Each URL receives three attempts with a short increasing delay. The checker
uses a `HEAD` request and falls back to `GET` when a server does not support
`HEAD`. Failures appear as workflow annotations with the source file and line.

If a reliable URL cannot be checked automatically, add only that exact URL to
`externalLinkExceptions` in the configuration. Every exception must include a
reason and an ISO date after which it expires. Do not allowlist an entire domain.
