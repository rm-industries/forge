import { expect, test } from 'vitest';

import { format, engine, BrowserOxfmtError, type ResolvedOptions } from './index.js';
const resolved: ResolvedOptions = {
  upstreamVersion: '0.74.0',
  options: {
    printWidth: 120,
    tabWidth: 2,
    singleQuote: true,
    proseWrap: 'always',
    endOfLine: 'lf',
    useTabs: false,
    embeddedLanguageFormatting: 'auto',
  },
};
test('exports the measured native engine and approved Tailwind limitation', () => {
  expect(engine.upstreamVersion).toBe('0.74.0');
  expect(engine.capabilities.tailwindClassSorting).toBe(false);
});
test('rejects invalid source and filenames before creating a worker', async () => {
  for (const [source, filename] of [
    [null, 'article.md'],
    ['text', 'article.ts'],
    ['text', ''],
    ['text', 'article\0.md'],
  ])
    await expect(format(source as string, filename as string, resolved)).rejects.toMatchObject({ code: 'input' });
});
test('rejects mismatched versions and unsupported resolved options', async () => {
  await expect(format('text', 'article.md', { ...resolved, upstreamVersion: '0.71.0' })).rejects.toMatchObject({
    code: 'configuration',
  });
  for (const options of [
    { ...resolved.options, printWidth: NaN },
    { ...resolved.options, proseWrap: ['always'] },
    { ...resolved.options, endOfLine: { toString: () => 'lf' } },
    { ...resolved.options, sortTailwindcss: true },
    { ...resolved.options, embeddedLanguageFormatting: 'off' },
    { ...resolved.options, trailingComma: 'none' },
  ])
    await expect(format('text', 'article.md', { ...resolved, options } as ResolvedOptions)).rejects.toMatchObject({
      code: 'configuration',
    });
});
test('reports missing worker capability as a structured error', async () => {
  await expect(format('text', 'article.md', resolved)).rejects.toBeInstanceOf(BrowserOxfmtError);
  await expect(format('text', 'article.md', resolved)).rejects.toMatchObject({ code: 'worker' });
});
