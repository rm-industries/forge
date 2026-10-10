# Continuous integration

Forge models its repository and site validation in TypeScript with Zuke. See
[generated project CI](ci-providers.md) for graph ownership, generation, local
execution, action pins, and provider limitations.

## Required checks

The root `Project` aggregate runs on every pull request and depends on repository,
package, template, generator, and generated-file checks. Its dependencies come
from the work graph. Require `Project` on `main`; individual jobs remain visible
for diagnosis. The migration removes change routing: documentation changes also
run the complete suite. Review opportunities to remove redundant checks after
this migration.

The site graph emits a `Project` aggregate for generated sites and a `Website`
aggregate for Forge's website. Source checks precede the build; validation,
browser tests, Lighthouse, and audit precede the aggregate. Hosted jobs invoke
local target names, with their prerequisites running again on isolated runners.
The generated workflow uploads the site build for the deployment workflow.

Actionlint and Zizmor run on every change and on a weekly schedule. CodeQL and
dependency review remain separate security signals. Review security findings
before merging changes to automation or dependencies.

## Runtime and evidence strategy

Compatibility uses Node 22.22.2, latest 22, 24, and 26. Generator compatibility
runs every supported Node version on Ubuntu and macOS. Other checks use Node 26.
Browser checks cover Chromium, Firefox, and WebKit. Local execution uses the
current Node version rather than reproducing these hosted matrices.

Coverage, browser reports, and Lighthouse evidence are retained for seven days.
Root template checks copy evidence out of their temporary fixtures before
cleanup. Hidden Lighthouse reports are included explicitly.

The existing `.github/workflows/website.yml` remains intact during the migration
and still owns website deployment. Generated `website-project.yml`,
`website-security.yml`, and `website-automation.yml` run alongside it, so website
validation is temporarily duplicated. Switching the existing workflow to the
reviewed deployment-only form is a separate follow-up.

Generated projects retain editable Pages deployment YAML because Zuke cannot
represent its environments or job outputs. Deployment follows successful
validation of a push to `main` from the same repository and consumes that run's
artifact and commit. The deployed URL feeds the smoke check. Pull request
validation cannot trigger deployment.

## Security and release gates

Audit targets run in the full repository and site graphs. Hosted audit steps
report findings without blocking remediation pull requests, preserving the
existing policy. Direct local audit targets still fail when advisories exceed
the policy. The current website workflow keeps its existing audit behavior.

Package publication also runs the root audit and the standalone template audit.
Repository checkpoint releases require root, template, and website audits to
pass. Exceptions must name an exact advisory, explain why its affected path is
safe for Forge's use, include an expiry, and link upstream tracking. Do not
allowlist package names or severity classes.

```sh
npm run audit
npm run audit --prefix templates/default
npm run audit --prefix website
```

A generated-file check proves synchronization with the work graph and action
pins. It does not prove an action release is safe or that unexercised provider
features work. Hosted execution and release review remain required.
