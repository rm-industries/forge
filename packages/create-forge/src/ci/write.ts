import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { Document, isScalar, visit } from 'yaml';

import { configSchema, workflowPath, type SiteCiConfig } from './config.ts';
import { createGithubWorkflows, type ActionResolver } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

export async function writeCi(config: SiteCiConfig, destination: string, pins: ActionResolver, signal?: AbortSignal) {
  config = configSchema.parse(config);
  const files: Record<string, string> = {};
  if (config.providers.includes('github'))
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
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return files;
}
