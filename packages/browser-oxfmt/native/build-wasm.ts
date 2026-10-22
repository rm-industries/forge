import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const native = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(native, '..');
const root = resolve(packageRoot, '../..');
const generated = join(packageRoot, 'src/generated');
// Keep the JS bindings CLI aligned with Cargo when Dependabot updates wasm-bindgen.
const manifest = await readFile(join(native, 'Cargo.toml'), 'utf8');
const upstreamVersion = /tag = "oxfmt_v([^"]+)"/.exec(manifest)?.[1];
assert.ok(upstreamVersion, 'Select an Oxfmt release tag in native/Cargo.toml');
const bindingsVersion = /^wasm-bindgen = "=(\d+\.\d+\.\d+)"$/m.exec(manifest)?.[1];
assert.ok(bindingsVersion, 'Pin wasm-bindgen to an exact version in native/Cargo.toml');
const inputs = ['Cargo.toml', 'Cargo.lock', 'src/lib.rs', 'src/markdown_adapter.rs', 'build-wasm.ts'];
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
async function main() {
  if (process.argv.includes('--bindings-version')) {
    console.log(bindingsVersion);
    return;
  }
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
  const env = {
    ...process.env,
    RUSTFLAGS: `--remap-path-prefix=${packageRoot}=/forge --remap-path-prefix=${process.env.CARGO_HOME ?? join(homedir(), '.cargo')}=/cargo`,
  };
  if (check) {
    run('rustfmt', [
      '--edition',
      '2024',
      '--check',
      join(native, 'src/lib.rs'),
      join(native, 'src/markdown_adapter.rs'),
    ]);
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
  assert.equal(run(bindings, ['--version']).trim(), `wasm-bindgen ${bindingsVersion}`);
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
      source?: string;
    }[];
  };
  const upstreamPackage = metadata.packages.find((pkg) => pkg.name === 'oxc_formatter_markdown');
  assert.ok(upstreamPackage, 'Cargo metadata must include the Markdown formatter');
  assert.equal(upstreamPackage.version, upstreamVersion, 'Cargo must match the selected Oxfmt release');
  const sourceSha = upstreamPackage.source?.split('#').at(-1);
  assert.match(sourceSha ?? '', /^[a-f0-9]{40}$/, 'Cargo must resolve an exact upstream commit');
  const upstreamRoot = resolve(dirname(upstreamPackage.manifest_path), '../..');
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
    if (!files.length && pkg.source?.startsWith('git+https://github.com/oxc-project/oxc'))
      notices.push(fenced(await readFile(join(upstreamRoot, 'LICENSE'), 'utf8')));
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
        upstreamVersion,
        buildPlatform: process.platform,
        buildArch: process.arch,
        sourceSha,
        rustVersion: '1.97.0',
        bindingsVersion,
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
