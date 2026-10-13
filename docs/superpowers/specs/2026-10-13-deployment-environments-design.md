# Deployment providers and environments

Issue: [#272](https://github.com/rm-industries/forge/issues/272)

## Outcome and constraints

Create-forge bootstraps native CI YAML for named deployment environments. An
environment identifies a source branch and a target independently of the CI
provider. Development and production may remain deployed simultaneously where
the selected target supports that behavior.

The user approved small incremental reviews. Bootstrap inputs remain CLI inputs;
Forge does not install a persistent configuration file, TypeScript pipeline, or
local pipeline executor. Generated YAML belongs to the consumer. Forge's own
pipelines remain maintained YAML. No existing live deployment is changed by this
work.

## Model and defaults

Define a validated deployment plan within create-forge, separate from validation
work. Each environment has a unique name, an exact source branch, a target, and
an optional public URL. Target settings use a discriminated schema:

- GitHub Pages: one environment per repository, executed by primary GitHub CI.
- GitLab Pages: primary GitLab CI; one default deployment without paid features.
  Additional environments require explicitly selected parallel deployment support
  and distinct path prefixes. Persistent environments use no automatic expiry.
- Cloudflare Pages: a named, existing Direct Upload project per environment,
  executed by either primary CI. Separate projects provide independent persistent
  URLs without relying on preview deployment retention or branch aliases.

Without deployment inputs, retain today's native Pages default: production from
main, using the primary provider's native Pages target. Preserve validation-only
behavior when no primary provider is selected.

A repeatable `--deployment` argument accepts one JSON object per environment. JSON
provides an unambiguous structured input without another configuration format or
retained file. For example:

```sh
npm create @rm-industries/forge website -- \
  --ci-providers github,gitlab --primary-ci github \
  --deployment '{"name":"production","sourceBranch":"main","target":"cloudflare-pages","project":"example-production","url":"https://example.com"}' \
  --deployment '{"name":"development","sourceBranch":"dev","target":"cloudflare-pages","project":"example-development","url":"https://dev.example.com"}'
```

Reject duplicate names, invalid branches/URLs, conflicting destination projects
or path prefixes, unknown fields, missing target settings, and unsupported primary
CI/target combinations before writing files. All regular expressions are named.
Validate and quote external strings; never insert user text into executable shell
or CI expressions without escaping.

## Generated execution

Keep deployment and smoke checks in the same logical flow as project validation.
Validation remains available on every enabled CI. Branch filters include all
configured source branches while pull/merge requests remain validation-only.

Deploy only after the existing quality, build, browser and Lighthouse checks
succeed. Reuse the validated build artifact when environments use the same build
settings. Where URLs or base paths differ, build for the selected environment and
validate that artifact before deployment; do not rebuild it during deployment.

Scope concurrency/resource locks to the environment and target, and restrict
production secrets to push/manual deployment contexts, never untrusted pull or
merge requests. Retain the current GitHub permission and artifact safeguards.

For a supported secondary CI/target pairing, emit the deployment and smoke jobs
with native disabling conditions (`if: false` or `when: never`) and explain the
primary-provider switch in generated comments. Never substitute a different target
silently. For unsupported pairings, emit explanatory comments instead of commands
that cannot work; enabling that pairing requires selecting a supported target.

Cloudflare uses a lockfile-managed Wrangler dependency installed only for projects
selecting Cloudflare. Both renderers invoke its CLI to upload the already validated
artifact. Generate references to `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`; never accept or write secret values. Users create the
Cloudflare projects and configure secrets. Forge does not provision infrastructure.

Smoke checks use the configured public URL or the provider's deployment URL. A
configured custom domain must already point to the target; documentation explains
this prerequisite. Report deployment and smoke results using each CI's native
mechanisms. Preserve path filters and existing project-check boundaries.

## Review sequence

1. Shared deployment schemas, normalization, CLI inputs and existing Pages default
   integration. Only support executable options in this review: reject new target
   modes until their renderers land. Include existing-behavior regression tests.
2. Provider rendering in small follow-up reviews: Cloudflare from both CIs, then
   explicit GitLab parallel deployments. Add renderer/schema validation, generated
   comments and provider setup documentation with each capability.
3. End-to-end bootstrap coverage and final documentation comparison. Exercise
   nested projects, multiple branches, artifact dependencies, disabled secondary
   deployments, URL-specific build behavior and smoke configuration. Close #272
   only after all acceptance criteria are represented and supported limitations
   documented.

Each review must leave the generator usable and reject unsupported options rather
than producing placeholder jobs. Keep dependent branches explicit; preserve work
between reviews without requiring a single large PR.

## Verification and limits

Use unit tests for plan validation and primary gating, parse generated YAML through
provider schemas, and verify meaningful job/artifact relationships and workflow
filters. Bootstrap fixtures confirm CLI inputs produce consumer-owned YAML without
retained configuration. Run existing formatting, lint, types and affected tests.

Generated configuration checks do not prove an external service deployment. Live
provider testing requires user-selected disposable projects and credentials, with
separate authorization before provisioning or publication. GitLab plan entitlement
cannot be detected offline; the bootstrap option is an explicit capability claim.

## Sources

- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitLab Pages parallel deployments](https://docs.gitlab.com/user/project/pages/parallel_deployments/)
- [Cloudflare Direct Upload from CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
