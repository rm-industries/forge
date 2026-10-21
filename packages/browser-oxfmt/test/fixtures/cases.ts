import { readFile } from 'node:fs/promises';

import type { FormatConfig, format as nativeFormat } from 'oxfmt';

import type { FormatterOptions } from '../../src/options.ts';
type FixtureOptions = FormatterOptions & FormatConfig & { sortTailwindcss?: boolean };

interface Sample {
  id: string;
  source: string;
  preserve?: string;
  policy?: boolean;
}
interface Baseline {
  samples: Sample[];
  configs: Record<string, FixtureOptions>;
}

const root = new URL('./', import.meta.url);
export const baseline: Baseline = JSON.parse(await readFile(new URL('baseline.json', root), 'utf8'));
const fence = (language: string, source: string) => `\n\`\`\`${language}\n${source}\n\`\`\`\n`;
const extras: Sample[] = [
  { id: 'frontmatter', source: '---\ntitle: "Example"\ntags: [one,two]\n---\n\n# Title\n' },
  { id: 'yaml-fence', source: fence('yaml', 'items: [one,two]\nname: "Example"') },
  { id: 'ts-fence', source: fence('ts', 'const x: string="hello";') },
  { id: 'css-fence', source: fence('css', 'a{color:red;margin:0 1px}') },
  {
    id: 'nested-markdown',
    source: '1. Nested\n\n   ~~~md\n   #  Nested title\n\n   ```ts\n   const x=1\n   ```\n   ~~~\n',
  },
  { id: 'ignore', source: '<!-- prettier-ignore -->\n' + fence('ts', 'const x=   1') },
  { id: 'malformed-yaml', source: '---\na: [\n---\n\nText\n' },
  { id: 'malformed-ts', source: fence('ts', 'const = ;') },
  { id: 'unclosed-fence', source: '```ts\nconst x=1\n' },
  { id: 'unicode-crlf', source: '#  Café 👩🏽‍💻\r\n\r\n中文\r\n' },
  { id: 'bom', source: '\ufeff#  Heading\n' },
  ...['sh', 'bash', 'python', 'text', 'plain', 'mermaid', 'astro', 'unknown-language'].map((language) => ({
    id: `preserve-${language}`,
    source: fence(language, '  untouched   = "👩🏽‍💻"  '),
    preserve: '  untouched   = "👩🏽‍💻"',
  })),
  {
    id: 'policy-imports',
    source: fence('ts', "import {z} from 'z';\nimport {a} from 'a';\nconsole.log(z,a);"),
    policy: true,
  },
  { id: 'policy-tailwind', source: fence('css', '.example { @apply text-white flex p-4; }'), policy: true },
];
export const configurations: Record<string, FixtureOptions> = {
  ...baseline.configs,
  forgePolicy: {
    ...baseline.configs.twoSpacesWrapped!,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
    trailingComma: 'all',
  },
};
export async function createCases(format: typeof nativeFormat) {
  const cases = [];
  for (const sample of [...baseline.samples, ...extras]) {
    for (const [configName, options] of Object.entries(configurations)) {
      const referenceOptions = sample.policy
        ? { ...options, sortImports: true, sortTailwindcss: true, sortPackageJson: true, trailingComma: 'all' as const }
        : options;
      const expected = await format('article.md', sample.source, referenceOptions);
      cases.push({
        ...sample,
        configName,
        options: referenceOptions,
        expected: expected.code,
        expectedErrors: expected.errors.map((e) => e.message),
      });
    }
  }
  return cases;
}
