import { dirname, relative, resolve, sep } from 'node:path';

import type { RehypePlugin } from '@astrojs/markdown-remark';

import { documentation } from '../src/config/documentation.ts';
import { documentationHref } from '../src/lib/documentation.ts';
import { resolveSiteHref } from '../src/lib/paths';

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
  repositoryDirectory: string;
}

const createDocumentationLinkRewriter =
  ({ base, repositoryDirectory }: Options) =>
  (tree: Node, file: File) => {
    if (!file.path || !documentation.some(({ source }) => resolve(repositoryDirectory, source) === resolve(file.path!)))
      return;

    const visit = (node: Node) => {
      const href = node.tagName === 'a' ? node.properties?.href : undefined;
      if (href && !/^(?:[a-z]+:|\/|#|\?)/iu.test(href)) {
        const [, path, suffix] = /^([^?#]+)(.*)$/u.exec(href)!;
        const target = resolve(dirname(file.path!), path);
        const repositoryPath = relative(repositoryDirectory, target).replaceAll(sep, '/');
        const publication = documentation.find(({ source }) => source === repositoryPath);

        node.properties!.href = publication
          ? `${resolveSiteHref(documentationHref(publication.id), base)}${suffix}`
          : `https://github.com/rm-industries/forge/blob/main/${repositoryPath}${suffix}`;
      }

      node.children?.forEach(visit);
    };

    visit(tree);
  };

export const rewriteDocumentationLinks = createDocumentationLinkRewriter as unknown as RehypePlugin<[Options]>;
