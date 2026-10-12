# CI generation internals

Forge maintains its own pipelines directly in YAML. create-forge uses internal
TypeScript builders and Zod schemas to generate and validate consumer YAML.
No CI TypeScript definitions or authoring dependencies belong to the template.
Consumers own and edit generated YAML directly.

This review introduces provider rendering, serialization, pin validation and
package-time pin snapshots. Bootstrap CLI integration follows in the next review;
switchable GitLab deployment follows after that.

The build discovers every action required by the renderer and resolves its full
SHA and version comment from Forge's Dependabot-maintained workflows and setup
action. Missing or conflicting pins fail the build. The resulting JSON snapshot
lives in the create-forge package, outside the consumer template. These are the
latest pins tested and released by Forge, not live upstream lookups.

Consumers use their own Dependabot to update action pins after bootstrap. GitHub
action updates use `directory: /`, including root workflows with nested-project
filename prefixes. Subsequent edits are checked by provider and workflow tools.
