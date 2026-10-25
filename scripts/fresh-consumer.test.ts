import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import { selectGenerator } from './fresh-consumer.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture(version: string) {
  const root = await mkdtemp(join(tmpdir(), 'forge-selection-'));
  roots.push(root);
  await mkdir(join(root, 'package'));
  await writeFile(join(root, 'package/package.json'), JSON.stringify({ name: '@rm-industries/create-forge', version }));
  execFileSync('tar', ['-czf', join(root, 'candidate.tgz'), '-C', root, 'package']);
  const bytes = await readFile(join(root, 'candidate.tgz'));
  return { root, bytes, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` };
}

test('published latest below 2 reports inactive while candidate rehearsal stays active', async () => {
  const { root, bytes, integrity } = await fixture('1.3.0');
  const fetcher = async (url: string | URL | Request) =>
    new Response(
      String(url).endsWith('/latest')
        ? JSON.stringify({
            name: '@rm-industries/create-forge',
            version: '1.3.0',
            dist: { tarball: 'https://registry.npmjs.org/candidate.tgz', integrity },
          })
        : bytes,
    );
  const stable = await selectGenerator({ target: 'stable', output: join(root, 'stable'), fetcher });
  expect(stable.state).toBe('inactive');
  const candidate = await selectGenerator({
    target: 'candidate',
    output: join(root, 'candidate'),
    candidate: join(root, 'candidate.tgz'),
    source: 'test-sha',
  });
  expect(candidate.state).toBe('active');
});

test('stable uses the recorded artifact once even when latest changes and a local candidate is repaired', async () => {
  const stable = await fixture('2.0.0');
  const repaired = await fixture('2.0.1');
  let metadataReads = 0;
  const selected = await selectGenerator({
    target: 'stable',
    output: join(stable.root, 'selected'),
    candidate: join(repaired.root, 'candidate.tgz'),
    fetcher: async (url) => {
      if (String(url).endsWith('/latest')) {
        metadataReads++;
        return new Response(
          JSON.stringify({
            name: '@rm-industries/create-forge',
            version: metadataReads === 1 ? '2.0.0' : '2.0.1',
            dist: { tarball: 'https://registry.npmjs.org/stable.tgz', integrity: stable.integrity },
          }),
        );
      }
      return new Response(stable.bytes);
    },
  });
  expect(selected).toMatchObject({ version: '2.0.0', state: 'active', integrity: stable.integrity });
  expect(metadataReads).toBe(1);
  expect(await readFile(join(stable.root, 'selected/create-forge.tgz'))).toEqual(stable.bytes);
});

test('stable rejects altered downloads and metadata that disagrees with the artifact', async () => {
  const stable = await fixture('2.0.0');
  for (const [name, version, integrity, message] of [
    ['corrupt', '2.0.0', 'sha512-YmFk', /integrity mismatch/],
    ['mismatch', '2.0.1', stable.integrity, /version disagree/],
    ['prerelease', '2.0.0-rc.1', stable.integrity, /stable semantic version/],
  ] as const) {
    await expect(
      selectGenerator({
        target: 'stable',
        output: join(stable.root, name),
        fetcher: async (url) =>
          new Response(
            String(url).endsWith('/latest')
              ? JSON.stringify({
                  name: '@rm-industries/create-forge',
                  version,
                  dist: { tarball: 'https://registry.npmjs.org/stable.tgz', integrity },
                })
              : stable.bytes,
          ),
      }),
    ).rejects.toThrow(message);
  }
});

test('a broken selected stable fails rather than running the repaired candidate on main', async () => {
  const { validateFreshConsumer } = await import('./fresh-consumer.ts');
  const stable = await fixture('2.0.0');
  const selected = join(stable.root, 'selected');
  await selectGenerator({
    target: 'stable',
    output: selected,
    fetcher: async (url) =>
      new Response(
        String(url).endsWith('/latest')
          ? JSON.stringify({
              name: '@rm-industries/create-forge',
              version: '2.0.0',
              dist: { tarball: 'https://registry.npmjs.org/broken.tgz', integrity: stable.integrity },
            })
          : stable.bytes,
      ),
  });
  await expect(validateFreshConsumer(selected, join(stable.root, 'evidence'))).rejects.toThrow(/create-forge failed/);
  expect(JSON.parse(await readFile(join(stable.root, 'evidence/identity.json'), 'utf8')).version).toBe('2.0.0');
});

test('fresh candidate rejects bundled consumer snapshots', async () => {
  const candidate = await fixture('2.0.0');
  await mkdir(join(candidate.root, 'package/dist/template'), { recursive: true });
  await writeFile(join(candidate.root, 'package/dist/template/package-lock.json'), '{}');
  execFileSync('tar', ['-czf', join(candidate.root, 'locked.tgz'), '-C', candidate.root, 'package']);
  await expect(
    selectGenerator({
      target: 'candidate',
      output: join(candidate.root, 'selected'),
      candidate: join(candidate.root, 'locked.tgz'),
      source: 'sha',
    }),
  ).rejects.toThrow(/must not bundle/);
});

test('weekly acceptance retains supported runtimes and reserves full browser budgets for primary Ubuntu', async () => {
  const { freshConsumerMatrix } = await import('./fresh-consumer.ts');
  expect(freshConsumerMatrix('weekly')).toEqual({
    include: [
      { os: 'ubuntu-latest', node: '22.23.4', npm: '10.9.0', probe: 'quality' },
      { os: 'ubuntu-latest', node: '22.x', npm: '11', probe: 'quality' },
      { os: 'ubuntu-latest', node: '24.x', npm: '11', probe: 'quality' },
      { os: 'ubuntu-latest', node: '26.x', npm: '11', probe: 'weekly' },
      { os: 'macos-latest', node: '26.x', npm: '11', probe: 'quality' },
    ],
  });
  expect(freshConsumerMatrix('daily')).toEqual({
    include: [{ os: 'ubuntu-latest', node: '26.x', npm: '11', probe: 'daily' }],
  });
  expect(() => freshConsumerMatrix('invalid')).toThrow(/Invalid coverage/);
});
