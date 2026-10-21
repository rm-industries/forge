import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'forge-frontmatter-adoption-'));
const consumer = join(temporary, 'site');
const run = (args: string[], cwd = consumer, expected = 0) => {
  const result = spawnSync('npm', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_cache: join(tmpdir(), 'forge-frontmatter-npm-cache') },
  });
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout + result.stderr;
};

try {
  await cp(join(root, 'templates/default'), consumer, {
    recursive: true,
    filter: (path) => !['node_modules', 'dist', '.astro', 'coverage'].includes(path.split('/').at(-1) ?? ''),
  });
  // Prove the normal starter installs from its registry-only lock before overlaying the candidate.
  run(['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  const packOutput: unknown = JSON.parse(
    run(
      [
        'pack',
        '--workspace',
        'packages/markdownlint-frontmatter',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        temporary,
      ],
      root,
    ),
  );
  assert.ok(Array.isArray(packOutput) && packOutput.length === 1);
  const packed: unknown = packOutput[0];
  assert.ok(typeof packed === 'object' && packed !== null);
  assert.ok('filename' in packed && typeof packed.filename === 'string');
  run([
    'install',
    '--save-dev',
    '--save-exact',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(temporary, packed.filename),
  ]);
  await rm(join(consumer, '.markdownlint-cli2.jsonc'));
  await cp(join(consumer, '.markdownlint.json'), join(consumer, '.markdownlint-rules.json'));
  await rm(join(consumer, '.markdownlint.json'));
  await cp(join(root, 'fixtures/frontmatter-adoption/markdownlint-cli2.mjs'), join(consumer, '.markdownlint-cli2.mjs'));
  const registry = join(consumer, 'src/config/content-models/registry.ts');
  await writeFile(
    registry,
    (await readFile(registry, 'utf8')).replace(
      '[articleContentModel]',
      `[
    articleContentModel,
    { ...articleContentModel, name: 'pages', folder: 'src/content/pages', fields: {
      draft: articleContentModel.fields.draft,
      title: articleContentModel.fields.title,
      description: articleContentModel.fields.description,
      publishedAt: articleContentModel.fields.publishedAt,
      tags: articleContentModel.fields.tags,
    } },
  ]`,
    ),
  );
  await mkdir(join(consumer, 'src/content/pages'), { recursive: true });
  const articlePath = join(consumer, 'src/content/articles/order-probe.md');
  const pagePath = join(consumer, 'src/content/pages/order-probe.md');
  const article = '---\ndraft: true\ntitle: Article\nunknown: keep\n---\n\nBody.\n';
  const page = '---\ntitle: Page\ndraft: false\n---\n\nBody.\n';
  await writeFile(articlePath, article);
  await writeFile(pagePath, page);
  // Ordinary documentation may contain arbitrary YAML without enabling this rule.
  await writeFile(join(consumer, 'ordering-doc.md'), '---\ndraft: true\ntitle: Documentation\n---\n\nBody.\n');
  const output = run(['run', 'lint:markdown'], consumer, 1);
  assert.match(output, /markdownlint v0\.42\.0/u);
  assert.deepEqual(
    [...new Set([...output.matchAll(/^(.+?):\d+ error forge\/frontmatter-order/gmu)].map((match) => match[1]))].sort(),
    ['src/content/articles/order-probe.md', 'src/content/pages/order-probe.md'],
  );
  assert.doesNotMatch(output, /ordering-doc\.md:/u);
  assert.equal(await readFile(articlePath, 'utf8'), article);
  assert.equal(await readFile(pagePath, 'utf8'), page);
  run(['run', 'lint:markdown:fix']);
  assert.equal(await readFile(articlePath, 'utf8'), '---\ntitle: Article\ndraft: true\nunknown: keep\n---\n\nBody.\n');
  assert.equal(await readFile(pagePath, 'utf8'), '---\ndraft: false\ntitle: Page\n---\n\nBody.\n');
  run(['run', 'lint:markdown']);
  const ordinaryPath = join(consumer, 'ordinary-invalid.md');
  const ordinary = '# First\n\n# Second\n';
  await writeFile(ordinaryPath, ordinary);
  assert.match(run(['run', 'lint:markdown'], consumer, 1), /MD025/u);
  assert.equal(await readFile(ordinaryPath, 'utf8'), ordinary);
  await rm(ordinaryPath);
  const fixed = await readFile(articlePath, 'utf8');
  run(['run', 'lint:markdown:fix']);
  assert.equal(await readFile(articlePath, 'utf8'), fixed);
  const unsafe = '---\ntitle: First\ntitle: Duplicate\n---\n\nBody.\n';
  await writeFile(articlePath, unsafe);
  run(['run', 'lint:markdown'], consumer, 1);
  assert.equal(await readFile(articlePath, 'utf8'), unsafe);
  run(['run', 'lint:markdown:fix'], consumer, 1);
  assert.equal(await readFile(articlePath, 'utf8'), unsafe);
  console.log(
    'Packed CLI2 adoption: isolated registry install, two collection orders, check/fix exits, preservation, and unsafe refusal passed.',
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
