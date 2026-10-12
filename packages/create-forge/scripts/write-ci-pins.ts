import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generationOptionsSchema } from '../src/ci/generation-options.ts';
import { createGithubWorkflows } from '../src/ci/github.ts';
import { createCiPinResolver } from '../src/ci/pins.ts';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageDirectory, '../..');

// Bootstrap defaults follow Dependabot-maintained repository actions at package build time.
const actionDefaultsPath = join(packageDirectory, 'dist/ci-actions.json');
const actionDefaults: Record<string, { ref: string; version?: string }> = {};
const maintained: Record<string, string> = {};
for (const path of [
  '.github/workflows/project.yml',
  '.github/workflows/generator.yml',
  '.github/workflows/security.yml',
  '.github/workflows/automation.yml',
  '.github/workflows/website.yml',
  '.github/actions/setup-project/action.yml',
]) {
  maintained[path] = await readFile(join(repositoryRoot, path), 'utf8');
}
const resolveAction = createCiPinResolver(maintained);
const ciConfig = generationOptionsSchema.parse({
  directory: '.',
  repositoryRoot: '.',
  providers: ['github'],
  primary: 'github',
  securityMinute: 17,
  automationMinute: 43,
});
createGithubWorkflows(ciConfig, (action) => (actionDefaults[action] = resolveAction(action)));
await writeFile(actionDefaultsPath, `${JSON.stringify(actionDefaults, undefined, 2)}\n`);
