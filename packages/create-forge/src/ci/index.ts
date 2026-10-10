import { readFileSync } from 'node:fs';

import { checks } from './plan.ts';
import { ciSchemas, validateCiYaml } from './schema.ts';

export { createCiPinResolver } from './pins.ts';

export type CiProvider = keyof typeof ciSchemas;
export interface CiConfig {
  enabled: readonly CiProvider[];
  primary?: CiProvider | undefined;
}

const providers = {
  github: {
    path: '.github/workflows/ci.yml',
    schema: ciSchemas.github,
    render() {
      return readFileSync(new URL('./github.yml', import.meta.url), 'utf8');
    },
  },
  gitlab: {
    path: '.gitlab-ci.yml',
    schema: ciSchemas.gitlab,
    render() {
      return `workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS && $CI_PIPELINE_SOURCE == "push"'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "push"'
default:
  interruptible: true
  before_script:
    - npm ci
${checks
  .map(
    ({ id, commands, runtimes }) => `${id}:
  image: node:$NODE_VERSION
  parallel:
    matrix:
      - NODE_VERSION: ${JSON.stringify(runtimes)}
  script:
${commands.map((command) => `    - ${command}`).join('\n')}`,
  )
  .join('\n')}
`;
    },
  },
};

/** Validate CI selection independently of repository hosting. Primary is optional for validation. */
export function defineCiConfig({ enabled, primary }: CiConfig): Readonly<CiConfig> {
  if (
    !Array.isArray(enabled) ||
    enabled.length === 0 ||
    enabled.some((id) => !Object.hasOwn(providers, id)) ||
    new Set(enabled).size !== enabled.length
  ) {
    throw new TypeError('CI enabled must be a non-empty list of unique supported providers');
  }
  if (primary !== undefined && !enabled.includes(primary)) {
    throw new TypeError('CI primary must be one enabled provider');
  }
  return Object.freeze({ enabled: Object.freeze([...enabled]), primary });
}

/** Return relative paths and contents without writing or overwriting project files. */
export function generateCi(config: CiConfig = { enabled: ['github'], primary: 'github' }) {
  const { enabled } = defineCiConfig(config);
  return Object.fromEntries(
    enabled.map((id) => {
      const provider = providers[id];
      return [provider.path, validateCiYaml(provider.schema, provider.render())];
    }),
  );
}

/** Authoritative automation must call this guard before generating deployment jobs. */
export function isPrimaryCi(config: CiConfig, provider: CiProvider) {
  const { primary } = defineCiConfig(config);
  if (primary === undefined) {
    throw new TypeError('Authoritative automation requires a primary CI provider');
  }
  return primary === provider;
}
