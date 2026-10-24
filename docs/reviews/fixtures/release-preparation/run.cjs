// cspell:words prepatch
// Isolated public-entrypoint evaluation. Never invokes a publisher or remote mutation.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const tools = process.env.RELEASE_TOOLS || '/tmp/forge-370/tools/node_modules';
const source = process.env.FORGE_SOURCE || process.cwd();
const root = fs.mkdtempSync('/tmp/forge-release-preparation-');
const names = ['content-model', 'create-forge', 'browser-oxfmt', 'markdownlint-frontmatter'];
const initial = ['1.2.0', '2.3.0', '0.1.0', '0.4.0'];
const results = [];
const write = (dir, file, value) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
};
function run(dir, command, args = [], env = {}) {
  const r = cp.spawnSync(command, args, {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_NO_CLOUD: 'true', ...env },
  });
  fs.appendFileSync(
    path.join(root, 'commands.log'),
    JSON.stringify({ dir, command, args, status: r.status, stdout: r.stdout, stderr: r.stderr }) + '\n',
  );
  if (r.status !== 0) throw Error(`${command} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
function fixture(label) {
  const dir = path.join(root, label);
  fs.mkdirSync(dir);
  write(dir, 'package.json', { name: 'release-evaluation', private: true, workspaces: ['packages/*'] });
  for (let i = 0; i < names.length; i++) {
    write(dir, `packages/${names[i]}/package.json`, {
      name: `@rm-industries/${names[i]}`,
      version: initial[i],
      main: 'index.js',
      ...(i === 1 ? { dependencies: { external: '^1.0.0' } } : {}),
    });
    write(dir, `packages/${names[i]}/index.js`, 'module.exports = {};\n');
    write(dir, `packages/${names[i]}/CHANGELOG.md`, '# Changelog\n');
  }
  write(dir, 'packages/create-forge/copied-template/package.json', {
    dependencies: { '@rm-industries/content-model': '1.2.0' },
  });
  write(dir, 'packages/markdownlint-frontmatter/test.js', "require('../content-model/index.js');\n");
  write(dir, 'package-lock.json', { name: 'release-evaluation', lockfileVersion: 3, packages: {} });
  run(dir, 'git', ['init', '-b', 'main']);
  run(dir, 'git', ['config', 'user.name', 'Release fixture']);
  run(dir, 'git', ['config', 'user.email', 'fixture@example.invalid']);
  run(dir, 'git', ['add', '.']);
  run(dir, 'git', ['commit', '-m', 'chore: fixture baseline']);
  return dir;
}
const versions = (dir) =>
  Object.fromEntries(
    names.map((n) => [n, JSON.parse(fs.readFileSync(path.join(dir, `packages/${n}/package.json`))).version]),
  );
const cs = (dir, args, env) => run(dir, process.execPath, [path.join(tools, '@changesets/cli/bin.js'), ...args], env);
function csConfig(dir) {
  write(dir, '.changeset/config.json', {
    changelog: '@changesets/cli/changelog',
    commit: false,
    fixed: [],
    linked: [],
    access: 'public',
    baseBranch: 'main',
    updateInternalDependencies: 'patch',
    ignore: [],
  });
}
// Controlled npm read facade: all four initial versions exist, publishing is forbidden.
const bin = path.join(root, 'bin');
fs.mkdirSync(bin);
write(
  bin,
  'npm',
  `#!/usr/bin/env node\nconst fs=require('fs');const a=process.argv.slice(2);if(a[0]==='info'){const n=a[1].split('@').slice(-1)[0];const all=${JSON.stringify(Object.fromEntries(names.map((n, i) => ['@rm-industries/' + n, initial[i]])))};const name=Object.keys(all).find(n=>a[1]===n||a[1].startsWith(n+'@'));process.stdout.write(JSON.stringify({versions:[all[name]],'dist-tags':{latest:all[name]}}));}else if(a[0]==='--version'){console.log('11.19.1')}else{console.error('Forbidden npm operation: '+a.join(' '));process.exit(91)}\n`,
);
fs.chmodSync(path.join(bin, 'npm'), 0o755);
const readEnv = { PATH: bin + path.delimiter + process.env.PATH };
async function changesets() {
  for (const scenario of ['one', 'multiple', 'docs', 'breaking', 'next']) {
    const dir = fixture('changesets-' + scenario);
    csConfig(dir);
    for (let i = 0; i < names.length; i++) run(dir, 'git', ['tag', `@rm-industries/${names[i]}@${initial[i]}`]);
    if (scenario === 'next') cs(dir, ['pre', 'enter', 'next']);
    const bumps =
      scenario === 'docs'
        ? []
        : scenario === 'multiple'
          ? [
              [0, 'patch'],
              [1, 'minor'],
            ]
          : scenario === 'breaking'
            ? [
                [2, 'minor'],
                [0, 'major'],
              ]
            : [[0, 'patch']];
    for (const [i, bump] of bumps)
      cs(dir, ['add', '--' + bump, '@rm-industries/' + names[i], '-m', 'Reviewed fixture intent: ' + scenario]);
    if (!bumps.length) write(dir, 'README.md', 'Internal documentation only\n');
    cs(dir, ['status', '--output', 'status.json']);
    if (scenario !== 'docs') cs(dir, ['version']);
    const v = versions(dir);
    if (scenario === 'one') assert.deepEqual(Object.values(v), ['1.2.1', '2.3.0', '0.1.0', '0.4.0']);
    if (scenario === 'multiple') assert.deepEqual(Object.values(v), ['1.2.1', '2.4.0', '0.1.0', '0.4.0']);
    if (scenario === 'docs') assert.deepEqual(Object.values(v), initial);
    if (scenario === 'breaking') assert.deepEqual(Object.values(v), ['2.0.0', '2.3.0', '0.2.0', '0.4.0']);
    cs(dir, ['publish-plan', '--output', 'publish-plan.json'], readEnv);
    let plan = JSON.parse(fs.readFileSync(path.join(dir, 'publish-plan.json')));
    if (scenario === 'docs') {
      const status = JSON.parse(fs.readFileSync(path.join(dir, 'status.json')));
      assert.deepEqual(status.releases, []);
      assert.deepEqual(plan.plan, []);
    }
    const changelogs = Object.fromEntries(
      names.map((n) => [n, fs.readFileSync(path.join(dir, `packages/${n}/CHANGELOG.md`), 'utf8')]),
    );
    if (scenario === 'next') assert.equal(plan.plan.flat()[0].tag, 'next');
    run(dir, 'git', ['add', '.']);
    run(dir, 'git', ['commit', '--allow-empty', '-m', 'chore: reviewed fixture release']);
    cs(dir, ['git-tag']);
    results.push({
      tool: 'Changesets 3.0.3',
      scenario,
      versions: v,
      plan,
      changelogs,
      tags: run(dir, 'git', ['tag']).trim().split('\n'),
    });
    if (scenario === 'next') {
      cs(dir, ['pre', 'exit']);
      cs(dir, ['version']);
      cs(dir, ['publish-plan', '--output', 'promoted-plan.json'], readEnv);
      const promoted = JSON.parse(fs.readFileSync(path.join(dir, 'promoted-plan.json')));
      assert.equal(promoted.plan.flat()[0].tag, 'latest');
      assert.equal(versions(dir)['content-model'], '1.2.1');
      results.push({ tool: 'Changesets 3.0.3', scenario: 'promotion', versions: versions(dir), plan: promoted });
    }
  }
}
async function nx() {
  for (const scenario of ['one', 'multiple', 'docs', 'breaking', 'next']) {
    const dir = fixture('nx-' + scenario);
    fs.symlinkSync(tools, path.join(dir, 'node_modules'));
    write(dir, 'nx.json', { plugins: [] });
    const bumps =
      scenario === 'docs'
        ? []
        : scenario === 'multiple'
          ? [
              [0, 'patch'],
              [1, 'minor'],
            ]
          : scenario === 'breaking'
            ? [
                [2, 'major'],
                [0, 'major'],
              ]
            : [[0, scenario === 'next' ? 'prepatch' : 'patch']];
    if (bumps.length)
      write(
        dir,
        '.nx/version-plans/reviewed.md',
        '---\n' +
          bumps.map(([i, b]) => `"@rm-industries/${names[i]}": ${b}`).join('\n') +
          '\n---\nReviewed fixture intent: ' +
          scenario +
          '\n',
      );
    run(dir, process.execPath, [path.join(__dirname, 'nx-worker.cjs'), scenario]);
    const v = versions(dir);
    if (scenario === 'one') assert.deepEqual(Object.values(v), ['1.2.1', '2.3.0', '0.1.0', '0.4.0']);
    if (scenario === 'docs') {
      assert.deepEqual(Object.values(v), initial);
      const plan = JSON.parse(fs.readFileSync(path.join(dir, 'nx-result.json')));
      assert.deepEqual(
        Object.values(plan.version.projectsVersionData).map((project) => project.newVersion),
        [null, null, null, null],
      );
      assert.deepEqual(plan.changelog.projectChangelogs, {});
    }
    results.push({
      tool: 'Nx 24.0.1',
      scenario,
      versions: v,
      plan: JSON.parse(fs.readFileSync(path.join(dir, 'nx-result.json'))),
    });
    if (scenario === 'next') {
      fs.renameSync(path.join(dir, '.nx/version-plans/reviewed.md'), path.join(dir, 'consumed-version-plan.md'));
      run(dir, process.execPath, [path.join(__dirname, 'nx-worker.cjs'), 'promotion']);
      assert.equal(versions(dir)['content-model'], '1.2.1');
      results.push({
        tool: 'Nx 24.0.1',
        scenario: 'promotion',
        versions: versions(dir),
        plan: JSON.parse(fs.readFileSync(path.join(dir, 'nx-result.json'))),
      });
    }
  }
}
async function rp() {
  for (const scenario of ['one', 'multiple', 'docs', 'breaking', 'next', 'promotion']) {
    const dir = fixture('release-please-' + scenario);
    if (scenario === 'promotion') {
      const p = JSON.parse(fs.readFileSync(path.join(dir, 'packages/content-model/package.json')));
      p.version = '1.2.1-next.0';
      write(dir, 'packages/content-model/package.json', p);
    }
    run(dir, process.execPath, [path.join(__dirname, 'rp-worker.cjs'), scenario]);
    const v = versions(dir);
    if (scenario === 'one') assert.deepEqual(Object.values(v), ['1.2.1', '2.3.0', '0.1.0', '0.4.0']);
    if (scenario === 'docs') {
      assert.deepEqual(Object.values(v), initial);
      const plan = JSON.parse(fs.readFileSync(path.join(dir, 'rp-result.json')));
      assert.deepEqual(plan.pullRequests, []);
      assert.deepEqual(plan.releases, []);
    }
    results.push({
      tool: 'release-please 17.11.2',
      scenario,
      versions: v,
      plan: JSON.parse(fs.readFileSync(path.join(dir, 'rp-result.json'))),
    });
  }
}
async function baseline() {
  for (const scenario of ['one', 'multiple', 'docs', 'breaking', 'next', 'promotion']) {
    const dir = fixture('baseline-' + scenario);
    if (scenario === 'promotion') {
      const p = JSON.parse(fs.readFileSync(path.join(dir, 'packages/content-model/package.json')));
      p.version = '1.2.1-next.0';
      write(dir, 'packages/content-model/package.json', p);
    }
    const expected =
      scenario === 'multiple'
        ? ['1.2.1', '2.4.0', '0.1.0', '0.4.0']
        : scenario === 'breaking'
          ? ['2.0.0', '2.3.0', '0.2.0', '0.4.0']
          : scenario === 'next'
            ? ['1.2.1-next.0', '2.3.0', '0.1.0', '0.4.0']
            : scenario === 'docs'
              ? initial
              : ['1.2.1', '2.3.0', '0.1.0', '0.4.0'];
    for (let i = 0; i < names.length; i++)
      if (expected[i] !== initial[i]) {
        const file = `packages/${names[i]}/package.json`;
        const p = JSON.parse(fs.readFileSync(path.join(dir, file)));
        p.version = expected[i];
        write(dir, file, p);
        write(
          dir,
          `packages/${names[i]}/CHANGELOG.md`,
          `# Changelog\n\n## ${expected[i]}\n\n- Reviewed fixture intent: ${scenario}\n`,
        );
      }
    results.push({
      tool: 'Forge baseline',
      scenario,
      versions: versions(dir),
      intent: 'Manual reviewed package.json/changelog edit; no native version calculator',
    });
  }
}
function forgePlans() {
  for (const row of results) {
    const expected =
      row.scenario === 'multiple'
        ? ['1.2.1', '2.4.0', '0.1.0', '0.4.0']
        : row.scenario === 'breaking'
          ? ['2.0.0', '2.3.0', '0.2.0', '0.4.0']
          : row.scenario === 'next'
            ? ['1.2.1-next.0', '2.3.0', '0.1.0', '0.4.0']
            : row.scenario === 'docs'
              ? initial
              : ['1.2.1', '2.3.0', '0.1.0', '0.4.0'];
    assert.deepEqual(Object.values(row.versions), expected);
    const dir = path.join(
      root,
      (row.tool.startsWith('Changesets')
        ? 'changesets'
        : row.tool.startsWith('Nx')
          ? 'nx'
          : row.tool.startsWith('release-please')
            ? 'release-please'
            : 'baseline') +
        '-' +
        (row.scenario === 'promotion' && !row.tool.startsWith('release-please') && !row.tool.startsWith('Forge')
          ? 'next'
          : row.scenario),
    );
    row.forgePlans = [];
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      if (row.versions[n] === initial[i]) continue;
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, `packages/${n}/package.json`)));
      manifest.version = row.versions[n];
      write(dir, `packages/${n}/package.json`, manifest);
      write(
        dir,
        `packages/${n}/CHANGELOG.md`,
        `# Changelog\n\n## ${row.versions[n]}\n\n- Reviewed fixture intent: ${row.scenario}\n`,
      );
      const plan = JSON.parse(
        run(dir, process.execPath, [
          path.join(source, 'scripts/prepare-package-release.ts'),
          '--package',
          n,
          '--sha',
          '1234567890123456789012345678901234567890',
          '--tag',
          `${n}-v${row.versions[n]}`,
        ]),
      );
      assert.equal(plan.npmTag, row.scenario === 'next' ? 'next' : 'latest');
      row.forgePlans.push(plan);
    }
  }
}
(async () => {
  try {
    await baseline();
    await changesets();
    await nx();
    await rp();
    forgePlans();
  } finally {
    fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
    console.log(root);
  }
})();
