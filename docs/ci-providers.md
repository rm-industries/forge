# Generated project CI

The generator package exposes `@rm-industries/create-forge/ci`. Repository
hosting is independent of CI selection: a mirrored project can enable both
providers. The default is GitHub Actions with GitHub as primary.

```js
import { generateCi, isPrimaryCi } from '@rm-industries/create-forge/ci';

const ci = { enabled: ['github', 'gitlab'], primary: 'github' };
const files = generateCi(ci);
// files maps relative project paths to UTF-8 configuration contents.
// Materialization must apply its normal collision and path validation rules.
isPrimaryCi(ci, 'github'); // true
isPrimaryCi(ci, 'gitlab'); // false
```

Enable `['github']`, `['gitlab']`, or both. Unknown providers, duplicates, empty
selections, and a primary outside the enabled list are rejected. Validation-only
projects may omit primary; authoritative automation requires exactly one primary.
`isPrimaryCi` rejects a missing primary rather than silently permitting deployment.

Each enabled provider runs CSS linting, type checking, unit tests, and a build on
Node 22.22.2, latest 22, 24, and 26. Chromium browser tests run on Node 26. Both
use clean lockfile installs and cancel superseded runs. GitLab requires a Linux
runner with Docker image support and permission to install Chromium dependencies.
Its [pipeline rules](https://docs.gitlab.com/ci/jobs/job_rules/) avoid duplicate
branch and merge request pipelines. Generated files run without Forge installed.

The renderers share a logical check plan and register their output path in one
provider registry. A new provider adds a renderer there without changing selection
or generation code. The existing Forge repository workflows remain in place;
these generated files target the standalone default template's scripts.

No deployment jobs are generated. Deployment targets, environments, and branch
mappings are separate follow-up work. Future deployment generation must use the
primary guard and an explicitly selected deployment target/environment; enabling
a second CI provider must only add validation. Primary does not suppress checks.

The full project materialization CLI is not implemented yet. This API returns
file contents for that integration without writing into existing projects.
