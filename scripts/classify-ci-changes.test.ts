import { describe, expect, it } from 'vitest';

import { classifyCiChanges, serializeCiSelection } from './classify-ci-changes.ts';

describe('classifyCiChanges', () => {
  it('routes documentation-only changes to lightweight documentation checks', () => {
    expect(classifyCiChanges(['README.md', 'packages/content-model/README.md'])).toEqual({
      audit: false,
      code: false,
      compatibility: false,
      documentation: true,
      generator: false,
      packages: false,
      template: false,
    });
  });

  it('routes content-model source without unrelated template or generator checks', () => {
    expect(classifyCiChanges(['packages/content-model/src/index.ts'])).toEqual({
      audit: false,
      code: true,
      compatibility: true,
      documentation: false,
      generator: false,
      packages: true,
      template: false,
    });
  });

  it('routes create-forge changes through package, compatibility, and generator checks', () => {
    expect(classifyCiChanges(['packages/create-forge/src/cli.ts'])).toMatchObject({
      compatibility: true,
      generator: true,
      packages: true,
      template: false,
    });
  });

  it('routes template changes through template, package, and generator checks', () => {
    expect(classifyCiChanges(['templates/default/src/pages/index.astro'])).toMatchObject({
      compatibility: false,
      generator: true,
      packages: true,
      template: true,
    });
  });

  it('routes bundled template documentation through template and generator checks', () => {
    expect(classifyCiChanges(['templates/default/README.md'])).toMatchObject({
      documentation: true,
      generator: true,
      packages: true,
      template: true,
    });
  });

  it('adds dependency auditing for an affected-area manifest', () => {
    expect(classifyCiChanges(['templates/default/package-lock.json'])).toMatchObject({
      audit: true,
      generator: true,
      packages: true,
      template: true,
    });
  });

  it.each([
    ['shared tooling', ['scripts/verify-template.ts']],
    ['workflow automation', ['.github/workflows/project.yml']],
    ['GitHub metadata', ['.github/ISSUE_TEMPLATE/feature.md']],
    ['root dependency state', ['package-lock.json']],
    ['unclassified paths', ['unexpected.config']],
    ['an empty comparison', []],
  ])('fails safe for %s', (_name, paths) => {
    expect(classifyCiChanges(paths)).toEqual({
      audit: true,
      code: true,
      compatibility: true,
      documentation: true,
      generator: true,
      packages: true,
      template: true,
    });
  });

  it('combines independently affected project areas', () => {
    expect(
      classifyCiChanges(['packages/content-model/src/index.ts', 'templates/default/src/pages/index.astro']),
    ).toMatchObject({ compatibility: true, generator: true, packages: true, template: true });
  });
});

describe('serializeCiSelection', () => {
  it('emits only stable boolean workflow outputs', () => {
    expect(serializeCiSelection(classifyCiChanges(['docs/continuous-integration.md']))).toBe(
      'audit=false\ncode=false\ncompatibility=false\ndocumentation=true\ngenerator=false\npackages=false\ntemplate=false\n',
    );
  });
});
