# Generated project CI

Every generated CI file is parsed as YAML and validated with a strict Zod
schema before it is returned. Malformed YAML, duplicate keys, unknown fields,
and invalid field types throw errors; fields are never silently removed.
Schemas cover the validation pipeline Forge emits and must be extended alongside
new generated features. They are not complete GitHub or GitLab schemas and do not
prove that commands or rule expressions work. Use provider validation, including
GitLab CI Lint, to check pipeline semantics in the target project.

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

GitHub is authored in TypeScript with Zuke and stored as committed generated
YAML. GitLab retains its existing renderer because Zuke cannot preserve the
pipeline rules used here. Both register their output path in one provider registry.
The existing Forge repository workflows remain in place;
these generated files target the standalone default template's scripts.

No deployment jobs are generated. Deployment targets, environments, and branch
mappings are separate follow-up work. Future deployment generation must use the
primary guard and an explicitly selected deployment target/environment; enabling
a second CI provider must only add validation. Primary does not suppress checks.

The project materialization CLI does not yet call this API. This API returns
file contents for that integration without writing into existing projects.

## Zuke and action updates

The standalone GitHub pipeline is defined in
`packages/create-forge/zuke/pipeline.ts`, using exact `@zuke/core@1.70.1` and
Deno versions with committed Deno and npm lockfiles. Zuke is an authoring tool;
generated projects run their YAML without needing Deno or Zuke.

```sh
npm run ci:generate -w @rm-industries/create-forge
npm run ci:check -w @rm-industries/create-forge
```

Generation writes `packages/create-forge/src/github.yml`. The package build copies
this file into `dist`, and `generateCi` validates and returns it. The check
command type-checks the authoring code and rejects stale generated output. CI
runs this gate on pull requests, including Dependabot pull requests.

`createCiPinResolver` reads `uses` nodes from parsed YAML, preserving full commit
SHAs and version comments. It rejects missing requested pins, mutable action
references, malformed YAML, duplicate keys, and conflicting references or version
comments. Local actions and Docker references are outside the action pin map.
Arbitrary Zuke steps explicitly call this resolver for their action references.

Forge reads action pins from `project.yml`, `automation.yml`, and the setup
composite action. Dependabot scans the repository workflows; when it updates a
pin, regenerate and commit the resulting template YAML in the same pull request.
If occurrences disagree, first update them to the intended reference together.
The resolver never guesses which conflicting SHA is newer. No bot pushes commits
or merges updates automatically.

Once materialized into a project, the generated workflow is that project's pin
source for its own Dependabot updates. Forge's pinned defaults and subsequent
project updates are maintained independently. Wiring this API into the
materialization CLI and a project-local Zuke authoring setup remain follow-up work.

A generation check proves structure and pin synchronization, not compatibility
or safety of an action release. Existing workflow execution tests the updated
actions; release notes and paths not exercised by CI still require review.
Dependabot's npm configuration covers the Deno runtime. Updates to Zuke's JSR
version and Deno lockfile are manual reviewed changes for now.

Forge's repository workflows are not migrated to Zuke: its current interface
cannot express all their matrix, path-filter, and working-directory settings.
