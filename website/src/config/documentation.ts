// Only these canonical sources become public documentation, in this reading order.
export const documentation = [
  { id: 'getting-started', source: 'docs/getting-started.md', section: 'Start here' },
  { id: 'configuration', source: 'docs/configuration.md', section: 'Guides' },
  { id: 'content-and-cms', source: 'docs/content-and-cms.md', section: 'Guides' },
  { id: 'themes-and-accessibility', source: 'docs/themes-and-accessibility.md', section: 'Guides' },
  { id: 'deployment', source: 'docs/deployment.md', section: 'Guides' },
  { id: 'ci-providers', source: 'docs/ci-providers.md', section: 'Guides' },
  { id: 'quality-and-troubleshooting', source: 'docs/quality-and-troubleshooting.md', section: 'Guides' },
  { id: 'upgrades', source: 'docs/upgrades.md', section: 'Guides' },
  { id: 'support-policy', source: 'docs/support-policy.md', section: 'Guides' },
  { id: 'browser-formatter-adoption', source: 'docs/browser-formatter-adoption.md', section: 'Guides' },
] as const;

export const documentationSources = documentation.map(({ source }) => source);
