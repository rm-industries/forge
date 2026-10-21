import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gt, inc, valid } from 'semver';

const packageRoot = 'packages/browser-oxfmt';
const engineFiles = [
  'src/options.ts',
  'src/index.test.ts',
  'src/build.test.ts',
  'native/build.ts',
  'native/Cargo.toml',
  'test/packed-browser.ts',
  'test/template-integration.ts',
  'test/template-integration.patch',
  'README.md',
];

export function updateEngineText(text: string, previous: string, target: string, sha: string, nextSha: string) {
  assert.equal(valid(target), target, 'Use an exact stable Oxfmt version');
  assert.ok(!target.includes('-'), 'Prerelease upgrades require manual review');
  assert.match(nextSha, /^[a-f0-9]{40}$/);
  assert.ok(gt(target, previous), 'Engine updates must move forwards');
  return text.replaceAll(previous, target).replaceAll(sha, nextSha);
}

export async function prepareOxfmtUpgrade(cwd: string, target: string) {
  assert.equal(valid(target), target, 'Use an exact Oxfmt version');
  assert.ok(!target.includes('-'), 'Prerelease upgrades require manual review');
  const options = await readFile(resolve(cwd, packageRoot, 'src/options.ts'), 'utf8');
  const previous = /upstreamVersion: '([^']+)'/.exec(options)?.[1];
  const sha = /sourceSha: '([^']+)'/.exec(options)?.[1];
  assert.ok(previous && sha, 'Missing engine identity');
  if (target === previous) return { changed: false, target };
  assert.ok(gt(target, previous), 'Engine updates must move forwards');
  const api = (path: string) => execFileSync('gh', ['api', `repos/oxc-project/oxc/${path}`], { encoding: 'utf8' });
  const tag = JSON.parse(api(`git/ref/tags/oxfmt_v${target}`)) as { object: { type: string; sha: string } };
  const nextSha =
    tag.object.type === 'tag'
      ? (JSON.parse(api(`git/tags/${tag.object.sha}`)) as { object: { sha: string } }).object.sha
      : tag.object.sha;
  assert.match(nextSha, /^[a-f0-9]{40}$/);
  const upstream = JSON.parse(api(`contents/apps/oxfmt/package.json?ref=${nextSha}`)) as { content: string };
  assert.equal(JSON.parse(Buffer.from(upstream.content, 'base64').toString()).version, target);
  // Resolve and verify every input before writing any files.
  const edits = await Promise.all(
    engineFiles.map(async (file) => {
      const path = resolve(cwd, packageRoot, file);
      return [path, updateEngineText(await readFile(path, 'utf8'), previous, target, sha, nextSha)] as const;
    }),
  );
  const rootPath = resolve(cwd, 'package.json');
  const root = JSON.parse(await readFile(rootPath, 'utf8'));
  root.devDependencies.oxfmt = target;
  edits.push([rootPath, `${JSON.stringify(root, null, 2)}\n`]);
  const manifestPath = resolve(cwd, packageRoot, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.version = inc(manifest.version, 'patch');
  assert.ok(manifest.version);
  edits.push([manifestPath, `${JSON.stringify(manifest, null, 2)}\n`]);
  const changelogPath = resolve(cwd, packageRoot, 'CHANGELOG.md');
  const changelog = await readFile(changelogPath, 'utf8');
  assert.ok(changelog.includes('\n## '), 'Missing changelog release section');
  edits.push([
    changelogPath,
    changelog.replace(
      '\n## ',
      `\n## ${manifest.version}\n\n- Update the native Oxfmt engine from ${previous} to ${target}.\n\n## `,
    ),
  ]);
  await Promise.all(edits.map(([path, content]) => writeFile(path, content)));
  return { changed: true, previous, target, sourceSha: nextSha, packageVersion: manifest.version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  assert.ok(target, 'Pass an exact target Oxfmt version');
  console.log(JSON.stringify(await prepareOxfmtUpgrade(process.cwd(), target)));
}
