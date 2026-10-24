// cspell:words pipefail
// Controlled command boundary: no npm or GitHub publication is possible.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = process.env.FORGE_SOURCE || process.cwd();
const root = fs.mkdtempSync('/tmp/forge-release-publication-');
const workflow = fs.readFileSync(path.join(source, '.github/workflows/package-release.yml'), 'utf8');
const step = (name) => {
  const section = workflow.split(`      - name: ${name}\n`)[1];
  assert(section, name);
  return section
    .split(/        run: \|-?\n/)[1]
    .split(/\n      - name:/)[0]
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n');
};
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};
const bin = path.join(root, 'bin');
write(
  path.join(bin, 'npm'),
  `#!/usr/bin/env node
const fs=require('fs'),a=process.argv.slice(2),p=process.env.STATE,s=JSON.parse(fs.readFileSync(p));
if(a[0]==='view'){s.reads++;fs.writeFileSync(p,JSON.stringify(s));if(s.unavailable||!s.registry)process.exit(1);console.log(JSON.stringify(s.registry));}
else if(a[0]==='publish'){s.calls.push(a);fs.writeFileSync(p,JSON.stringify(s));if(s.reject)process.exit(1);s.registry={version:process.env.VERSION,dist:{integrity:'sha512-'+require('crypto').createHash('sha512').update(fs.readFileSync(a[1])).digest('base64')}};fs.writeFileSync(p,JSON.stringify(s));}
else process.exit(90);
`,
);
write(
  path.join(bin, 'gh'),
  `#!/usr/bin/env node
const fs=require('fs'),a=process.argv.slice(2),p=process.env.STATE,s=JSON.parse(fs.readFileSync(p));
if(a[0]==='api'&&a[1].includes('/commits/')){if(!s.tag)process.exit(1);console.log(s.tag);}
else {s.gh.push(a);fs.writeFileSync(p,JSON.stringify(s));}
`,
);
write(path.join(bin, 'sleep'), '#!/bin/sh\nexit 0\n');
for (const file of fs.readdirSync(bin)) fs.chmodSync(path.join(bin, file), 0o755);
const inspectedIntegrity = 'sha512-' + crypto.createHash('sha512').update('inspected fixture bytes').digest('base64');
const results = [];
function scenario(name, options = {}) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  const integrity = options.release?.tarball?.integrity || inspectedIntegrity;
  write(path.join(dir, '.release/release.json'), {
    packageName: '@rm-industries/content-model',
    version: '1.2.1',
    gitSha: 'abc123',
    tarball: { filename: 'inspected.tgz', integrity },
    releaseNotes: 'Fixture',
    ...options.release,
  });
  if (options.artifact) fs.copyFileSync(options.artifact, path.join(dir, '.release', options.release.tarball.filename));
  else write(path.join(dir, '.release/inspected.tgz'), 'inspected fixture bytes');
  write(path.join(dir, 'state.json'), { reads: 0, calls: [], gh: [], tag: 'abc123', ...options });
  const env = {
    ...process.env,
    PATH: bin + path.delimiter + process.env.PATH,
    STATE: path.join(dir, 'state.json'),
    EXPECTED: integrity,
    GITHUB_SHA: 'abc123',
    GITHUB_REPOSITORY: 'fixture/only',
    GITHUB_OUTPUT: path.join(dir, 'output'),
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    NPM_TAG: 'latest',
    PACKAGE_NAME: options.release?.packageName || '@rm-industries/content-model',
    VERSION: options.release?.version || '1.2.1',
    RELEASE_TAG: options.release?.releaseTag || 'content-model-v1.2.1',
    ALREADY_PUBLISHED: 'false',
  };
  const execute = (name) =>
    cp.spawnSync('/bin/bash', ['-e', '-o', 'pipefail', '-c', step(name)], { cwd: dir, env, encoding: 'utf8' });
  let run = execute('Ensure immutable package tag');
  if (!run.status) run = execute('Publish with provenance');
  if (!run.status) {
    env.ALREADY_PUBLISHED = fs.readFileSync(env.GITHUB_OUTPUT, 'utf8').includes('=true') ? 'true' : 'false';
    run = execute('Verify registry publication');
  }
  if (!run.status && env.PACKAGE_NAME === '@rm-industries/content-model')
    run = execute('Dispatch published content model');
  const state = JSON.parse(fs.readFileSync(env.STATE));
  const result = {
    name,
    status: run.status,
    publishes: state.calls.length,
    dispatches: state.gh.filter((a) => a.some((v) => v.includes('/dispatches'))).length,
    verified: fs.existsSync(path.join(dir, '.release/published.json')),
    stdout: run.stdout,
    stderr: run.stderr,
  };
  results.push(result);
  return { result, state, dir, execute, env };
}
const foreignManifest = scenario('foreign-manifest-sha', { release: { gitSha: 'foreign' } });
assert.equal(foreignManifest.result.status, 0);
const alteredBytes = scenario('altered-downloaded-bytes', {
  release: { tarball: { filename: 'inspected.tgz', integrity: 'sha512-stale' } },
});
assert.notEqual(alteredBytes.result.status, 0);
assert.equal(alteredBytes.result.publishes, 1);
assert(!alteredBytes.result.verified);
assert.equal(alteredBytes.result.dispatches, 0);
const fresh = scenario('fresh');
assert.equal(fresh.result.status, 0);
assert.equal(fresh.result.publishes, 1);
assert.equal(fresh.result.dispatches, 1);
assert(fresh.state.calls[0].includes('--provenance'));
assert(fresh.state.calls[0][1].endsWith('inspected.tgz'));
const retry = scenario('matching-retry', { registry: { version: '1.2.1', dist: { integrity: inspectedIntegrity } } });
assert.equal(retry.result.publishes, 0);
assert(retry.result.verified);
const conflict = scenario('integrity-conflict', {
  registry: { version: '1.2.1', dist: { integrity: 'sha512-other' } },
});
assert.notEqual(conflict.result.status, 0);
assert.equal(conflict.result.dispatches, 0);
assert.equal(conflict.result.publishes, 0);
const wrongTag = scenario('wrong-tag-commit', { tag: 'foreign' });
assert.notEqual(wrongTag.result.status, 0);
assert.equal(wrongTag.result.publishes, 0);
const unavailable = scenario('registry-unavailable', { unavailable: true });
assert.notEqual(unavailable.result.status, 0);
assert.equal(unavailable.result.dispatches, 0);
assert(!unavailable.result.verified);
assert.equal(unavailable.state.reads, 61);
const version = scenario('wrong-registry-version', {
  registry: { version: '9.0.0', dist: { integrity: inspectedIntegrity } },
});
assert.notEqual(version.result.status, 0);
assert(!version.result.verified);
// Resume after upload succeeded but verification was interrupted/unavailable.
const resumed = scenario('resume-interrupted', { registry: unavailable.state.registry });
assert.equal(resumed.result.publishes, 0);
assert(resumed.result.verified);
// Independent package jobs: success A is immutable while B fails and is retried.
const secondRelease = {
  packageName: '@rm-industries/create-forge',
  version: '2.4.0',
  releaseTag: 'create-forge-v2.4.0',
};
const b = scenario('second-package-failure', { reject: true, release: secondRelease });
assert.notEqual(b.result.status, 0);
assert.equal(b.result.dispatches, 0);
const aAgain = scenario('first-package-retry', { registry: fresh.state.registry });
assert.equal(aAgain.result.publishes, 0);
const bAgain = scenario('second-package-resume', { release: secondRelease });
assert(bAgain.result.verified);
assert.equal(bAgain.result.publishes, 1);
assert.equal(bAgain.result.dispatches, 0);
assert.equal(bAgain.state.registry.version, '2.4.0');
write(path.join(root, 'results.json'), results);
console.log(JSON.stringify({ root, results }, null, 2));
// Handoff each finalist's real #392 prepared files through Forge's public CLI.
const tools = process.env.RELEASE_TOOLS || '/tmp/forge-370/tools/node_modules';
const preparation = process.env.PREPARATION_ROOT;
assert(preparation, 'Set PREPARATION_ROOT to the #392 fixture output directory');
const handoffs = [];
for (const candidate of ['baseline', 'changesets', 'nx', 'release-please']) {
  const dir = path.join(root, 'handoff-' + candidate);
  fs.cpSync(path.join(preparation, candidate + '-one'), dir, {
    recursive: true,
    filter: (file) => !file.split(path.sep).includes('node_modules'),
  });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(source, 'scripts/prepare-package-release.ts'),
    path.join(dir, 'scripts/prepare-package-release.ts'),
  );
  fs.symlinkSync(tools, path.join(dir, 'node_modules'), 'dir');
  const command = (args) =>
    cp.spawnSync(process.execPath, ['scripts/prepare-package-release.ts', ...args], { cwd: dir, encoding: 'utf8' });
  const args = ['--package', 'content-model', '--sha', 'abc123', '--tag', 'content-model-v1.2.1'];
  const initial = command(args);
  assert.equal(initial.status, 0, initial.stderr);
  const packed = cp.spawnSync('npm', ['pack', '--workspace', 'packages/content-model', '--ignore-scripts', '--json'], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.equal(packed.status, 0, packed.stderr);
  write(path.join(dir, 'pack.json'), packed.stdout);
  const release = command([...args, '--pack-result', 'pack.json']);
  assert.equal(release.status, 0, release.stderr);
  const plan = JSON.parse(release.stdout);
  const bytes = fs.readFileSync(path.join(dir, plan.tarball.filename));
  assert.equal('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'), plan.tarball.integrity);
  const wrongTag = command([...args.slice(0, -1), 'content-model-v9.0.0']);
  assert.notEqual(wrongTag.status, 0);
  const pack = JSON.parse(packed.stdout);
  pack[0].name = '@foreign/package';
  write(path.join(dir, 'wrong-package.json'), pack);
  assert.notEqual(command([...args, '--pack-result', 'wrong-package.json']).status, 0);
  pack[0].name = plan.packageName;
  pack[0].version = '9.0.0';
  write(path.join(dir, 'wrong-version.json'), pack);
  assert.notEqual(command([...args, '--pack-result', 'wrong-version.json']).status, 0);
  // Arbitrary nonempty SHA is accepted by preparer; workflow supplies HEAD instead.
  assert.equal(command(['--package', 'content-model', '--sha', 'foreign']).status, 0);
  const publication = scenario('candidate-' + candidate, {
    release: plan,
    artifact: path.join(dir, plan.tarball.filename),
  });
  assert.equal(publication.result.status, 0);
  assert(publication.result.verified);
  handoffs.push({
    candidate,
    version: plan.version,
    tag: plan.releaseTag,
    integrity: plan.tarball.integrity,
    wrongTagRejected: true,
    wrongPackIdentityRejected: true,
    arbitraryShaAccepted: true,
  });
}
write(path.join(root, 'handoffs.json'), handoffs);
// Changesets native exact artifact path: real pack, controlled npm publish only.
const csDir = path.join(root, 'handoff-changesets');
const cs = (args, env = {}) =>
  cp.spawnSync(process.execPath, [path.join(tools, '@changesets/cli/bin.js'), ...args], {
    cwd: csDir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
let packed = cs(['pack', '--from-publish-plan', 'publish-plan.json', '--out-dir', 'artifacts']);
assert.equal(packed.status, 0, packed.stderr);
const packedPlan = JSON.parse(fs.readFileSync(path.join(csDir, 'artifacts/publish-plan.json')));
const artifact = path.join(csDir, 'artifacts', packedPlan.plan[0][0].tarball.path);
const before = fs.readFileSync(artifact);
const expected = packedPlan.plan[0][0].tarball.integrity;
assert.equal('sha256-' + crypto.createHash('sha256').update(before).digest('base64'), expected);
fs.appendFileSync(artifact, 'tampered fixture bytes');
const csBin = path.join(root, 'cs-bin');
write(
  path.join(csBin, 'npm'),
  `#!/usr/bin/env node
require('fs').appendFileSync(process.env.CS_LOG,JSON.stringify(process.argv.slice(2))+'\\n');
if(process.argv[2]==='--version')console.log('11.19.1');
else if(process.argv[2]==='publish')console.log('{}');
else {console.error('Forbidden command');process.exit(90)}
`,
);
fs.chmodSync(path.join(csBin, 'npm'), 0o755);
const native = cs(['publish', '--from-pack-dir', 'artifacts', '--no-git-tag'], {
  PATH: csBin + path.delimiter + process.env.PATH,
  CS_LOG: path.join(root, 'cs-npm.log'),
});
write(path.join(root, 'changesets-native.json'), {
  status: native.status,
  stdout: native.stdout,
  stderr: native.stderr,
  expected,
  tamperedIntegrity: 'sha256-' + crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('base64'),
  commands: fs.readFileSync(path.join(root, 'cs-npm.log'), 'utf8'),
});
const nativeCommands = fs
  .readFileSync(path.join(root, 'cs-npm.log'), 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));
const nativePublish = nativeCommands.find((args) => args[0] === 'publish');
assert(nativePublish);
assert.equal(path.resolve(csDir, 'packages/content-model', nativePublish[1]), artifact);
assert(nativePublish.includes('latest'));
assert.equal(native.status, 0, native.stderr);
assert.notEqual('sha256-' + crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('base64'), expected);
write(path.join(root, 'results.json'), results);
console.log(JSON.stringify({ handoffs, changesetsNativeTamperedPublishAccepted: true, root }, null, 2));
