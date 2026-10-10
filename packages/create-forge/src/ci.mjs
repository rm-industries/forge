import { ciSchemas, validateCiYaml } from './ci-schema.mjs';

// Provider renderers consume one validation plan; deployment is a separate concern.
const runtimes = ['22.22.2', '22', '24', '26'];
const checks = [
  { id: 'quality', runtimes, commands: ['npm run lint:css', 'npm run typecheck', 'npm test', 'npm run build'] },
  { id: 'browser', runtimes: ['26'], commands: ['npx playwright install --with-deps chromium', 'npm run test:e2e'] },
];

const providers = {
  github: {
    path: '.github/workflows/ci.yml',
    schema: ciSchemas.github,
    render() {
      return `name: Project CI
on:
  push:
  pull_request:
permissions: {}
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
${checks
  .map(
    ({ id, commands, runtimes }) => `  ${id}:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    strategy:
      fail-fast: false
      matrix:
        node: ${JSON.stringify(runtimes)}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
${commands.map((command) => `      - run: ${command}`).join('\n')}`,
  )
  .join('\n')}
`;
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
export function defineCiConfig({ enabled, primary } = {}) {
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
export function generateCi(config = { enabled: ['github'], primary: 'github' }) {
  const { enabled } = defineCiConfig(config);
  return Object.fromEntries(
    enabled.map((id) => {
      const provider = providers[id];
      return [provider.path, validateCiYaml(provider.schema, provider.render())];
    }),
  );
}

/** Authoritative automation must call this guard before generating deployment jobs. */
export function isPrimaryCi(config, provider) {
  const { primary } = defineCiConfig(config);
  if (primary === undefined) {
    throw new TypeError('Authoritative automation requires a primary CI provider');
  }
  return primary === provider;
}
