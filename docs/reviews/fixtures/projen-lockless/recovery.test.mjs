import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const cli = process.env.FORGE_CLI_EXE;

function invoke(root, registry) {
  const child = spawn(process.execPath, [cli, join(root, 'site'), '--yes', '--no-git'], {
    cwd: root,
    env: {
      ...process.env,
      npm_config_registry: registry,
      npm_config_cache: join(root, 'cache'),
      npm_config_fetch_retries: '0',
      npm_config_fetch_timeout: '3000',
    },
    signal: AbortSignal.timeout(20000),
  });
  let output = '';
  child.stdout.on('data', (data) => {
    output += data;
  });
  child.stderr.on('data', (data) => {
    output += data;
  });
  const finished = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, output }));
  });
  return { child, finished };
}

test('failed registry access preserves the materialized project and a failure exit', { skip: !cli }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-network-recovery-'));
  try {
    const { finished } = invoke(root, 'http://127.0.0.1:9');
    const result = await finished;
    assert.equal(result.code, 1, result.output);
    assert.match(result.output, /generated project remains/i);
    await access(join(root, 'site/package.json'));
    await access(join(root, 'site/src/pages/admin/index.astro'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SIGINT during actual npm resolution exits 130 and preserves generated source', { skip: !cli }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-signal-recovery-'));
  let received;
  const requested = new Promise((resolve) => {
    received = resolve;
  });
  const server = createServer(() => received());
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const { child, finished } = invoke(root, `http://127.0.0.1:${server.address().port}`);
    await Promise.race([
      requested,
      finished.then(() => {
        throw new Error('CLI exited before requesting registry metadata');
      }),
    ]);
    child.kill('SIGINT');
    const result = await finished;
    assert.equal(result.code, 130, result.output);
    assert.match(result.output, /interrupted/i);
    await access(join(root, 'site/package.json'));
    await access(join(root, 'site/src/pages/admin/index.astro'));
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
