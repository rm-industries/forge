import type { Rule } from 'markdownlint';
import { isAlias, isMap, isNode, isScalar, parseDocument, visit } from 'yaml';

/** Explicit order of modeled fields; unlisted fields retain their relative order. */
export interface FrontmatterOrderConfiguration {
  orderedKeys: string[];
}

const rule: Rule = {
  names: ['forge/frontmatter-order'],
  description: 'YAML frontmatter fields follow the configured order',
  tags: ['frontmatter'],
  parser: 'none',
  function(params, onError) {
    const config = params.config as Partial<FrontmatterOrderConfiguration>;
    if (
      !config ||
      !Array.isArray(config.orderedKeys) ||
      !config.orderedKeys.every((key) => typeof key === 'string' && key.trim().length > 0) ||
      new Set(config.orderedKeys).size !== config.orderedKeys.length
    ) {
      throw new Error('forge/frontmatter-order requires { orderedKeys: string[] } with nonempty, unique key names.');
    }
    const stripped = params.frontMatterLines.length > 0;
    const lines = stripped ? params.frontMatterLines : params.lines;
    if (lines[0] !== '---') return;
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)$/.test(line));
    const report = (detail: string) =>
      onError({ frontMatter: stripped, lineNumber: 1, detail: `${params.name}: ${detail}` });
    if (end < 0) {
      report('Malformed YAML frontmatter: missing closing delimiter; no fix available.');
      return;
    }
    const source = lines.slice(1, end).join('\n') + '\n';
    const doc = parseDocument(source, { keepSourceTokens: true, uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length) {
      report(
        `Unsafe YAML: ${[...doc.errors, ...doc.warnings].map((error) => error.message).join('; ')}; no fix available.`,
      );
      return;
    }
    if (doc.contents === null) return;
    if (!isMap(doc.contents) || doc.contents.flow) {
      report('Unsafe YAML: frontmatter must be a block mapping; no fix available.');
      return;
    }
    let unsafe = false;
    visit(doc, (_, node) => {
      if (isAlias(node) || (node && typeof node === 'object' && 'anchor' in node && node.anchor)) unsafe = true;
    });
    if (unsafe) {
      report('Unsafe YAML: anchors or aliases prevent source-preserving fixes.');
      return;
    }
    const entries: { key: string; start: number }[] = [];
    let previousEnd = 0;
    for (const pair of doc.contents.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== 'string' || !pair.key.range) {
        report('Unsafe YAML: keys must be simple string keys; no fix available.');
        return;
      }
      const offset = pair.key.range[0];
      const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
      if (offset !== lineStart) {
        report('Unsafe YAML: explicit or indented keys prevent source-preserving fixes.');
        return;
      }
      const gap = source.slice(previousEnd, lineStart).replace(/\n$/, '');
      if (entries.length && /^#/m.test(gap) && gap.split('\n').some((line) => line.trim() === '')) {
        report('Unsafe YAML: ambiguous comment ownership; no fix available.');
        return;
      }
      previousEnd = isNode(pair.value) && pair.value.range ? pair.value.range[2] : pair.key.range[2];
      let start = source.slice(0, offset).split('\n').length - 1;
      // Initial comments describe the document; later contiguous comments travel with their key.
      if (entries.length) {
        while (start > 0 && lines[start]!.startsWith('#')) start--;
        if (start > 0 && lines[start]?.trim() === '' && lines[start + 1]!.startsWith('#')) {
          report('Unsafe YAML: ambiguous comment ownership; no fix available.');
          return;
        }
      }
      entries.push({ key: pair.key.value, start });
    }
    if (!entries.length) return;
    const rank = (key: string) => {
      const index = config.orderedKeys!.indexOf(key);
      return index < 0 ? config.orderedKeys!.length : index;
    };
    const ordered = [...entries].sort((a, b) => rank(a.key) - rank(b.key));
    if (ordered.every((entry, index) => entry === entries[index])) return;
    const detail = `${params.name}: Expected frontmatter order: ${ordered.map(({ key }) => key).join(', ')}.`;
    const yamlLines = lines.slice(1, end);
    const tailStart = source.slice(0, previousEnd).split('\n').length - (source[previousEnd - 1] === '\n' ? 1 : 0);
    const blocks = new Map(
      entries.map((entry, index) => [entry.key, yamlLines.slice(entry.start, entries[index + 1]?.start ?? tailStart)]),
    );
    const replacement = [
      ...yamlLines.slice(0, entries[0]!.start),
      ...ordered.flatMap(({ key }) => blocks.get(key)!),
      ...yamlLines.slice(tailStart),
    ];
    let diagnosed = false;
    for (let index = 0; index < replacement.length; index++) {
      if (replacement[index] !== yamlLines[index]) {
        onError({
          frontMatter: stripped,
          lineNumber: index + 2,
          detail: diagnosed ? 'Frontmatter ordering fix.' : detail,
          fixInfo: { editColumn: 1, deleteCount: yamlLines[index]!.length, insertText: replacement[index]! },
        });
        diagnosed = true;
      }
    }
  },
};

export default rule;
