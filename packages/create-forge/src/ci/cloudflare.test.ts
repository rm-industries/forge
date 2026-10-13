import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { cloudflareDeployCommand, cloudflareProjectCheckScript } from './cloudflare.ts';

test('deploys only the artifact even when the source contains Functions and Wrangler config', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'forge-cloudflare-isolation-'));
  try {
    await mkdir(join(fixture, 'dist'), { recursive: true });
    await mkdir(join(fixture, 'functions'));
    await writeFile(join(fixture, 'dist/index.html'), 'validated artifact');
    await writeFile(join(fixture, 'functions/unchecked.js'), 'unchecked source');
    await writeFile(join(fixture, 'wrangler.json'), '{"unchecked":"source config"}');
    const toolDirectory = join(fixture, 'tools/cloudflare/node_modules/wrangler/bin');
    await mkdir(toolDirectory, { recursive: true });
    await writeFile(
      join(toolDirectory, 'wrangler.js'),
      `const fs = require('node:fs'); fs.writeFileSync(process.env.RECORD, JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2),functions:fs.existsSync('functions'),config:JSON.parse(fs.readFileSync('wrangler.json','utf8')),artifact:fs.readFileSync('public/index.html','utf8')}));`,
    );
    const recordPath = join(fixture, 'record.json');
    const result = spawnSync(
      'bash',
      [
        '-e',
        '-c',
        cloudflareDeployCommand({
          name: 'production',
          sourceBranch: 'main',
          target: 'cloudflare-pages',
          project: 'example-site',
          url: 'https://example.com',
        }),
      ],
      {
        cwd: fixture,
        env: {
          ...process.env,
          RECORD: recordPath,
          CLOUDFLARE_ACCOUNT_ID: 'test-account',
          CLOUDFLARE_API_TOKEN: 'test-token',
        },
        encoding: 'utf8',
      },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const record = JSON.parse(await readFile(recordPath, 'utf8'));
    expect(record.cwd).not.toBe(fixture);
    expect(record.functions).toBe(false);
    expect(record.config).toEqual({ pages_build_output_dir: 'public' });
    expect(record.artifact).toBe('validated artifact');
    expect(record.args).not.toContain('--config');
    expect(await readFile(join(fixture, 'functions/unchecked.js'), 'utf8')).toBe('unchecked source');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('the generated project check accepts only an existing Direct Upload project with the expected production branch', async () => {
  const run = new (Object.getPrototypeOf(async () => {}).constructor)('fetch', 'process', cloudflareProjectCheckScript);
  const context = {
    argv: ['node', 'example-site', 'main'],
    env: { CLOUDFLARE_ACCOUNT_ID: 'test-account', CLOUDFLARE_API_TOKEN: 'test-token' },
  };
  await expect(
    run(
      async () => ({
        ok: true,
        json: async () => ({ success: true, result: { name: 'example-site', production_branch: 'main' } }),
      }),
      context,
    ),
  ).resolves.toBeUndefined();
  for (const result of [
    { name: 'example-site', production_branch: 'dev' },
    { name: 'wrong', production_branch: 'main' },
    { name: 'example-site', production_branch: 'main', source: { type: 'github' } },
  ])
    await expect(
      run(async () => ({ ok: true, json: async () => ({ success: true, result }) }), context),
    ).rejects.toThrow('Expected an existing Direct Upload');
  await expect(run(async () => ({ ok: false, json: async () => ({ success: false }) }), context)).rejects.toThrow(
    'Expected an existing Direct Upload',
  );
});
