// Only these canonical sources become public documentation, in this reading order.
export const documentation = [
  { id: 'getting-started', source: 'docs/getting-started.md', section: 'Start here' },
] as const;

export const documentationSources = documentation.map(({ source }) => source);
