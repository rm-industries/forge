// cspell:words autorelease
const fs = require('fs');
const { Manifest } = require((process.env.RELEASE_TOOLS || '/tmp/forge-370/tools/node_modules') + '/release-please');
const names = ['content-model', 'create-forge', 'browser-oxfmt', 'markdownlint-frontmatter'];
const initial = ['1.2.0', '2.3.0', '0.1.0', '0.4.0'];
const scenario = process.argv[2];
if (scenario === 'promotion') initial[0] = '1.2.1-next.0';
const config = {
  packages: Object.fromEntries(
    names.map((n) => [
      'packages/' + n,
      {
        'release-type': 'node',
        component: n,
        'include-component-in-tag': true,
        'tag-separator': '-',
        'include-v-in-tag': true,
        'bump-minor-pre-major': true,
      },
    ]),
  ),
  'separate-pull-requests': true,
};
if (scenario === 'next')
  Object.assign(config.packages['packages/content-model'], {
    versioning: 'prerelease',
    prerelease: true,
    'prerelease-type': 'next',
    'release-as': '1.2.1-next.0',
  });
if (scenario === 'promotion') config.packages['packages/content-model']['release-as'] = '1.2.1';
const changes =
  scenario === 'docs'
    ? [['docs: internal README', 'README.md']]
    : scenario === 'multiple'
      ? [
          ['fix: reviewed model patch', 'packages/content-model/index.js'],
          ['feat: reviewed CLI feature', 'packages/create-forge/index.js'],
        ]
      : scenario === 'breaking'
        ? [
            ['feat!: reviewed stable breaking change', 'packages/content-model/index.js'],
            ['feat!: reviewed pre-1.0 breaking change', 'packages/browser-oxfmt/index.js'],
          ]
        : [['fix: reviewed model patch', 'packages/content-model/index.js']];
const read = (p) => {
  if (p === 'release-please-config.json') return JSON.stringify(config);
  if (p === '.release-please-manifest.json')
    return JSON.stringify(Object.fromEntries(names.map((n, i) => ['packages/' + n, initial[i]])));
  return fs.readFileSync(p, 'utf8');
};
let merged = [];
const scm = new Proxy(
  {
    repository: { owner: 'fixture', repo: 'fixture', defaultBranch: 'main' },
    getFileJson: async (p) => JSON.parse(read(p)),
    getFileContentsOnBranch: async (p) => {
      const parsedContent = read(p);
      return { content: Buffer.from(parsedContent).toString('base64'), parsedContent, sha: 'fixture-sha' };
    },
    findFilesByFilenameAndRef: async () => [],
    findFilesByGlobAndRef: async () => [],
    async *releaseIterator() {
      for (let i = 0; i < names.length; i++)
        yield { id: i, tagName: names[i] + '-v' + initial[i], sha: 'baseline', url: 'https://example.invalid/release' };
    },
    async *tagIterator() {},
    async *pullRequestIterator(branch, status) {
      if (status === 'MERGED') yield* merged;
    },
    async *mergeCommitIterator() {
      for (let i = 0; i < changes.length; i++)
        yield { sha: 'change' + i, message: changes[i][0], files: [changes[i][1]] };
      yield { sha: 'baseline', message: 'chore: fixture baseline', files: [] };
    },
  },
  {
    get: (t, k) =>
      k in t
        ? t[k]
        : () => {
            throw Error('Unimplemented/forbidden SCM operation ' + String(k));
          },
  },
);
(async () => {
  const m = await Manifest.fromManifest(scm, 'main');
  const prs = await m.buildPullRequests();
  const result = [];
  for (const pr of prs) {
    const updates = [];
    for (const u of pr.updates) {
      let before;
      try {
        before = read(u.path);
      } catch {
        if (!u.createIfMissing) continue;
        before = undefined;
      }
      const after = u.updater.updateContent(before);
      updates.push({ path: u.path, content: after });
      if (after) fs.writeFileSync(u.path, after);
    }
    result.push({ title: pr.title.toString(), body: pr.body.toString(), version: pr.version?.toString(), updates });
  }
  merged = prs.map((pr, i) => ({
    headBranchName: pr.headRefName,
    baseBranchName: 'main',
    number: i + 1,
    mergeCommitOid: 'reviewed-merge',
    sha: 'reviewed-merge',
    title: pr.title.toString(),
    body: pr.body.toString(),
    labels: ['autorelease: pending'],
    files: pr.updates.map((u) => u.path),
  }));
  const releases = await m.buildReleases();
  fs.writeFileSync(
    'rp-result.json',
    JSON.stringify(
      {
        pullRequests: result,
        releases: releases.map((r) => ({
          path: r.path,
          tag: r.tag.toString(),
          prerelease: r.prerelease,
          sha: r.sha,
          notes: r.notes,
        })),
      },
      null,
      2,
    ),
  );
})();
