import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn<typeof execFileSync>() }));

import { prepareOxfmtUpgrade, updateEngineText } from './prepare-oxfmt-upgrade.ts';

const nextSha = 'b'.repeat(40);
test('updates release versions without changing unrelated versions', () => {
  expect(updateEngineText('oxfmt_v0.72.0 0.72.0 0.1.0', '0.72.0', '0.73.0')).toBe('oxfmt_v0.73.0 0.73.0 0.1.0');
});
test('rejects downgrades and prereleases', () => {
  for (const version of ['0.71.0', '0.73.0-beta.1'])
    expect(() => updateEngineText('', '0.72.0', version)).toThrow(/forwards|Prerelease/);
});
test('current engine is a no-op without registry or GitHub access', async () => {
  const options = await readFile('packages/browser-oxfmt/native/Cargo.toml', 'utf8');
  const current = /tag = "oxfmt_v([^"]+)"/.exec(options)![1]!;
  expect(await prepareOxfmtUpgrade(process.cwd(), current)).toEqual({ changed: false, target: current });
  expect(execFileSync).not.toHaveBeenCalled();
});

test('prepares coordinated source pins and release metadata from a verified tag', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'forge-engine-upgrade-'));
  const target = '99.0.0';
  vi.mocked(execFileSync).mockImplementation((_command, args) => {
    const path = args![1] as string;
    return JSON.stringify(
      path.includes('contents/')
        ? { content: Buffer.from(JSON.stringify({ version: target })).toString('base64') }
        : { object: { type: 'commit', sha: nextSha } },
    );
  });
  try {
    await cp('packages/browser-oxfmt', join(cwd, 'packages/browser-oxfmt'), {
      recursive: true,
      filter: (path) => !/\/(?:node_modules|target|dist|generated)(?:\/|$)/.test(path),
    });
    await cp('package.json', join(cwd, 'package.json'));
    const original = await readFile(join(cwd, 'package.json'), 'utf8');
    vi.mocked(execFileSync)
      .mockReturnValueOnce(JSON.stringify({ object: { type: 'commit', sha: nextSha } }))
      .mockReturnValueOnce(JSON.stringify({ content: Buffer.from('{"version":"0.0.0"}').toString('base64') }));
    await expect(prepareOxfmtUpgrade(cwd, target)).rejects.toThrow(/Expected values/);
    expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe(original);
    const plan = await prepareOxfmtUpgrade(cwd, target);
    expect(plan).toMatchObject({ changed: true, target, sourceSha: nextSha });
    const read = (path: string) => readFile(join(cwd, path), 'utf8');
    expect(JSON.parse(await read('package.json')).devDependencies.oxfmt).toBe(target);
    expect(await read('packages/browser-oxfmt/native/Cargo.toml')).toContain(`tag = "oxfmt_v${target}"`);
    expect(await read('packages/browser-oxfmt/CHANGELOG.md')).toContain(`## ${plan.packageVersion}`);
  } finally {
    vi.mocked(execFileSync).mockReset();
    await rm(cwd, { recursive: true, force: true });
  }
});
