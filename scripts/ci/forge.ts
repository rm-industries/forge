import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Build, cicd, target, type CiPinResolver, type CiStep } from '@zuke/core';

import { createRepositoryCi, type SiteCiConfig } from '../../templates/default/scripts/ci/site.ts';
import { invoke, npmTask, packageChecks } from '../../templates/default/scripts/ci/tasks.ts';

const repository = fileURLToPath(new URL('../../', import.meta.url));

function templateTask(scripts: string[], browsers = false, evidence?: string) {
  return target().executes(() => {
    const directory = mkdtempSync(join(tmpdir(), 'forge-ci-template-'));
    try {
      cpSync(join(repository, 'templates/default'), directory, {
        recursive: true,
        filter: (path) =>
          ![
            'node_modules',
            '.astro',
            '.zuke',
            'dist',
            'coverage',
            'test-results',
            'playwright-report',
            '.lighthouseci',
          ].includes(path.split(/[\\/]/).at(-1) ?? ''),
      });
      const npm = (args: string[]) => execFileSync('npm', args, { cwd: directory, stdio: 'inherit' });
      npm(['ci']);
      if (browsers) npm(['exec', '--', 'playwright', 'install', '--with-deps', 'chromium', 'firefox', 'webkit']);
      for (const script of scripts) npm(['run', script]);
    } finally {
      if (evidence) {
        const output = join(repository, '.zuke/evidence', evidence);
        rmSync(output, { recursive: true, force: true });
        mkdirSync(output, { recursive: true });
        for (const report of ['coverage', 'playwright-report', 'test-results', '.lighthouseci']) {
          if (existsSync(join(directory, report)))
            cpSync(join(directory, report), join(output, report), { recursive: true });
        }
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

export function createForgeBuild(pins: CiPinResolver) {
  const config: SiteCiConfig = {
    directory: '.',
    repositoryRoot: repository,
    providers: ['github'],
    primary: 'github',
    securityMinute: 17,
    automationMinute: 43,
  };
  const repositoryCi = createRepositoryCi(config, pins);
  const before = (node = '26'): CiStep[] => [
    { uses: pins('actions/checkout'), with: { 'persist-credentials': 'false' } },
    { uses: pins('actions/setup-node'), with: { 'node-version': node, cache: 'npm' } },
    { run: 'npm ci' },
  ];
  return class ForgeBuild extends Build {
    contentModel = packageChecks(join(repository, 'packages/content-model'));
    createForge = packageChecks(join(repository, 'packages/create-forge'));
    format = npmTask('format', repository);
    lint = npmTask('lint', repository);
    typecheck = npmTask('typecheck:root', repository).dependsOn(
      this.contentModel.typecheck,
      this.createForge.typecheck,
    );
    test = npmTask('test:root', repository).dependsOn(this.contentModel.test, this.createForge.test);
    build = target()
      .dependsOn(this.contentModel.build, this.createForge.build)
      .executes(() => {});
    pack = npmTask('pack', repository).dependsOn(this.build);
    audit = npmTask('audit', repository);
    quality = target()
      .dependsOn(this.format, this.lint, this.typecheck, this.test, this.pack)
      .executes(() => {});
    compatibility = target()
      .dependsOn(this.typecheck, this.test, this.build)
      .executes(() => {});
    templateCompatibility = templateTask(['typecheck', 'test', 'build']);
    templateStatic = npmTask('verify:template:static', repository);
    templateCoverage = templateTask(['test:coverage'], false, 'templateCoverage');
    templateBrowser = templateTask(['build', 'test:e2e'], true, 'templateBrowser');
    templateLighthouse = templateTask(['build', 'lighthouse:ci'], true, 'templateLighthouse');
    templateAudit = templateTask(['audit']);
    templateStandalone = npmTask('verify:template', repository);
    generatorE2e = npmTask('test:generator:e2e', repository);
    generatorCompatibility = npmTask('test:generator:compatibility', repository);
    ciCheck = npmTask('ci:check', repository);
    project = target()
      .dependsOn(
        this.quality,
        this.audit,
        this.templateCompatibility,
        this.templateStatic,
        this.templateCoverage,
        this.templateBrowser,
        this.templateLighthouse,
        this.templateAudit,
        this.templateStandalone,
        this.generatorE2e,
        this.generatorCompatibility,
        this.ciCheck,
      )
      .executes(() => {});

    projectCi = cicd({
      provider: 'github',
      path: join(repository, '.github/workflows/project.yml'),
      pipeline: {
        name: 'Project Continuous Integration',
        triggers: { push: ['main'], pullRequest: ['main'] },
        permissions: {},
        bootstrap: false,
        concurrency: { group: '${{ github.workflow_ref }}-${{ github.ref }}', cancelInProgress: true },
      },
      invokes: [
        ...[
          this.quality,
          this.audit,
          this.templateStatic,
          this.templateCoverage,
          this.templateBrowser,
          this.templateLighthouse,
          this.templateAudit,
          this.templateStandalone,
          this.generatorE2e,
          this.ciCheck,
        ].map((task) =>
          invoke(this, task, '.', before(), {
            permissions: { contents: 'read' },
            continueOnError: task === this.audit || task === this.templateAudit,
            then: [this.templateCoverage, this.templateBrowser, this.templateLighthouse].includes(task)
              ? [
                  {
                    uses: pins('actions/upload-artifact'),
                    if: 'always()',
                    with: {
                      name: task.name_!,
                      path: `.zuke/evidence/${task.name_}`,
                      'include-hidden-files': 'true',
                      'if-no-files-found': 'ignore',
                      'retention-days': '7',
                    },
                  },
                ]
              : [],
          }),
        ),
        ...[this.compatibility, this.templateCompatibility].map((task) =>
          invoke(this, task, '.', before('${{ matrix.node }}'), {
            matrix: { node: ['22.22.2', '22', '24', '26'] },
            failFast: false,
            permissions: { contents: 'read' },
          }),
        ),
        invoke(this, this.generatorCompatibility, '.', before('${{ matrix.node }}'), {
          matrix: { node: ['22.22.2', '22', '24', '26'], os: ['ubuntu-latest', 'macos-latest'] },
          runsOn: '${{ matrix.os }}',
          failFast: false,
          permissions: { contents: 'read' },
        }),
        { ...invoke(this, this.project, '.', [], { name: 'Project', permissions: {} }), steps: [{ run: 'true' }] },
      ],
    });
    security = repositoryCi.security;
    automation = repositoryCi.automation;
  };
}
