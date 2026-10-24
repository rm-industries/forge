// Public selector CLI rehearsal. gh/npm facades allow controlled reads only.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const source = process.env.FORGE_SOURCE || process.cwd();
const preparation = JSON.parse(fs.readFileSync(process.env.PREPARATION_RESULTS, 'utf8'));
const root = fs.mkdtempSync('/tmp/forge-release-automation-');
const results = [];
function write(dir, file, value) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
function run(dir, command, args, env = {}, required = true) {
  const result = cp.spawnSync(command, args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
  fs.appendFileSync(path.join(root, 'commands.jsonl'), JSON.stringify({ dir, command, args, ...result }) + '\n');
  if (required) assert.equal(result.status, 0, result.stderr + result.stdout);
  return result;
}
const git = (dir, ...args) => run(dir, 'git', args).stdout.trim();
const cases = [
  'eligible',
  'unmerged',
  'wrong-commit',
  'untrusted-app',
  'foreign-head',
  'foreign-base',
  'wrong-base',
  'wrong-branch',
  'source-change',
  'mixed-package',
  'prerelease',
  'not-next-patch',
  'missing-changelog',
  'missing-manifest',
  'invalid-sha',
  'no-associated-pr',
  'ambiguous-pr',
  'missing-baseline-tag',
  'unpublished-baseline',
  'unreleased-source',
];
const bin = path.join(root, 'bin');
fs.mkdirSync(bin);
write(
  bin,
  'gh',
  `#!/usr/bin/env node
const fs=require('node:fs'); const a=process.argv.slice(2); const c=JSON.parse(fs.readFileSync(process.env.FIXTURE_CONTROL));
if(a.length!==2||a[0]!=='api')throw Error('Forbidden gh mutation or operation');
const p=a[1];
if(p.endsWith('/commits/'+c.sha+'/pulls')) console.log(JSON.stringify(c.name==='no-associated-pr'?[]:c.name==='ambiguous-pr'?[{number:1,user:c.pr.user},{number:2,user:c.pr.user}]:[{number:1,user:c.pr.user}]));
else if(p.endsWith('/pulls/1'))console.log(JSON.stringify(c.pr));
else if(p.includes('/commits/') && p.includes('-v')){if(c.name==='missing-baseline-tag'){console.error('HTTP 404');process.exit(1)}console.log(JSON.stringify({sha:c.baseline}));}
else throw Error('Unexpected gh read '+p);
`,
);
write(
  bin,
  'npm',
  `#!/usr/bin/env node
const fs=require('node:fs');const c=JSON.parse(fs.readFileSync(process.env.FIXTURE_CONTROL));const a=process.argv.slice(2);
if(a.length!==3||a[0]!=='view'||a[2]!=='version')throw Error('Forbidden npm operation');
if(c.name==='unpublished-baseline'){console.error('controlled registry absent');process.exit(1)}console.log(c.previous);
`,
);
for (const executable of ['gh', 'npm']) fs.chmodSync(path.join(bin, executable), 0o755);
for (const row of preparation.filter((row) => row.scenario === 'one')) {
  assert.equal(row.versions['content-model'], '1.2.1');
  for (const lane of ['peer', 'template']) {
    const extra = lane === 'template' ? ['template-prerelease'] : [];
    if (row.tool.startsWith('Changesets')) extra.push('candidate-metadata');
    if (row.tool.startsWith('Nx')) extra.push('candidate-metadata');
    if (row.tool.startsWith('release-please')) extra.push('candidate-metadata');
    for (const name of [...cases, ...extra]) {
      const dir = path.join(root, `${row.tool.split(' ')[0]}-${lane}-${name}`);
      fs.mkdirSync(dir);
      write(dir, 'package.json', { name: 'automation-fixture', private: true });
      write(dir, 'package-lock.json', { lockfileVersion: 3 });
      for (const [slug, version] of [
        ['content-model', '1.2.0'],
        ['create-forge', '2.3.0'],
        ['browser-oxfmt', '0.1.0'],
        ['markdownlint-frontmatter', '0.4.0'],
      ]) {
        write(dir, `packages/${slug}/package.json`, { name: '@rm-industries/' + slug, version });
        write(dir, `packages/${slug}/CHANGELOG.md`, `# Changelog\n\n## ${version}\n\n- Previous release.\n`);
      }
      write(dir, 'templates/default/package.json', {
        dependencies: { '@rm-industries/content-model': '1.2.0', '@sveltia/cms': '0.250.0' },
      });
      write(dir, 'templates/default/package-lock.json', { lockfileVersion: 3 });
      git(dir, 'init', '-b', 'main');
      git(dir, 'config', 'user.name', 'Release fixture');
      git(dir, 'config', 'user.email', 'fixture@example.invalid');
      git(dir, 'add', '.');
      git(dir, 'commit', '-m', 'chore: published fixture baseline');
      const baseline = git(dir, 'rev-parse', 'HEAD');
      git(dir, 'remote', 'add', 'origin', dir);
      const slug = lane === 'peer' ? 'content-model' : 'create-forge';
      const previous = lane === 'peer' ? '1.2.0' : '2.3.0';
      git(dir, 'tag', `${slug}-v${previous}`);
      if (name === 'unreleased-source') {
        write(dir, `packages/${slug}/src/index.ts`, 'export const unreleased = true;\n');
        git(dir, 'add', '.');
        git(dir, 'commit', '-m', 'feat: unreleased implementation');
      }
      if (lane === 'template') {
        const metadata = path.join(root, 'metadata.json');
        const peers = path.join(root, 'peers.json');
        const publication = path.join(root, 'publication.json');
        write(root, 'metadata.json', {
          name: '@rm-industries/content-model',
          version: row.versions['content-model'],
          peerDependencies: { '@sveltia/cms': '>=0.250.0 <0.252.0' },
          dist: {
            integrity: 'sha512-controlled-fixture',
            attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
          },
        });
        write(root, 'peers.json', ['0.250.0', '0.251.0']);
        write(root, 'publication.json', {
          packageName: '@rm-industries/content-model',
          version: '1.2.1',
          releaseTag: 'content-model-v1.2.1',
          publication: { verified: true, registryIntegrity: 'sha512-controlled-fixture' },
        });
        run(dir, process.execPath, [
          path.join(source, 'scripts/prepare-template-sync.ts'),
          '--metadata',
          metadata,
          '--peer-versions',
          peers,
          '--publication',
          publication,
          '--write',
        ]);
        assert.equal(
          JSON.parse(fs.readFileSync(path.join(dir, 'packages/create-forge/package.json'))).version,
          '2.3.1',
        );
        const template = JSON.parse(fs.readFileSync(path.join(dir, 'templates/default/package.json')));
        assert.equal(template.dependencies['@rm-industries/content-model'], '1.2.1');
        assert.equal(template.dependencies['@sveltia/cms'], '0.251.0');
        write(dir, 'templates/default/package-lock.json', {
          lockfileVersion: 3,
          fixture: 'simulated lock refresh, no install proof',
        });
      } else {
        write(dir, `packages/${slug}/package.json`, {
          name: '@rm-industries/' + slug,
          version: row.versions['content-model'],
        });
        write(dir, `packages/${slug}/CHANGELOG.md`, '# Changelog\n\n## 1.2.1\n\n- Reviewed candidate patch handoff.\n');
      }
      if (name === 'prerelease' || name === 'not-next-patch') {
        const version = name === 'prerelease' ? previous + '-next.0' : lane === 'peer' ? '1.2.2' : '2.3.2';
        write(dir, `packages/${slug}/package.json`, { name: '@rm-industries/' + slug, version });
      }
      if (name === 'source-change') write(dir, `packages/${slug}/src/feature.ts`, 'export const mixed = true;\n');
      if (name === 'mixed-package')
        write(dir, 'packages/browser-oxfmt/package.json', { name: '@rm-industries/browser-oxfmt', version: '0.1.1' });
      if (name === 'missing-changelog') git(dir, 'restore', '--', `packages/${slug}/CHANGELOG.md`);
      if (name === 'missing-manifest') git(dir, 'restore', '--', `packages/${slug}/package.json`);
      if (name === 'template-prerelease')
        write(dir, 'templates/default/package.json', {
          dependencies: { '@rm-industries/content-model': '1.2.1-next.0', '@sveltia/cms': '0.251.0' },
        });
      if (name === 'candidate-metadata') {
        const file = row.tool.startsWith('Changesets')
          ? '.changeset/reviewed.md'
          : row.tool.startsWith('Nx')
            ? '.nx/version-plans/reviewed.md'
            : '.release-please-manifest.json';
        write(dir, file, 'Candidate metadata is outside the current production allowlist.\n');
      }
      git(dir, 'add', '.');
      git(dir, 'commit', '--allow-empty', '-m', 'fix: reviewed candidate patch');
      const sha = git(dir, 'rev-parse', 'HEAD');
      const pr = {
        merged: true,
        merge_commit_sha: sha,
        user: { login: 'forge-updates[bot]' },
        base: { ref: 'main', repo: { full_name: 'rm-industries/forge' } },
        head: {
          ref: lane === 'peer' ? 'automation/peer--sveltia-cms' : 'automation/template-content-model',
          repo: { full_name: 'rm-industries/forge' },
        },
      };
      if (name === 'unmerged') pr.merged = false;
      if (name === 'wrong-commit') pr.merge_commit_sha = 'b'.repeat(40);
      if (name === 'untrusted-app') pr.user.login = 'dependabot[bot]';
      if (name === 'foreign-head') pr.head.repo.full_name = 'fork/forge';
      if (name === 'foreign-base') pr.base.repo.full_name = 'foreign/forge';
      if (name === 'wrong-base') pr.base.ref = 'develop';
      if (name === 'wrong-branch') pr.head.ref = 'feature/release';
      const control = path.join(root, 'control.json');
      write(root, 'control.json', { pr, sha, baseline, previous, name });
      const result = run(
        dir,
        process.execPath,
        [path.join(source, 'scripts/select-automatic-release.ts')],
        {
          PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH,
          GITHUB_REPOSITORY: 'rm-industries/forge',
          GITHUB_SHA: name === 'invalid-sha' ? 'main' : sha,
          APP_SLUG: 'forge-updates',
          FIXTURE_CONTROL: control,
        },
        false,
      );
      const eligible = result.stdout.includes('eligible=true');
      assert.equal(eligible, name === 'eligible', `${row.tool}/${lane}/${name}: ${result.stdout} ${result.stderr}`);
      if (eligible) {
        assert.equal(result.status, 0);
        assert.ok(result.stdout.includes(`package=${slug}`));
      } else if (name === 'invalid-sha' || name === 'unpublished-baseline') {
        assert.notEqual(result.status, 0);
        assert.ok(
          result.stderr.includes(
            name === 'invalid-sha'
              ? 'Repository, SHA and configured App identity are required'
              : 'controlled registry absent',
          ),
        );
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.ok(result.stdout.includes('eligible=false'), 'rejection must be observable');
      }
      results.push({
        tool: row.tool,
        lane,
        case: name,
        eligible,
        status: result.status,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim(),
      });
    }
  }
}
fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ root, cases: results.length, eligible: results.filter((r) => r.eligible).length }));
