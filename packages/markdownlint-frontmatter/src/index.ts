import { isDeepStrictEqual } from 'node:util';

import type { Rule } from 'markdownlint';
import { isAlias, isMap, isNode, isScalar, parseDocument, visit } from 'yaml';

/** Explicit order of modeled fields; unlisted fields retain their relative order. */
export interface FrontmatterOrderConfiguration {
  orderedKeys: string[];
}

/** Derive top-level YAML order from a shared model; its separate body is excluded. */
export function frontmatterOrderFromModel(model: { fields: object }): FrontmatterOrderConfiguration {
  return { orderedKeys: Object.keys(model.fields) };
}

const rule: Rule = {
  names: ['forge/frontmatter-order'],
  description: 'YAML frontmatter fields follow the configured order',
  tags: ['frontmatter'],
  parser: 'none',
  function(params, onError) {
    const config: unknown = params.config;
    const configuredKeys =
      typeof config === 'object' && config !== null && 'orderedKeys' in config ? config.orderedKeys : undefined;
    const orderedKeys = Array.isArray(configuredKeys) ? Array.from<unknown>(configuredKeys) : undefined;
    if (
      !orderedKeys ||
      !orderedKeys.every((key: unknown): key is string => typeof key === 'string' && key.trim().length > 0) ||
      new Set(orderedKeys).size !== orderedKeys.length
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
    let gapStart = 0;
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
      const gap = source.slice(gapStart, lineStart).replace(/\n$/, '');
      if (entries.length && /^[ \t]*#/m.test(gap) && gap.split('\n').some((line) => line.trim() === '')) {
        report('Unsafe YAML: ambiguous comment ownership; no fix available.');
        return;
      }
      let start = source.slice(0, offset).split('\n').length - 1;
      // Only parser-bounded gaps contain comments; scalar content may also start with '#'.
      if (entries.length) {
        start -= gap.split('\n').filter((line) => /^[ \t]*#/.test(line)).length;
      } else {
        const prefix = gap.split('\n');
        let attached = 0;
        for (const line of [...prefix].reverse()) {
          if (!/^[ \t]*#/.test(line)) break;
          attached++;
        }
        if (attached === prefix.length) {
          report('Unsafe YAML: ambiguous comment ownership at document start; separate the header with a blank line.');
          return;
        }
        start -= attached;
      }
      previousEnd = isNode(pair.value) && pair.value.range ? pair.value.range[2] : pair.key.range[2];
      const valueEnd = isNode(pair.value) && pair.value.range ? pair.value.range[1] : pair.key.range[1];
      gapStart = source[valueEnd - 1] === '\n' ? valueEnd : source.indexOf('\n', valueEnd) + 1;
      entries.push({ key: pair.key.value, start });
    }
    const [firstEntry] = entries;
    if (!firstEntry) return;
    const rank = (key: string) => {
      const index = orderedKeys.indexOf(key);
      return index < 0 ? orderedKeys.length : index;
    };
    const yamlLines = lines.slice(1, end);
    const tailStart = source.slice(0, previousEnd).split('\n').length - (source[previousEnd - 1] === '\n' ? 1 : 0);
    const blocks = entries.map((entry, index) => ({
      key: entry.key,
      lines: yamlLines.slice(entry.start, entries[index + 1]?.start ?? tailStart),
    }));
    const ordered = [...blocks].sort((a, b) => rank(a.key) - rank(b.key));
    if (ordered.every((block, index) => block === blocks[index])) return;
    const detail = `${params.name}: Expected frontmatter order: ${ordered.map(({ key }) => key).join(', ')}.`;
    const replacement = [
      ...yamlLines.slice(0, firstEntry.start),
      ...ordered.flatMap((block) => block.lines),
      ...yamlLines.slice(tailStart),
    ];
    const proposed = parseDocument(replacement.join('\n') + '\n', { uniqueKeys: true });
    if (
      proposed.errors.length ||
      proposed.warnings.length ||
      !isDeepStrictEqual(doc.toJS({ mapAsMap: true }), proposed.toJS({ mapAsMap: true }))
    ) {
      report('Unsafe YAML: reordering would change YAML meaning; no fix available.');
      return;
    }
    if (replacement.length !== yamlLines.length) {
      report('Unsafe YAML: reordering would change frontmatter line count; no fix available.');
      return;
    }
    const fixes = [];
    for (const [index, insertText] of replacement.entries()) {
      const original = yamlLines[index];
      if (original === undefined) {
        report('Unsafe YAML: missing source line; no fix available.');
        return;
      }
      if (insertText !== original) {
        fixes.push({ lineNumber: index + 2, fixInfo: { editColumn: 1, deleteCount: original.length, insertText } });
      }
    }
    for (const [index, fix] of fixes.entries()) {
      onError({ frontMatter: stripped, ...fix, detail: index === 0 ? detail : 'Frontmatter ordering fix.' });
    }
  },
};

export default rule;
