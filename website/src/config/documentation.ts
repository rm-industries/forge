// Only these canonical sources become public documentation, in this reading order.
export const documentation = [
  { id: 'getting-started', source: 'docs/getting-started.md', section: 'Start here' },
  { id: 'create-forge', source: 'packages/create-forge/README.md', section: 'Package reference' },
  { id: 'content-model', source: 'packages/content-model/README.md', section: 'Package reference' },
  { id: 'browser-oxfmt', source: 'packages/browser-oxfmt/README.md', section: 'Package reference' },
  {
    id: 'markdownlint-frontmatter',
    source: 'packages/markdownlint-frontmatter/README.md',
    section: 'Package reference',
  },
] as const;

export const documentationSources = documentation.map(({ source }) => source);
