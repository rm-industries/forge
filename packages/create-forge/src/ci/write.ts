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
      document.commentBefore =
        ' You own this workflow: edit jobs, paths and schedules here as your project grows.\n Dependabot updates action pins; no Forge regeneration step is required.';
      if (name === 'project' && config.deployments !== undefined)
        document.commentBefore +=
          '\n Deployment environments come from bootstrap inputs; edit their branches, URLs and jobs here.';
      if (name === 'project' && config.deployments?.some((deployment) => deployment.target === 'gitlab-pages'))
        document.commentBefore +=
          '\n Deployment is owned by the primary GitLab CI. GitHub cannot deploy the selected GitLab Pages target.';
      if (name === 'project' && config.deployments?.some((deployment) => deployment.target === 'cloudflare-pages'))
        document.commentBefore +=
          '\n Cloudflare uses tools/cloudflare and CI environment secrets; only the primary CI deploys.\n To switch CI, enable the selected deployment conditions and disable the previous primary jobs.';
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
    const document = new Document(createGitlabPipeline(config));
    document.commentBefore =
      ' You own this pipeline: edit jobs and rules here as your project grows.\n Review Node image versions when upgrading your project runtime.';
    if (config.deployments !== undefined)
      document.commentBefore +=
        '\n Deployment environments come from bootstrap inputs; edit their branches, URLs and jobs here.';
    if (config.deployments?.some((deployment) => deployment.target === 'github-pages'))
      document.commentBefore +=
        '\n Deployment is owned by the primary GitHub CI. GitLab cannot deploy the selected GitHub Pages target.';
    if (config.deployments?.some((deployment) => deployment.target === 'cloudflare-pages'))
      document.commentBefore +=
        '\n Cloudflare uses tools/cloudflare and environment-scoped CI variables; only the primary CI deploys.\n To switch CI, enable the selected deployment rules and disable the previous primary jobs.';
    files[path] = validateCiYaml(gitlabPipelineSchema, document.toString({ lineWidth: 0 }));
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
