// cspell:ignore pipefail esac
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

import { selectAutomaticRelease } from './select-automatic-release.ts';

const execute = promisify(execFile);
const workflow = parse(await readFile(new URL('../.github/workflows/template-sync.yml', import.meta.url), 'utf8'));
const step = (name: string) =>
  workflow.jobs.synchronize.steps.find((value: { name: string }) => value.name === name).run as string;
const script = resolve('scripts/prepare-template-sync.ts');

for (const formatter of [false, true]) {
  test(`produces only authoring lock changes from verified ${formatter ? 'browser' : 'model'} publication using real npm`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'forge-refresh-'));
    const slug = formatter ? 'browser-oxfmt' : 'content-model';
    const name = `@rm-industries/${slug}`;
    const host = formatter ? 'oxfmt' : '@sveltia/cms';
    const versions = formatter ? ['0.1.2', '0.1.3'] : ['1.1.10', '1.1.11'];
    const hosts = formatter ? ['0.74.0', '0.75.0'] : ['0.251.0', '0.252.0'];
    const documents: Record<string, Record<string, unknown>> = {};
    const tarballs = new Map<string, Buffer>();
    const server = createServer((request, response) => {
      const path = decodeURIComponent(request.url!.slice(1));
      if (tarballs.has(path)) return response.end(tarballs.get(path));
      const versions = documents[path];
      if (!versions) {
        response.writeHead(404);
        return response.end('{}');
      }
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ name: path, 'dist-tags': { latest: Object.keys(versions).at(-1) }, versions }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Registry did not listen');
    const registry = `http://127.0.0.1:${address.port}/`;
    const env = { ...process.env, npm_config_registry: registry, npm_config_cache: join(directory, 'cache') };
    try {
      for (const packageName of [name, host])
        for (const [index, version] of (packageName === name ? versions : hosts).entries()) {
          const manifest = {
            name: packageName,
            version,
            ...(packageName === name ? { peerDependencies: { [host]: hosts[index] } } : {}),
          };
          const stage = join(directory, `stage-${tarballs.size}`);
          await mkdir(join(stage, 'package'), { recursive: true });
          await writeFile(join(stage, 'package/package.json'), JSON.stringify(manifest));
          const filename = `${tarballs.size}.tgz`;
          await execute('tar', ['-czf', join(directory, filename), '-C', stage, 'package']);
          const bytes = await readFile(join(directory, filename));
          tarballs.set(filename, bytes);
          documents[packageName] ??= {};
          documents[packageName][version!] = {
            ...manifest,
            dist: {
              tarball: `${registry}${filename}`,
              integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
              attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
            },
          };
        }
      const template = join(directory, 'templates/default');
      const sync = join(directory, 'runner/forge-template-sync');
      await mkdir(template, { recursive: true });
      await mkdir(sync, { recursive: true });
      const originalManifest = {
        name: 'fixture',
        version: '1.0.0',
        private: true,
        dependencies: { [name]: versions[0], ...(!formatter ? { [host]: hosts[0] } : {}) },
        ...(formatter ? { devDependencies: { [host]: hosts[0] } } : {}),
      };
      await writeFile(join(template, 'package.json'), JSON.stringify(originalManifest));
      await execute('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
        cwd: template,
        env,
      });
      const ranged = {
        ...originalManifest,
        dependencies: {
          [name]: formatter ? '^0.1.2' : '^1.1.10',
          ...(!formatter ? { [host]: '>=0.251.0 <1.0.0' } : {}),
        },
        ...(formatter ? { devDependencies: { [host]: '>=0.74.0 <1.0.0' } } : {}),
      };
      const manifestText = `${JSON.stringify(ranged)}\n`;
      await writeFile(join(template, 'package.json'), manifestText);
      const lock = JSON.parse(await readFile(join(template, 'package-lock.json'), 'utf8'));
      lock.packages[''].dependencies = ranged.dependencies;
      if (formatter) lock.packages[''].devDependencies = ranged.devDependencies;
      await writeFile(join(template, 'package-lock.json'), JSON.stringify(lock));
      await mkdir(join(directory, 'packages/create-forge'), { recursive: true });
      await writeFile(join(directory, 'packages/create-forge/package.json'), '{"version":"2.0.0"}\n');
      await writeFile(
        join(directory, 'packages/create-forge/CHANGELOG.md'),
        '# Changelog\n\n## 2.0.0\n\n- Baseline.\n',
      );
      await writeFile(
        join(directory, 'package.json'),
        JSON.stringify({ scripts: { 'template:sync': `node ${script}` } }),
      );
      const rootLock = JSON.stringify({ packages: { '': { devDependencies: { oxfmt: '0.74.0' } } } });
      await writeFile(join(directory, 'package-lock.json'), rootLock);
      await execute('git', ['init', '-q'], { cwd: directory });
      await execute('git', ['add', 'package.json', 'package-lock.json', 'packages', 'templates'], { cwd: directory });
      await execute(
        'git',
        ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline'],
        { cwd: directory },
      );
      const base = (await execute('git', ['rev-parse', 'HEAD'], { cwd: directory })).stdout.trim();
      const metadata = documents[name]![versions[1]!] as { dist: { integrity: string } };
      const publication = {
        packageName: name,
        version: versions[1],
        releaseTag: `${slug}-v${versions[1]}`,
        publication: { verified: true, registryIntegrity: metadata.dist.integrity },
      };
      await writeFile(join(sync, 'package.json'), JSON.stringify(metadata));
      await writeFile(join(sync, 'peer-versions.json'), JSON.stringify(hosts));
      await writeFile(join(sync, 'published.json'), JSON.stringify(publication));
      const sourceRunner = join(directory, 'source-runner');
      const bin = join(directory, 'bin');
      await mkdir(sourceRunner);
      await mkdir(bin);
      await writeFile(
        join(bin, 'gh'),
        `#!/bin/bash
set -eu
if [[ "$1 $2" == 'api repos/owner/repo/actions/runs/123/artifacts' ]]; then
  echo "published-$PACKAGE-$VERSION"
elif [[ "$1 $2" == 'run download' ]]; then
  while [[ "$1" != '--dir' ]]; do shift; done
  mkdir -p "$2"
  cp "$PUBLICATION_FIXTURE" "$2/published.json"
else
  exit 99
fi
`,
      );
      await chmod(join(bin, 'gh'), 0o755);
      await execute('bash', ['-euo', 'pipefail', '-c', step('Resolve verified publication')], {
        cwd: directory,
        env: {
          ...env,
          PATH: `${bin}:${process.env.PATH}`,
          RUNNER_TEMP: sourceRunner,
          GITHUB_EVENT_NAME: 'repository_dispatch',
          GITHUB_REPOSITORY: 'owner/repo',
          SOURCE_RUN_ID: '123',
          EVENT_PACKAGE: slug,
          PACKAGE: slug,
          VERSION: versions[1],
          INPUT_PACKAGE: '',
          EXPECTED_RELEASE_TAG: publication.releaseTag,
          EXPECTED_VERSION: versions[1],
          PUBLICATION_FIXTURE: join(sync, 'published.json'),
          GITHUB_OUTPUT: join(directory, 'source-output'),
        },
      });
      expect(await readFile(join(directory, 'source-output'), 'utf8')).toContain(`slug=${slug}`);
      await execute('bash', ['-euo', 'pipefail', '-c', step('Read registry metadata')], {
        cwd: directory,
        env: { ...env, RUNNER_TEMP: join(directory, 'runner'), PACKAGE: slug, HOST: host, VERSION: versions[1] },
      });
      const workflowEnv = {
        ...env,
        RUNNER_TEMP: join(directory, 'runner'),
        PUBLICATION: join(sync, 'published.json'),
        GITHUB_OUTPUT: join(directory, 'output'),
        GITHUB_STEP_SUMMARY: join(directory, 'summary'),
      };
      const beforeRejected = await readFile(join(template, 'package-lock.json'), 'utf8');
      await writeFile(
        join(sync, 'package.json'),
        JSON.stringify({ ...metadata, dist: { ...metadata.dist, integrity: 'sha512-wrong' } }),
      );
      await writeFile(
        join(sync, 'published.json'),
        JSON.stringify({ ...publication, publication: { verified: true, registryIntegrity: 'sha512-wrong' } }),
      );
      await expect(
        execute('bash', ['-euo', 'pipefail', '-c', step('Prepare template synchronization')], {
          cwd: directory,
          env: workflowEnv,
        }),
      ).rejects.toThrow(/Command failed/);
      expect(await readFile(join(template, 'package-lock.json'), 'utf8')).toBe(beforeRejected);
      await writeFile(join(sync, 'package.json'), JSON.stringify(metadata));
      await writeFile(join(sync, 'published.json'), JSON.stringify(publication));
      await execute('bash', ['-euo', 'pipefail', '-c', step('Prepare template synchronization')], {
        cwd: directory,
        env: workflowEnv,
      });
      const refreshed = JSON.parse(await readFile(join(template, 'package-lock.json'), 'utf8'));
      expect(refreshed.packages[`node_modules/${name}`].version).toBe(versions[1]);
      expect(refreshed.packages[`node_modules/${host}`].version).toBe(hosts[1]);
      expect(refreshed.packages['']).toEqual(lock.packages['']);
      expect(await readFile(join(template, 'package.json'), 'utf8')).toBe(manifestText);
      const files = (await execute('git', ['diff', '--name-only'], { cwd: directory })).stdout.trim().split('\n');
      expect(files).toEqual(['templates/default/package-lock.json']);
      expect(
        selectAutomaticRelease({
          repository: 'owner/repo',
          appLogin: 'updates[bot]',
          sha: 'a'.repeat(40),
          pullRequest: {
            merged: true,
            merge_commit_sha: 'a'.repeat(40),
            user: { login: 'updates[bot]' },
            base: { ref: 'main', repo: { full_name: 'owner/repo' } },
            head: { ref: `automation/template-${slug}`, repo: { full_name: 'owner/repo' } },
          },
          files,
          versions: {
            'content-model': { previous: '1.1.10', current: '1.1.10' },
            'create-forge': { previous: '2.0.0', current: '2.0.0' },
          },
        }),
      ).toBeUndefined();
      const beforeReplay = await readFile(join(template, 'package-lock.json'), 'utf8');
      await execute('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: template, env });
      expect(await readFile(join(template, 'package-lock.json'), 'utf8')).toBe(beforeReplay);
      for (const invalid of [
        { ...metadata, dist: { ...metadata.dist, attestations: {} } },
        { ...metadata, peerDependencies: { [host]: '9.0.0' } },
      ]) {
        await writeFile(join(sync, 'package.json'), JSON.stringify(invalid));
        await expect(
          execute('bash', ['-euo', 'pipefail', '-c', step('Prepare template synchronization')], {
            cwd: directory,
            env: workflowEnv,
          }),
        ).rejects.toThrow(/Command failed/);
        expect(await readFile(join(template, 'package-lock.json'), 'utf8')).toBe(beforeReplay);
      }
      expect(await readFile(join(directory, 'package-lock.json'), 'utf8')).toBe(rootLock);
      await execute('git', ['add', 'templates/default/package-lock.json'], { cwd: directory });
      await execute(
        'git',
        ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'refresh'],
        { cwd: directory },
      );
      const refreshedHead = (await execute('git', ['rev-parse', 'HEAD'], { cwd: directory })).stdout.trim();
      const classify = workflow.jobs['validate-refresh'].steps.find(
        (value: { name: string }) => value.name === 'Require lock-only refresh',
      ).run as string;
      await execute('bash', ['-euo', 'pipefail', '-c', classify], {
        cwd: directory,
        env: { ...env, BASE_SHA: base, HEAD_SHA: refreshedHead },
      });
      await writeFile(
        join(directory, 'package-lock.json'),
        JSON.stringify({ packages: { '': { devDependencies: { oxfmt: '0.75.0' } } } }),
      );
      await execute('git', ['add', 'package-lock.json'], { cwd: directory });
      await execute(
        'git',
        ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'policy change'],
        { cwd: directory },
      );
      const policyHead = (await execute('git', ['rev-parse', 'HEAD'], { cwd: directory })).stdout.trim();
      await expect(
        execute('bash', ['-euo', 'pipefail', '-c', classify], {
          cwd: directory,
          env: { ...env, BASE_SHA: refreshedHead, HEAD_SHA: policyHead },
        }),
      ).rejects.toThrow(/Command failed/);
      await writeFile(
        join(template, 'package.json'),
        JSON.stringify({ ...ranged, dependencies: { ...ranged.dependencies, [name]: '*' } }),
      );
      await execute('git', ['add', 'templates/default/package.json'], { cwd: directory });
      await execute(
        'git',
        ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'range change'],
        { cwd: directory },
      );
      const rangeHead = (await execute('git', ['rev-parse', 'HEAD'], { cwd: directory })).stdout.trim();
      await expect(
        execute('bash', ['-euo', 'pipefail', '-c', classify], {
          cwd: directory,
          env: { ...env, BASE_SHA: policyHead, HEAD_SHA: rangeHead },
        }),
      ).rejects.toThrow(/Command failed/);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
}

test('requires successful designated validation for the exact PR HEAD before enabling automatic merge', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forge-refresh-checks-'));
  const sha = 'a'.repeat(40);
  try {
    const gh = join(directory, 'gh');
    await writeFile(
      gh,
      `#!/bin/bash\nset -eu\ncase "$1 $2" in\n  'pr view') echo "$ACTUAL_HEAD" ;;\n  'api repos/owner/repo/commits/${sha}/check-runs?check_name=Validate%20authoring%20refresh&per_page=100') printf '%s' "$CHECKS" ;;\n  'pr merge') printf '%s\\n' "$*" > "$MERGE_RECORD" ;;\n  *) exit 99 ;;\n
esac\n`,
    );
    await chmod(gh, 0o755);
    await writeFile(join(directory, 'sleep'), '#!/bin/bash\nexit 98\n');
    await chmod(join(directory, 'sleep'), 0o755);
    const env = {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      GITHUB_REPOSITORY: 'owner/repo',
      GH_READ_TOKEN: 'read-only-fixture',
      EXPECTED_HEAD: sha,
      ACTUAL_HEAD: sha,
      PACKAGE: 'content-model',
      MERGE_RECORD: join(directory, 'merge'),
    };
    const checks = (head_sha: string, conclusion: string) =>
      JSON.stringify({
        check_runs: [
          {
            name: 'Validate authoring refresh',
            id: 1,
            app: { slug: 'github-actions' },
            head_sha,
            status: 'completed',
            conclusion,
          },
        ],
      });
    await expect(
      execute('bash', ['-euo', 'pipefail', '-c', step('Enable checked synchronization auto-merge')], {
        env: { ...env, CHECKS: checks(sha, 'failure') },
      }),
    ).rejects.toThrow(/Command failed/);
    await expect(
      execute('bash', ['-euo', 'pipefail', '-c', step('Enable checked synchronization auto-merge')], {
        env: { ...env, ACTUAL_HEAD: 'b'.repeat(40), CHECKS: checks(sha, 'success') },
      }),
    ).rejects.toThrow(/Command failed/);
    await expect(
      execute('bash', ['-euo', 'pipefail', '-c', step('Enable checked synchronization auto-merge')], {
        env: { ...env, CHECKS: checks('b'.repeat(40), 'success') },
      }),
    ).rejects.toThrow(/Command failed/);
    await expect(
      execute('bash', ['-euo', 'pipefail', '-c', step('Enable checked synchronization auto-merge')], {
        env: { ...env, CHECKS: checks(sha, 'success').replace('Validate authoring refresh', 'Repository quality') },
      }),
    ).rejects.toThrow(/Command failed/);
    await expect(readFile(env.MERGE_RECORD)).rejects.toThrow(/ENOENT/);
    await execute('bash', ['-euo', 'pipefail', '-c', step('Enable checked synchronization auto-merge')], {
      env: { ...env, CHECKS: checks(sha, 'success') },
    });
    expect(await readFile(env.MERGE_RECORD, 'utf8')).toContain(`--auto --squash --match-head-commit ${sha}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
