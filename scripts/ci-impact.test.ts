import { expect, test } from 'vitest';

import { selectCiImpact } from './ci-impact.ts';

test('routes actual local and copied inputs without changing registry-pinned consumers', () => {
  expect(selectCiImpact(['packages/content-model/src/index.ts'])).toMatchObject({
    packages: 'content-model',
    project: true,
    generator: false,
    website: false,
    native: false,
  });
  expect(selectCiImpact(['packages/markdownlint-frontmatter/src/index.ts'])).toMatchObject({
    packages: 'markdownlint-frontmatter',
    generator: false,
    website: false,
  });
  expect(selectCiImpact(['packages/browser-oxfmt/native/Cargo.lock'])).toMatchObject({
    packages: 'browser-oxfmt',
    native: true,
    generator: false,
    website: false,
  });
  expect(selectCiImpact(['templates/default/src/pages/index.astro'])).toMatchObject({
    packages: 'create-forge',
    generator: true,
    website: false,
    native: false,
  });
  expect(selectCiImpact(['packages/create-forge/src/ci/github.ts'])).toMatchObject({
    packages: 'create-forge',
    generator: true,
    website: false,
  });
  for (const path of ['docs/guide.md', 'website/src/pages/index.astro'])
    expect(selectCiImpact([path])).toMatchObject({ project: false, generator: false, website: true, packages: '' });
  expect(selectCiImpact(['website/a', 'packages/content-model/deleted.ts'])).toMatchObject({
    packages: 'content-model',
    generator: false,
    website: true,
  });
  for (const paths of [
    null,
    [],
    ['unknown'],
    ['package-lock.json'],
    ['.github/actions/setup-project/action.yml'],
    ['.github/workflows/project.yml'],
  ])
    expect(selectCiImpact(paths)).toMatchObject({
      packages: 'browser-oxfmt content-model create-forge markdownlint-frontmatter',
      project: true,
      generator: true,
      website: true,
      native: true,
    });
});
