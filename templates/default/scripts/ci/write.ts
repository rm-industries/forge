import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { Document, isScalar, visit } from 'yaml';

import { configSchema, workflowPath } from './config.ts';
import { createGithubWorkflows, type ActionResolver } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { createCiPinResolver } from './pins.ts';
import { githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

function resolveActions(projectRoot: string, repositoryRoot: string, prefix?: string): ActionResolver {
  const defaults = JSON.parse(readFileSync(join(projectRoot, 'scripts/ci/actions.json'), 'utf8')) as Record<
    string,
    { ref: string }
  >;
  const workflows: Record<string, string> = {};
  for (const name of ['project', 'security', 'automation']) {
    const path = join(repositoryRoot, '.github/workflows', `${prefix ? `${prefix}-` : ''}${name}.yml`);
    if (existsSync(path)) workflows[path] = readFileSync(path, 'utf8');
  }
  const resolvePin = createCiPinResolver(workflows);
  return (action) => {
    try {
      return resolvePin(action);
    } catch (error) {
      if (!(error instanceof TypeError) || error.message !== `Missing action pin: ${action}`) throw error;
      const pin = defaults[action];
      if (!pin || pin.ref.split('@')[0] !== action || !/@[a-f0-9]{40}$/.test(pin.ref))
        throw new TypeError(`Missing or invalid action pin: ${action}`);
      return pin;
    }
  };
}

export async function writeCi(projectRoot: string, outputRoot?: string, check = false, signal?: AbortSignal) {
  const config = configSchema.parse(JSON.parse(await readFile(join(projectRoot, 'scripts/ci/config.json'), 'utf8')));
  const repositoryRoot = resolve(projectRoot, config.repositoryRoot);
  const destination = outputRoot ?? repositoryRoot;
  const pins = config.providers.includes('github')
    ? resolveActions(projectRoot, repositoryRoot, config.prefix)
    : undefined;
  const files: Record<string, string> = {};
  if (pins)
    for (const [name, workflow] of Object.entries(createGithubWorkflows(config, pins))) {
      const document = new Document(workflow);
      visit(document, {
        Pair(_key, pair) {
          if (
            !isScalar(pair.key) ||
            pair.key.value !== 'uses' ||
            !isScalar(pair.value) ||
            typeof pair.value.value !== 'string'
          )
            return;
          const action = pair.value.value.split('@')[0]!;
          const pin = pins(action);
          if (pin.version) pair.value.comment = ` ${pin.version}`;
        },
      });
      files[workflowPath(name, config)] = validateCiYaml(githubWorkflowSchema, document.toString({ lineWidth: 0 }));
    }
  if (config.providers.includes('gitlab')) {
    const path = config.prefix ? `.gitlab/ci/${config.prefix}.yml` : '.gitlab-ci.yml';
    files[path] = validateCiYaml(
      gitlabPipelineSchema,
      new Document(createGitlabPipeline(config)).toString({ lineWidth: 0 }),
    );
  }
  for (const [path, content] of Object.entries(files)) {
    signal?.throwIfAborted();
    const target = join(destination, path);
    if (check) {
      if (!existsSync(target) || (await readFile(target, 'utf8')) !== content)
        throw new Error(`Generated CI is stale: ${path}. Run npm run ci:generate.`);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  return files;
}
