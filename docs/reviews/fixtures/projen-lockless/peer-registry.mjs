import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export async function resolveFixture({ host, peer, optional = false, multiple = false }) {
  const root = await mkdtemp(join(tmpdir(), 'forge-peer-fixture-'));
  const packages = {
    'fixture-host': ['1.0.0', '1.5.0', '2.0.0'].map((version) => ({ name: 'fixture-host', version })),
    'fixture-model': (multiple ? ['1.0.0', '1.1.0'] : ['1.0.0']).map((version) => ({
      name: 'fixture-model',
      version,
      peerDependencies: { 'fixture-host': multiple && version === '1.1.0' ? '^2.0.0' : peer },
      ...(optional ? { peerDependenciesMeta: { 'fixture-host': { optional: true } } } : {}),
    })),
  };
  const tarballs = new Map();
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
    if (tarballs.has(path)) {
      response.setHeader('Content-Type', 'application/octet-stream');
      response.end(tarballs.get(path));
    } else if (packages[path]) {
      const versions = Object.fromEntries(
        packages[path].map((pkg) => {
          const filename = `${pkg.name}-${pkg.version}.tgz`;
          const bytes = tarballs.get(filename);
          return [
            pkg.version,
            {
              ...pkg,
              dist: {
                tarball: `http://127.0.0.1:${server.address().port}/${filename}`,
                integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
              },
            },
          ];
        }),
      );
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ name: path, 'dist-tags': { latest: packages[path].at(-1).version }, versions }));
    } else {
      response.writeHead(404);
      response.end('{}');
    }
  });
  try {
    for (const pkg of Object.values(packages).flat()) {
      const stage = join(root, pkg.name, pkg.version);
      await mkdir(join(stage, 'package'), { recursive: true });
      await writeFile(join(stage, 'package/package.json'), JSON.stringify(pkg));
      const filename = `${pkg.name}-${pkg.version}.tgz`;
      await execute('tar', ['-czf', join(root, filename), '-C', stage, 'package']);
      tarballs.set(filename, await readFile(join(root, filename)));
    }
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'fixture-consumer',
        version: '1.0.0',
        private: true,
        dependencies: { 'fixture-model': '^1.0.0', ...(host ? { 'fixture-host': host } : {}) },
      }),
    );
    const args = [
      'install',
      '--package-lock-only',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--fetch-retries=0',
      '--fetch-timeout=10000',
      `--strict-peer-deps=${process.env.FORGE_PEER_STRICT === 'true'}`,
      `--registry=http://127.0.0.1:${server.address().port}`,
    ];
    const command = process.env.NPM_CLI ? process.execPath : 'npm';
    if (process.env.NPM_CLI) args.unshift(process.env.NPM_CLI);
    try {
      await execute(command, args, {
        cwd: root,
        env: { ...process.env, npm_config_cache: join(root, 'cache') },
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
      return {
        code: 0,
        versions: Object.fromEntries(Object.entries(lock.packages).map(([path, pkg]) => [path, pkg.version])),
      };
    } catch (error) {
      return { code: error.code, error: error.stderr, versions: {} };
    }
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}
