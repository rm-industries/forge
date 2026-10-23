const packageNames = ['browser-oxfmt', 'content-model', 'create-forge', 'markdownlint-frontmatter'];

/** Unknown ownership deliberately retains broad validation. */
export function selectCiImpact(paths: string[] | null) {
  const broad =
    !paths?.length ||
    paths.some(
      (path) =>
        !path.startsWith('website/') &&
        !path.startsWith('docs/') &&
        !path.startsWith('templates/default/') &&
        !packageNames.some((name) => path.startsWith(`packages/${name}/`)),
    );
  const selected = packageNames.filter(
    (name) =>
      broad ||
      paths?.some(
        (path) =>
          path.startsWith(`packages/${name}/`) || (name === 'create-forge' && path.startsWith('templates/default/')),
      ),
  );
  return {
    project: selected.length > 0,
    generator: selected.includes('create-forge'),
    website: broad || !!paths?.some((path) => path.startsWith('website/') || path.startsWith('docs/')),
    websiteFullBrowsers: !paths?.length || !paths.every((path) => /^docs\/.+\.md$/.test(path)),
    packages: selected.join(' '),
    native: selected.includes('browser-oxfmt'),
  };
}
