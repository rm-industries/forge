import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gte, valid, prerelease } from 'semver';

import { verifyConsumerLock } from './verify-consumer-lock.ts';

const packageName = '@rm-industries/create-forge';
const hash = (bytes: Uint8Array) => `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
type Selection = {
  target: 'candidate' | 'stable';
  state: 'active' | 'inactive';
  name: string;
  version: string;
  integrity: string;
  source: string;
};

export async function selectGenerator(options: {
  target: 'candidate' | 'stable';
  output: string;
  candidate?: string;
  source?: string;
  fetcher?: typeof fetch;
}): Promise<Selection> {
  await mkdir(options.output, { recursive: false });
  const fetcher = options.fetcher ?? fetch;
  let bytes: Uint8Array;
  let expectedVersion: string | undefined;
  let source = options.source ?? '';
  let integrity: string;
  if (options.target === 'stable') {
    const response = await fetcher('https://registry.npmjs.org/@rm-industries%2fcreate-forge/latest');
    assert.ok(response.ok, `Registry metadata failed: ${response.status}`);
    const metadata = (await response.json()) as {
      name: string;
      version: string;
      dist: { tarball: string; integrity: string };
    };
    assert.equal(metadata.name, packageName);
    assert.ok(
      valid(metadata.version) && prerelease(metadata.version) === null,
      'latest must identify a stable semantic version',
    );
    expectedVersion = metadata.version;
    source = metadata.dist.tarball;
    const url = new URL(source);
    assert.equal(url.origin, 'https://registry.npmjs.org', 'Stable artifact must come from npm registry');
    integrity = metadata.dist.integrity;
    assert.match(integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    const artifact = await fetcher(source);
    assert.ok(artifact.ok, `Artifact download failed: ${artifact.status}`);
    bytes = new Uint8Array(await artifact.arrayBuffer());
    assert.equal(hash(bytes), integrity, 'Registry artifact integrity mismatch');
  } else {
    assert.ok(options.candidate && source, 'Candidate requires explicit tarball and source identity');
    bytes = await readFile(options.candidate);
    integrity = hash(bytes);
  }
  const tarball = join(options.output, 'create-forge.tgz');
  await writeFile(tarball, bytes);
  const manifest = JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' }));
  assert.equal(manifest.name, packageName);
  assert.ok(valid(manifest.version), 'Artifact must have a semantic version');
  if (expectedVersion)
    assert.equal(manifest.version, expectedVersion, 'Registry metadata and artifact version disagree');
  const selection: Selection = {
    target: options.target,
    state: options.target === 'stable' && !gte(manifest.version, '2.0.0') ? 'inactive' : 'active',
    name: packageName,
    version: manifest.version,
    integrity,
    source,
  };
  if (selection.state === 'active') {
    const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).split('\n');
    assert.ok(
      !entries.includes('package/dist/template/package-lock.json'),
      'Fresh delivery artifact must not bundle a consumer lock',
    );
  }
  await writeFile(join(options.output, 'identity.json'), `${JSON.stringify(selection, null, 2)}\n`);
  return selection;
}

function run(command: string, args: string[], cwd: string, log: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
      npm_config_cache: process.env.npm_config_cache ?? join(dirname(log), 'npm-cache'),
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${command} ${args.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`;
  execFileSync('tee', ['-a', log], { input: output, stdio: ['pipe', 'inherit', 'inherit'] });
  assert.equal(result.status, 0, `${command} failed (${result.status}): ${result.error?.message ?? log}`);
}

export async function validateFreshConsumer(selectionDirectory: string, output: string) {
  const identity: Selection = JSON.parse(await readFile(join(selectionDirectory, 'identity.json'), 'utf8'));
  assert.equal(identity.state, 'active', 'Inactive stable selection is not freshness acceptance');
  const tarball = resolve(selectionDirectory, 'create-forge.tgz');
  assert.equal(hash(await readFile(tarball)), identity.integrity, 'Selected artifact changed after selection');
  await mkdir(output, { recursive: false });
  await copyFile(join(selectionDirectory, 'identity.json'), join(output, 'identity.json'));
  const log = join(output, 'commands.log');
  const runner = join(output, 'runner');
  const consumer = join(output, 'consumer');
  await mkdir(runner);
  await writeFile(
    join(output, 'runtime.json'),
    JSON.stringify({ node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim() }),
  );
  run('npm', ['install', '--prefix', runner, '--ignore-scripts', '--no-audit', '--no-fund', tarball], output, log);
  run(
    join(runner, 'node_modules/.bin/create-forge'),
    [consumer, '--name', 'fresh-consumer', '--yes', '--no-git'],
    output,
    log,
  );
  const consumerRoot = await realpath(consumer);
  const lockPath = join(consumer, 'package-lock.json');
  const lockBytes = await readFile(lockPath);
  await copyFile(lockPath, join(output, 'package-lock.json'));
  await verifyConsumerLock(consumer);
  const lock = JSON.parse(lockBytes.toString());
  for (const [path, entry] of Object.entries(lock.packages) as [
    string,
    { link?: boolean; resolved?: string; integrity?: string },
  ][]) {
    if (!path) continue;
    assert.ok(path.startsWith('node_modules/') && !path.split('/').includes('..'), `Unsafe lock path: ${path}`);
    assert.ok(
      !entry.link &&
        entry.resolved &&
        new URL(entry.resolved).origin === 'https://registry.npmjs.org' &&
        entry.integrity,
      `Non-registry lock entry: ${path}`,
    );
    // Optional platform packages need not be installed on this runner.
    try {
      assert.ok(!(await lstat(join(consumer, path))).isSymbolicLink(), `Linked consumer package: ${path}`);
      assert.ok(
        (await realpath(join(consumer, path))).startsWith(`${consumerRoot}${sep}`),
        `Package escapes consumer: ${path}`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  run('npm', ['ls', '--all', '--json'], consumer, log);
  run(
    'npm',
    ['ls', '@rm-industries/content-model', '@sveltia/cms', '@rm-industries/browser-oxfmt', 'oxfmt', '--json'],
    consumer,
    log,
  );
  await writeFile(
    join(output, 'lock-identity.json'),
    JSON.stringify(
      {
        sha256: createHash('sha256').update(lockBytes).digest('hex'),
        packages: Object.fromEntries(
          ['@rm-industries/content-model', '@sveltia/cms', '@rm-industries/browser-oxfmt', 'oxfmt'].map((name) => [
            name,
            lock.packages[`node_modules/${name}`]?.version,
          ]),
        ),
      },
      null,
      2,
    ),
  );
  await rm(join(consumer, 'node_modules'), { recursive: true });
  run('npm', ['ci', '--no-audit', '--no-fund'], consumer, log);
  assert.deepEqual(await readFile(lockPath), lockBytes, 'npm ci changed selected consumer lock');
  run('npm', ['run', 'quality:core'], consumer, log);
  run('npm', ['exec', '--', 'playwright', 'install', '--with-deps', 'chromium'], consumer, log);
  run(
    'npm',
    ['run', 'test:e2e', '--', 'tests/cms-formatting.spec.ts', '--project=chromium', '--workers=2'],
    consumer,
    log,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, target, output, candidate] = process.argv.slice(2);
  if (mode === 'select') {
    assert.ok(target === 'candidate' || target === 'stable');
    assert.ok(output);
    const identity = await selectGenerator({
      target,
      output: resolve(output),
      ...(candidate ? { candidate: resolve(candidate) } : {}),
      source:
        target === 'candidate'
          ? (process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim())
          : '',
    });
    console.log(JSON.stringify(identity));
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `state=${identity.state}\n`);
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        `Fresh consumer: ${identity.target} ${identity.version}: **${identity.state}**. ${identity.state === 'inactive' ? 'Published stable is below 2.0.0; this is not freshness acceptance.' : 'See consumer evidence for acceptance.'}\n`,
      );
  } else {
    assert.equal(mode, 'validate');
    assert.ok(target && output);
    await validateFreshConsumer(resolve(target), resolve(output));
  }
}
