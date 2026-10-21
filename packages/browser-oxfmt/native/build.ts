import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const native = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(native, '..');
const root = resolve(packageRoot, '../..');
const upstream = join(native, '.upstream');
const generated = join(packageRoot, 'src/generated');
const sourceSha = '2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609';
const archiveSha = '0581446634d6ce5a59947bf87d720a3b85ede4a5e7c831eb02ba82d3223a9584';
const inputs = ['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'src/formatter.rs', 'build.ts'];
const outputs = ['engine.js', 'engine_bg.wasm', 'engine.d.ts', 'engine_bg.wasm.d.ts'];
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function run(command: string, args: string[], options: Omit<SpawnSyncOptions, 'encoding'> = {}) {
  const result = spawnSync(command, args, { maxBuffer: 20 * 1024 * 1024, ...options, encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(
      `${command} failed: ${result.stderr || result.error || result.stdout}. See packages/browser-oxfmt/README.md for native toolchain setup.`,
    );
  return result.stdout;
}
async function verifyGenerated() {
  const identity = JSON.parse(await readFile(join(generated, 'identity.json'), 'utf8')) as {
    buildInputs: Record<string, string>;
    assets: Record<string, string>;
    noticesSha256: string;
  };
  for (const file of inputs) {
    const path = `packages/browser-oxfmt/native/${file}`;
    assert.equal(
      hash(await readFile(join(root, path))),
      identity.buildInputs[path],
      `Regenerate native assets after changing ${path}`,
    );
  }
  for (const file of outputs)
    assert.equal(
      hash(await readFile(join(generated, file))),
      identity.assets[file],
      `Invalid generated asset: ${file}`,
    );
  assert.equal(hash(await readFile(join(packageRoot, 'NOTICE.md'))), identity.noticesSha256);
  const module = new WebAssembly.Module(await readFile(join(generated, 'engine_bg.wasm')));
  assert.ok(
    !WebAssembly.Module.exports(module).some(({ name }) => ['alloc', 'release'].includes(name)),
    'Use maintained bindings',
  );
}
async function prepareUpstream() {
  try {
    if ((await readFile(join(upstream, '.forge-source'), 'utf8')) === sourceSha) return;
  } catch {
    /* No verified source cache yet. */
  }
  const download = join(native, '.download');
  await mkdir(download);
  try {
    const response = await fetch(`https://api.github.com/repos/oxc-project/oxc/tarball/${sourceSha}`);
    if (!response.ok) throw new Error(`Upstream download failed: ${response.status}`);
    const archive = Buffer.from(await response.arrayBuffer());
    if (hash(archive) !== archiveSha) throw new Error('Upstream archive checksum mismatch');
    await writeFile(join(download, 'source.tar.gz'), archive);
    await mkdir(join(download, 'source'));
    run('tar', ['-xzf', join(download, 'source.tar.gz'), '-C', join(download, 'source'), '--strip-components=1']);
    await writeFile(join(download, 'source/.forge-source'), sourceSha);
    await rm(upstream, { recursive: true, force: true });
    await rename(join(download, 'source'), upstream);
  } finally {
    await rm(download, { recursive: true, force: true });
  }
}
async function main() {
  if (process.argv.includes('--copy')) {
    await verifyGenerated();
    await cp(generated, join(packageRoot, 'dist/generated'), { recursive: true });
    return;
  }
  const check = process.argv.includes('--check');
  if (!check && !process.argv.includes('--force')) {
    try {
      await verifyGenerated();
      return;
    } catch {
      /* Generate missing, stale or damaged outputs. */
    }
  }
  assert.match(run('rustc', ['--version']), /^rustc 1\.97\.0 /);
  await prepareUpstream();
  const env = {
    ...process.env,
    RUSTFLAGS: `--remap-path-prefix=${packageRoot}=/forge --remap-path-prefix=${process.env.CARGO_HOME ?? join(homedir(), '.cargo')}=/cargo`,
  };
  if (check) {
    run('rustfmt', ['--edition', '2024', '--check', join(native, 'src/lib.rs'), join(native, 'src/formatter.rs')]);
    run(
      'cargo',
      [
        'clippy',
        '--locked',
        '--target',
        'wasm32-unknown-unknown',
        '--manifest-path',
        join(native, 'Cargo.toml'),
        '--no-deps',
        '--',
        '-D',
        'warnings',
      ],
      { env },
    );
    return;
  }
  const bindings = process.env.WASM_BINDGEN ?? 'wasm-bindgen';
  assert.equal(run(bindings, ['--version']).trim(), 'wasm-bindgen 0.2.114');
  run(
    'cargo',
    [
      'build',
      '--locked',
      '--release',
      '--target',
      'wasm32-unknown-unknown',
      '--manifest-path',
      join(native, 'Cargo.toml'),
    ],
    { env },
  );
  await mkdir(generated, { recursive: true });
  const target = process.env.CARGO_TARGET_DIR ?? join(native, 'target');
  run(bindings, [
    '--target',
    'web',
    '--out-dir',
    generated,
    '--out-name',
    'engine',
    join(target, 'wasm32-unknown-unknown/release/forge_browser_oxfmt.wasm'),
  ]);
  const metadata = JSON.parse(
    run('cargo', ['metadata', '--locked', '--format-version', '1', '--manifest-path', join(native, 'Cargo.toml')], {
      env,
    }),
  ) as {
    packages: {
      id: string;
      name: string;
      version: string;
      license?: string;
      license_file?: string;
      manifest_path: string;
    }[];
  };
  const fenced = (text: string) => {
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
    const directory = dirname(pkg.manifest_path);
    const files = (await readdir(directory)).filter((name) => /^(license|copying)([._-]|$)/i.test(name));
    if (pkg.license_file && !files.includes(pkg.license_file)) files.push(pkg.license_file);
    if (!files.length && directory.startsWith(`${upstream}/`))
      notices.push(fenced(await readFile(join(upstream, 'LICENSE'), 'utf8')));
    for (const file of files) {
      try {
        notices.push(fenced(await readFile(join(directory, file), 'utf8')));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EISDIR') throw error;
      }
    }
  }
  const notice = notices.map((text) => text.trim()).join('\n\n') + '\n';
  await writeFile(join(packageRoot, 'NOTICE.md'), notice);
  const buildInputs: Record<string, string> = {};
  for (const file of inputs)
    buildInputs[`packages/browser-oxfmt/native/${file}`] = hash(await readFile(join(native, file)));
  const assets: Record<string, string> = {};
  for (const file of outputs) assets[file] = hash(await readFile(join(generated, file)));
  await writeFile(
    join(generated, 'identity.json'),
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
        cargoLockSha256: hash(await readFile(join(native, 'Cargo.lock'))),
        noticesSha256: hash(Buffer.from(notice)),
        assets,
      },
      null,
      2,
    ) + '\n',
  );
  await verifyGenerated();
  console.log(JSON.stringify({ sourceSha, assets }, null, 2));
}
await main();
