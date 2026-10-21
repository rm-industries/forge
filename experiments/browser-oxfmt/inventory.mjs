import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const native = new Set(['ts', 'css', 'md', 'markdown', 'yaml']);
const preserved = new Set(['sh', 'bash', 'python', 'text', 'plain', 'mermaid', 'astro']);
const roots = [
  ['template', new URL('../../templates/default', import.meta.url).pathname],
  ['forge-site', new URL('../../website', import.meta.url).pathname],
  ['adopting-site', resolve(process.argv[2])],
];
const inventory = [];
for (const [name, root] of roots) {
  const fences = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', '.astro', 'coverage'].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.mdx?$/.test(entry.name)) {
        const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
        for (const [line, text] of lines.entries()) {
          const match = /^\s*(?:`{3,}|~{3,})\s*([\w-]+)/.exec(text);
          if (match)
            fences.push({
              file: relative(root, path),
              line: line + 1,
              language: match[1],
              disposition: native.has(match[1])
                ? 'native'
                : preserved.has(match[1])
                  ? 'preserved-by-oxfmt'
                  : 'unverified',
            });
        }
      }
    }
  }
  await walk(root);
  fences.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  inventory.push({ name, languages: [...new Set(fences.map((f) => f.language))].sort(), fences });
}
await writeFile(new URL('inventory.json', import.meta.url), JSON.stringify(inventory, null, 2) + '\n');
