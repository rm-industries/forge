import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { Build, cicd, target, type CiPinResolver, type CiPipeline, type CiStep } from '@zuke/core';

import { invoke, npmTask, shellQuote } from './tasks.ts';

export interface SiteCiConfig {
  directory: string;
  repositoryRoot: string;
  prefix?: string;
  providers: Array<'github' | 'gitlab'>;
  primary?: 'github' | 'gitlab';
  securityMinute: number;
  automationMinute: number;
}

export function createSiteBuild(projectRoot: string, config: SiteCiConfig, pins: CiPinResolver) {
  const directory = config.directory;
  const workflow = (name: string) =>
    join(config.repositoryRoot, '.github/workflows', `${config.prefix ? `${config.prefix}-` : ''}${name}.yml`);
  const before: CiStep[] = [
    { uses: pins('actions/checkout'), with: { 'persist-credentials': 'false' } },
    {
      uses: pins('actions/setup-node'),
      with: {
        'node-version': '26',
        cache: 'npm',
        'cache-dependency-path': directory === '.' ? 'package-lock.json' : `${directory}/package-lock.json`,
      },
    },
    { run: directory === '.' ? 'npm ci' : `npm ci --prefix ${shellQuote(directory)}` },
  ];
  const pipeline = (name: string): CiPipeline => ({
    name: `${config.prefix ? `${config.prefix}: ` : ''}${name}`,
    triggers: { push: ['main'], pullRequest: ['main'] },
    permissions: {},
    concurrency: { group: '${{ github.workflow_ref }}-${{ github.ref }}', cancelInProgress: true },
    bootstrap: false,
  });

  const repositoryCi = createRepositoryCi(config, pins);
  return class SiteBuild extends Build {
    format = npmTask('format', projectRoot);
    lintCode = npmTask('lint:code', projectRoot);
    lintStyles = npmTask('lint:css', projectRoot);
    lintMarkdown = npmTask('lint:markdown', projectRoot);
    spellcheck = npmTask('spellcheck', projectRoot);
    auditUnused = npmTask('audit:unused', projectRoot);
    typecheck = npmTask('typecheck', projectRoot);
    audit = npmTask('audit', projectRoot);
    unitTests = npmTask('test:coverage', projectRoot);
    build = npmTask('build', projectRoot).dependsOn(
      this.format,
      this.lintCode,
      this.lintStyles,
      this.lintMarkdown,
      this.spellcheck,
      this.auditUnused,
      this.typecheck,
      this.unitTests,
    );
    validateBuild = npmTask('validate:build', projectRoot).dependsOn(this.build);
    installBrowsers = target().executes(() => {
      execFileSync('npm', ['exec', '--', 'playwright', 'install', '--with-deps', 'chromium', 'firefox', 'webkit'], {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    });
    browserTests = npmTask('test:e2e', projectRoot).dependsOn(this.build, this.installBrowsers);
    lighthouse = npmTask('lighthouse:ci', projectRoot).dependsOn(this.build, this.installBrowsers);
    compatibility = target()
      .dependsOn(this.typecheck, this.unitTests, this.build)
      .executes(() => {});
    smoke = npmTask('test:smoke', projectRoot).dependsOn(this.installBrowsers);
    quality = target()
      .dependsOn(this.validateBuild, this.browserTests, this.lighthouse, this.audit)
      .executes(() => {});

    project = config.providers.includes('github')
      ? cicd({
          provider: 'github',
          path: workflow('project'),
          pipeline: pipeline('Project Continuous Integration'),
          invokes: [
            this.format,
            this.lintCode,
            this.lintStyles,
            this.lintMarkdown,
            this.spellcheck,
            this.auditUnused,
            this.typecheck,
            this.unitTests,
            this.build,
            this.validateBuild,
            this.browserTests,
            this.lighthouse,
            this.audit,
          ]
            .map((task) =>
              invoke(this, task, directory, before, {
                permissions: { contents: 'read' },
                continueOnError: task === this.audit,
                then:
                  task === this.build
                    ? [
                        {
                          uses: pins('actions/upload-artifact'),
                          with: {
                            name: 'site-build',
                            path: `${directory}/dist`,
                            'if-no-files-found': 'error',
                            'retention-days': '7',
                          },
                        },
                      ]
                    : task === this.unitTests
                      ? [
                          {
                            uses: pins('actions/upload-artifact'),
                            if: 'always()',
                            with: {
                              name: 'unit-coverage',
                              path: `${directory}/coverage`,
                              'if-no-files-found': 'error',
                              'retention-days': '7',
                            },
                          },
                        ]
                      : task === this.browserTests
                        ? [
                            {
                              uses: pins('actions/upload-artifact'),
                              if: 'always()',
                              with: {
                                name: 'browser-results',
                                path: `${directory}/playwright-report\n${directory}/test-results`,
                                'if-no-files-found': 'ignore',
                                'retention-days': '7',
                              },
                            },
                          ]
                        : task === this.lighthouse
                          ? [
                              {
                                uses: pins('actions/upload-artifact'),
                                if: 'always()',
                                with: {
                                  name: 'lighthouse-reports',
                                  path: `${directory}/.lighthouseci`,
                                  'include-hidden-files': 'true',
                                  'if-no-files-found': 'error',
                                  'retention-days': '7',
                                },
                              },
                            ]
                          : [],
              }),
            )
            .concat([
              invoke(
                this,
                this.compatibility,
                directory,
                [
                  before[0]!,
                  { ...before[1]!, with: { ...before[1]!.with, 'node-version': '${{ matrix.node }}' } },
                  before[2]!,
                ],
                {
                  matrix: { node: ['22.22.2', '22', '24', '26'] },
                  failFast: false,
                  permissions: { contents: 'read' },
                },
              ),
              {
                ...invoke(this, this.quality, directory, [], {
                  name: config.prefix === 'website' ? 'Website' : 'Project',
                  permissions: {},
                }),
                steps: [{ run: 'true' }],
              },
            ]),
        })
      : undefined;

    gitlab = config.providers.includes('gitlab')
      ? cicd({
          provider: 'gitlab',
          path: join(config.repositoryRoot, '.gitlab-ci.yml'),
          pipeline: { bootstrap: false },
          invokes: [
            invoke(
              this,
              this.quality,
              directory,
              [{ run: directory === '.' ? 'npm ci' : `npm ci --prefix ${shellQuote(directory)}` }],
              { runsOn: 'node:26' },
            ),
          ],
        })
      : undefined;

    security = repositoryCi.security;
    automation = repositoryCi.automation;
  };
}

export function createRepositoryCi(config: SiteCiConfig, pins: CiPinResolver) {
  const workflow = (name: string) =>
    join(config.repositoryRoot, '.github/workflows', `${config.prefix ? `${config.prefix}-` : ''}${name}.yml`);
  const pipeline = (name: string): CiPipeline => ({
    name: `${config.prefix ? `${config.prefix}: ` : ''}${name}`,
    triggers: { push: ['main'], pullRequest: ['main'] },
    permissions: {},
    concurrency: { group: '${{ github.workflow_ref }}-${{ github.ref }}', cancelInProgress: true },
    bootstrap: false,
  });
  const checkout: CiStep = { uses: pins('actions/checkout'), with: { 'persist-credentials': 'false' } };
  return {
    security: config.providers.includes('github')
      ? cicd({
          provider: 'github',
          path: workflow('security'),
          pipeline: {
            ...pipeline('Security Analysis'),
            triggers: {
              push: ['main'],
              pullRequest: ['main'],
              schedule: [{ cron: `${config.securityMinute} 5 * * 1` }],
            },
            jobs: [
              {
                id: 'code-analysis',
                matrix: { language: ['actions', 'javascript-typescript'] },
                failFast: false,
                permissions: { actions: 'read', contents: 'read', 'security-events': 'write' },
                steps: [
                  checkout,
                  {
                    uses: pins('github/codeql-action/init'),
                    with: {
                      'build-mode': 'none',
                      languages: '${{ matrix.language }}',
                      queries: 'security-extended,security-and-quality',
                    },
                  },
                  { uses: pins('github/codeql-action/analyze') },
                ],
              },
              {
                id: 'dependency-review',
                if: "github.event_name == 'pull_request'",
                permissions: { contents: 'read' },
                steps: [
                  checkout,
                  {
                    uses: pins('actions/dependency-review-action'),
                    continueOnError: true,
                    with: { 'fail-on-severity': 'high' },
                  },
                ],
              },
            ],
          },
        })
      : undefined,

    automation: config.providers.includes('github')
      ? cicd({
          provider: 'github',
          path: workflow('automation'),
          pipeline: {
            ...pipeline('Repository Automation Validation'),
            triggers: {
              push: ['main'],
              pullRequest: ['main'],
              schedule: [{ cron: `${config.automationMinute} 5 * * 1` }],
            },
            jobs: [
              {
                id: 'security',
                permissions: { contents: 'read', 'security-events': 'write' },
                steps: [
                  checkout,
                  { uses: pins('zizmorcore/zizmor-action'), with: { 'advanced-security': 'true', collect: 'all' } },
                ],
              },
              {
                id: 'syntax',
                permissions: { contents: 'read' },
                steps: [checkout, { uses: pins('raven-actions/actionlint') }],
              },
            ],
          },
        })
      : undefined,
  };
}
