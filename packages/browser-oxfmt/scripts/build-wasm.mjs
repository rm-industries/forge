import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const packageRoot = join(root, 'packages/browser-oxfmt');
const sourceSha = '2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609';
const archiveSha = '0581446634d6ce5a59947bf87d720a3b85ede4a5e7c831eb02ba82d3223a9584';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.status !== 0) throw Error(`${command} failed: ${result.stderr || result.error || result.stdout}`);
  return result.stdout;
}
assert.match(run('rustc', ['--version']), /^rustc 1\.97\.0 /);
const bindings = process.env.WASM_BINDGEN ?? 'wasm-bindgen';
assert.equal(run(bindings, ['--version']).trim(), 'wasm-bindgen 0.2.114');
const staging = join(packageRoot, '.wasm-build');
await mkdir(staging);
try {
  const experiment = join(staging, 'experiments/browser-oxfmt');
  const wrapper = join(staging, 'packages/browser-oxfmt/wasm');
  await mkdir(experiment, { recursive: true });
  const response = await fetch(`https://api.github.com/repos/oxc-project/oxc/tarball/${sourceSha}`);
  if (!response.ok) throw Error(`Upstream download failed: ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  assert.equal(hash(archive), archiveSha);
  await writeFile(join(staging, 'upstream.tar.gz'), archive);
  await mkdir(join(experiment, 'source'));
  run('tar', ['-xzf', join(staging, 'upstream.tar.gz'), '-C', join(experiment, 'source'), '--strip-components=1']);
  await cp(join(root, 'experiments/browser-oxfmt/wrapper'), join(experiment, 'wrapper'), {
    recursive: true,
    filter: (path) => !path.includes('/target'),
  });
  await cp(join(packageRoot, 'wasm'), wrapper, { recursive: true, filter: (path) => !path.includes('/target') });
  const env = {
    ...process.env,
    RUSTFLAGS: `--remap-path-prefix=${staging}=/forge --remap-path-prefix=${process.env.CARGO_HOME ?? join(homedir(), '.cargo')}=/cargo`,
  };
  run(
    'cargo',
    [
      'build',
      '--locked',
      '--release',
      '--target',
      'wasm32-unknown-unknown',
      '--manifest-path',
      join(wrapper, 'Cargo.toml'),
    ],
    { env },
  );
  const target = process.env.CARGO_TARGET_DIR ?? join(wrapper, 'target');
  const assets = join(packageRoot, 'assets');
  await mkdir(assets, { recursive: true });
  run(bindings, [
    '--target',
    'web',
    '--out-dir',
    assets,
    '--out-name',
    'engine',
    join(target, 'wasm32-unknown-unknown/release/forge_browser_oxfmt.wasm'),
  ]);
  const buildInputs = {};
  for (const file of [
    'packages/browser-oxfmt/wasm/Cargo.toml',
    'packages/browser-oxfmt/wasm/Cargo.lock',
    'packages/browser-oxfmt/wasm/src/lib.rs',
    'experiments/browser-oxfmt/wrapper/Cargo.toml',
    'experiments/browser-oxfmt/wrapper/src/lib.rs',
    'packages/browser-oxfmt/scripts/build-wasm.mjs',
  ])
    buildInputs[file] = hash(await readFile(join(root, file)));
  const files = {};
  for (const filename of ['engine.js', 'engine_bg.wasm', 'engine.d.ts', 'engine_bg.wasm.d.ts'])
    files[filename] = hash(await readFile(join(assets, filename)));
  await writeFile(
    join(assets, 'identity.json'),
    JSON.stringify(
      {
        upstreamVersion: '0.72.0',
        buildPlatform: process.platform,
        buildArch: process.arch,
        sourceSha,
        archiveSha,
        rustVersion: '1.97.0',
        bindingsVersion: '0.2.114',
        buildInputs,
        cargoLockSha256: hash(await readFile(join(wrapper, 'Cargo.lock'))),
        assets: files,
      },
      null,
      2,
    ) + '\n',
  );
  const metadata = JSON.parse(
    run('cargo', ['metadata', '--locked', '--format-version', '1', '--manifest-path', join(wrapper, 'Cargo.toml')], {
      env,
    }),
  );
  const fenced = (text) => {
    const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)));
    return `${fence}text\n${text
      .trim()
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')}\n${fence}`;
  };
  const notices = [
    '# Native engine license notices\n\n<!-- markdownlint-disable MD010 -->\n\nGenerated from the pinned Cargo dependency graph.\n',
  ];
  for (const pkg of metadata.packages.sort((a, b) => a.id.localeCompare(b.id))) {
    notices.push(`## ${pkg.name} ${pkg.version}\n\nLicense: ${pkg.license ?? 'See source license'}\n`);
    const dir = dirname(pkg.manifest_path);
    const filenames = (await readdir(dir)).filter((name) => /^(license|copying)([._-]|$)/i.test(name));
    if (pkg.license_file && !filenames.includes(pkg.license_file)) filenames.push(pkg.license_file);
    if (!filenames.length && dir.includes('/source/'))
      notices.push(fenced(await readFile(join(experiment, 'source/LICENSE'), 'utf8')));
    for (const filename of filenames) {
      try {
        notices.push(fenced(await readFile(join(dir, filename), 'utf8')));
      } catch (error) {
        if (error.code !== 'EISDIR') throw error;
      }
    }
  }
  await writeFile(join(packageRoot, 'NOTICE.md'), notices.map((text) => text.trim()).join('\n\n') + '\n');
  console.log(JSON.stringify({ sourceSha, assets: files }, null, 2));
} finally {
  await rm(staging, { recursive: true, force: true });
}
