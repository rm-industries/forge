import type { DeploymentEnvironment } from './deployment.ts';
import { shellQuote } from './generation-options.ts';

export type CloudflareDeployment = Extract<DeploymentEnvironment, { target: 'cloudflare-pages' }>;
export const installCloudflareTool = 'npm ci --prefix tools/cloudflare';
export const verifyCloudflareArtifact = 'test -f dist/index.html';
export function cloudflareDeployCommand(deployment: CloudflareDeployment) {
  return [
    'test -n "$CLOUDFLARE_ACCOUNT_ID"',
    'test -n "$CLOUDFLARE_API_TOKEN"',
    'deploymentTool="$(pwd)/tools/cloudflare/node_modules/wrangler/bin/wrangler.js"',
    'deploymentDirectory="$(mktemp -d)"',
    `trap 'rm -rf "$deploymentDirectory"' EXIT`,
    'mkdir "$deploymentDirectory/public"',
    'cp -R dist/. "$deploymentDirectory/public/"',
    `printf '%s\\n' '{"pages_build_output_dir":"public"}' > "$deploymentDirectory/wrangler.json"`,
    'cd "$deploymentDirectory"',
    `node "$deploymentTool" pages deploy public --project-name ${shellQuote(deployment.project)} --branch ${shellQuote(deployment.sourceBranch)}`,
  ].join('\n');
}

export const cloudflareProjectCheckScript = `
const [project, branch] = process.argv.slice(1);
const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID) + '/pages/projects/' + encodeURIComponent(project), { headers: { Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN }, signal: AbortSignal.timeout(30000) });
const data = await response.json();
if (!response.ok || data.success !== true || data.result?.name !== project || data.result?.production_branch !== branch || data.result?.source)
  throw new Error('Expected an existing Direct Upload Pages project with the configured production branch. Forge does not create or reconfigure projects.');
`;
export function cloudflareProjectCheckCommand(deployment: CloudflareDeployment) {
  return `node --input-type=module -e ${shellQuote(cloudflareProjectCheckScript)} ${shellQuote(deployment.project)} ${shellQuote(deployment.sourceBranch)}`;
}
