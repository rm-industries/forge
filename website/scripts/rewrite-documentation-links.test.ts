import { fileURLToPath } from 'node:url';

import { unified } from '@astrojs/markdown-remark';
import { describe, expect, it } from 'vitest';

import { rewriteDocumentationLinks } from './rewrite-documentation-links';

const repositoryDirectory = fileURLToPath(new URL('../../', import.meta.url));

const renderLinks = async (base: string, source: string, markdown: string) => {
  const processor = await unified({
    rehypePlugins: [[rewriteDocumentationLinks, { base, repositoryDirectory }]],
  }).createRenderer({});
  return (await processor.render(markdown, { fileURL: new URL(source, new URL('../../', import.meta.url)) })).code;
};

describe('published documentation links', () => {
  it.each(['/', '/forge/'])('links a registered source to its actual route under %s', async (base) => {
    expect(
      await renderLinks(base, 'docs/getting-started.md', '[Start](getting-started.md?view=full#prepare-your-tools)'),
    ).toContain(`href="${base}docs/getting-started/?view=full#prepare-your-tools"`);
  });

  it.each(['/', '/forge/'])(
    'links canonical package sources through their registered routes under %s',
    async (base) => {
      const html = await renderLinks(
        base,
        'packages/browser-oxfmt/README.md',
        '[Model](../content-model/README.md#model-language)',
      );
      expect(html).toContain(`href="${base}docs/content-model/#model-language"`);
    },
  );

  it('keeps unregistered Markdown and source references on GitHub', async () => {
    const html = await renderLinks(
      '/',
      'docs/getting-started.md',
      '[Contribute](../CONTRIBUTING.md#local-development) [CLI](../packages/create-forge/src/index.ts)',
    );
    expect(html).toContain('href="https://github.com/rm-industries/forge/blob/main/CONTRIBUTING.md#local-development"');
    expect(html).toContain(
      'href="https://github.com/rm-industries/forge/blob/main/packages/create-forge/src/index.ts"',
    );
  });

  it('leaves external, absolute and fragment links unchanged', async () => {
    const html = await renderLinks(
      '/forge/',
      'docs/getting-started.md',
      '[External](https://example.com) [Anchor](#prepare-your-tools) [Absolute](/docs/)',
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="#prepare-your-tools"');
    expect(html).toContain('href="/docs/"');
  });

  it('does not rewrite files outside the publication registry', async () => {
    expect(await renderLinks('/', 'README.md', '[Guide](docs/getting-started.md)')).toContain(
      'href="docs/getting-started.md"',
    );
  });
});
