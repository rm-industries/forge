import { dirname, relative, resolve, sep } from 'node:path';

import type { RehypePlugin } from '@astrojs/markdown-remark';

interface Node {
  children?: Node[];
  tagName?: string;
  properties?: { href?: string };
}

interface File {
  path?: string;
}

interface Options {
  base: string;
  docsDirectory: string;
  repositoryDirectory: string;
}

const createDocumentationLinkRewriter =
  ({ base, docsDirectory, repositoryDirectory }: Options) =>
  (tree: Node, file: File) => {
    if (!file.path || !resolve(file.path).startsWith(resolve(docsDirectory) + sep)) return;

    const visit = (node: Node) => {
      const href = node.tagName === 'a' ? node.properties?.href : undefined;
      if (href && !/^(?:[a-z]+:|\/|#)/iu.test(href)) {
        const [path, suffix = ''] = href.split(/(?=[?#])/u, 2);
        const target = resolve(dirname(file.path!), path);
        const docsPath = relative(docsDirectory, target).replaceAll(sep, '/');

        if (path.endsWith('.md') && !docsPath.startsWith('../')) {
          const slug = docsPath.replace(/(?:^|\/)README\.md$/u, '').replace(/\.md$/u, '');
          node.properties!.href = `${base}docs/${slug ? `${slug}/` : ''}${suffix}`;
        } else {
          const repositoryPath = relative(repositoryDirectory, target).replaceAll(sep, '/');
          node.properties!.href = `https://github.com/rm-industries/forge/blob/main/${repositoryPath}${suffix}`;
        }
      }

      node.children?.forEach(visit);
    };

    visit(tree);
  };

export const rewriteDocumentationLinks = createDocumentationLinkRewriter as unknown as RehypePlugin<[Options]>;
