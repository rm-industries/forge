import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { format } from 'oxfmt';
import { Document, isScalar, visit } from 'yaml';

import templateFormatting from '../../../../templates/default/oxfmt.config.ts';
import { generationOptionsSchema, workflowPath, type CiGenerationOptions } from './generation-options.ts';
import { createGithubWorkflows, type ActionResolver } from './github.ts';
import { createGitlabPipeline } from './gitlab.ts';
import { githubWorkflowSchema, gitlabPipelineSchema, validateCiYaml } from './schema.ts';

export async function writeCi(
  config: CiGenerationOptions,
  destination: string,
  pins: ActionResolver,
  signal?: AbortSignal,
) {
  config = generationOptionsSchema.parse(config);
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
    // Match the template's formatter config and EditorConfig line width.
    const formatted = await format(path, content, { ...templateFormatting, printWidth: 120 });
    if (formatted.errors.length)
      throw new Error(
        `Cannot format generated CI ${path}: ${formatted.errors.map((error) => error.message).join('; ')}`,
      );
    files[path] = validateCiYaml(
      path.startsWith('.github/') ? githubWorkflowSchema : gitlabPipelineSchema,
      formatted.code,
    );
    const target = join(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, files[path]!);
  }
  return files;
}
