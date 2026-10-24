const fs = require('node:fs');
const load = require('node:module').createRequire(
  (process.env.RELEASE_TOOLS || '/tmp/forge-370/tools/node_modules') + '/nx/package.json',
);
const { ReleaseClient } = load('nx/release');
const scenario = process.argv[2];
const client = new ReleaseClient(
  {
    projects: ['*'],
    projectsRelationship: 'independent',
    versionPlans: scenario !== 'promotion',
    releaseTag: { pattern: '{projectName}-v{version}' },
    version: {
      currentVersionResolver: 'disk',
      specifierSource: 'version-plans',
      updateDependents: 'never',
      versionActionsOptions: { skipLockFileUpdate: true },
    },
    changelog: { workspaceChangelog: false, projectChangelogs: { createRelease: false } },
    git: { commit: false, tag: false, push: false },
  },
  true,
);
(async () => {
  const args = {
    firstRelease: true,
    gitCommit: false,
    gitTag: false,
    gitPush: false,
    stageChanges: false,
    deleteVersionPlans: false,
  };
  if (scenario === 'promotion') {
    args.specifier = '1.2.1';
    args.projects = ['@rm-industries/content-model'];
  }
  if (scenario === 'next') args.preid = 'next';
  const result = await client.releaseVersion(args);
  const changelog = await client.releaseChangelog({ ...args, versionData: result.projectsVersionData, from: 'HEAD' });
  fs.writeFileSync('nx-result.json', JSON.stringify({ version: result, changelog }, null, 2));
})();
