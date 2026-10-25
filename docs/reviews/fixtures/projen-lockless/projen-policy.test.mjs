import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const require = createRequire(process.env.PROJEN_PACKAGE_JSON ?? new URL('./package.json', import.meta.url));
const { Project, github } = require('projen');

test('specialized Dependabot needs overrides to preserve manifest updates and both ecosystems', async () => {
  const stage = await mkdtemp(join(tmpdir(), 'forge-projen-policy-'));
  try {
    const project = new Project({ name: 'fixture', outdir: stage, projenrcJson: false });
    const gh = new github.GitHub(project, { mergify: false, pullRequestTemplate: false });
    const dependabot = new github.Dependabot(gh, {
      versioningStrategy: github.VersioningStrategy.INCREASE,
      ignoreProjen: false,
      scheduleInterval: github.DependabotScheduleInterval.WEEKLY,
    });
    project.synth();
    const yaml = await readFile(join(stage, '.github/dependabot.yml'), 'utf8');
    assert.match(yaml, /versioning-strategy: lockfile-only/);
    assert.doesNotMatch(yaml, /package-ecosystem: github-actions/);
    assert.equal(dependabot.config.updates.length, 1);
    assert.equal(dependabot.config.updates[0]['package-ecosystem'], 'npm');
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
});
