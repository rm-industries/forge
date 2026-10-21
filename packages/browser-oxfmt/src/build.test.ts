import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, expect, test } from 'vitest';

import { resolveBrowserOptions } from './build.js';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture(config = {}) {
  const cwd = await mkdtemp(join(tmpdir(), 'browser-oxfmt-config-'));
  directories.push(cwd);
  await mkdir(join(cwd, 'node_modules'), { recursive: true });
  await symlink(resolve('../../node_modules/oxfmt'), join(cwd, 'node_modules/oxfmt'));
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}');
  await writeFile(join(cwd, 'oxfmt.config.mjs'), `export default ${JSON.stringify(config)}`);
  await writeFile(
    join(cwd, '.editorconfig'),
    'root = true\n[*]\nindent_style = space\nindent_size = 2\nmax_line_length = 120\nend_of_line = lf\n',
  );
  return cwd;
}
test('rejects filenames outside the browser runtime contract at build time', async () => {
  const cwd = await fixture();
  await expect(resolveBrowserOptions({ cwd, filename: 'article.MD' })).rejects.toMatchObject({
    code: 'configuration',
  });
});
test('derives EditorConfig width and authoritative options with separate approved diagnostic', async () => {
  const cwd = await fixture({
    singleQuote: true,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
    trailingComma: 'all',
    ignorePatterns: [],
  });
  const result = await resolveBrowserOptions({ cwd, filename: 'src/content/article.md' });
  expect(result.resolvedOptions).toEqual({
    upstreamVersion: '0.72.0',
    options: {
      printWidth: 120,
      tabWidth: 2,
      singleQuote: true,
      proseWrap: 'preserve',
      endOfLine: 'lf',
      useTabs: false,
      embeddedLanguageFormatting: 'auto',
      sortImports: true,
      sortPackageJson: true,
      trailingComma: 'all',
    },
  });
  expect(result.diagnostics).toEqual([{ code: 'tailwind-class-order-preserved', message: expect.any(String) }]);
  expect(JSON.stringify(result)).not.toContain(cwd);
});

test('applies every matching host filename override in order, excluding unrelated fenced filenames', async () => {
  const cwd = await fixture({
    singleQuote: true,
    proseWrap: 'always',
    overrides: [
      { files: ['*.md'], options: { printWidth: 44, tabWidth: 4 } },
      { files: ['src/**/*.md'], excludeFiles: ['src/excluded.md'], options: { printWidth: 60, endOfLine: 'crlf' } },
      { files: ['**/*.ts'], options: { singleQuote: false } },
    ],
  });
  for (const filename of ['root.md', 'src/article.md', 'src/nested/article.md', 'src/excluded.md']) {
    const { resolvedOptions } = await resolveBrowserOptions({ cwd, filename });
    expect(resolvedOptions.options.singleQuote).toBe(true);
    expect(resolvedOptions.options.tabWidth).toBe(4);
    expect(resolvedOptions.options.printWidth).toBe(
      filename.startsWith('src/') && filename !== 'src/excluded.md' ? 60 : 44,
    );
    const source =
      'A paragraph with enough words to wrap in different positions according to each selected filename policy.\n\n```ts\nconst value="hello";\n```\n';
    const cli = execFileSync(
      process.execPath,
      [
        resolve('../../node_modules/oxfmt/bin/oxfmt'),
        '--config',
        join(cwd, 'oxfmt.config.mjs'),
        '--stdin-filepath',
        join(cwd, filename),
      ],
      { cwd, input: source, encoding: 'utf8' },
    );
    const { format } = await import('oxfmt');
    expect((await format(filename, source, { ...resolvedOptions.options })).code).toBe(cli);
  }
});

test('reloads the authoritative module on rebuild and rejects unsupported or executable settings', async () => {
  const cwd = await fixture({ printWidth: 40 });
  expect((await resolveBrowserOptions({ cwd, filename: 'article.md' })).resolvedOptions.options.printWidth).toBe(40);
  await writeFile(
    join(cwd, 'oxfmt.config.mjs'),
    'export default {printWidth:72,useTabs:true,tabWidth:4,proseWrap:"never",endOfLine:"crlf",singleQuote:true}',
  );
  expect((await resolveBrowserOptions({ cwd, filename: 'article.md' })).resolvedOptions.options).toMatchObject({
    printWidth: 72,
    tabWidth: 4,
    useTabs: true,
    proseWrap: 'never',
    endOfLine: 'crlf',
    singleQuote: true,
  });
  for (const config of [
    '{bracketSpacing:false}',
    '{printWidth:()=>80}',
    '{embeddedLanguageFormatting:"off"}',
    '{sortImports:{groups:[]}}',
    '{ignorePatterns:["*.md"]}',
    '{overrides:[{files:["*.ts"],options:{semi:false}}]}',
    '{overrides:[{files:["**/*.{md,mdx}"],options:{printWidth:60}}]}',
  ]) {
    await writeFile(join(cwd, 'oxfmt.config.mjs'), `export default ${config}`);
    await expect(resolveBrowserOptions({ cwd, filename: 'article.md' })).rejects.toMatchObject({
      code: 'configuration',
    });
  }
});
test('fails on installed consumer version mismatch and uniform-policy selectors', async () => {
  const cwd = await fixture({ overrides: [{ files: ['*.md'], options: { printWidth: 40 } }] });
  await expect(resolveBrowserOptions({ cwd, filename: 'article.md', requireUniformPolicy: true })).rejects.toThrow(
    /Uniform/,
  );
  await writeFile(join(cwd, 'oxfmt.config.mjs'), 'export default {}');
  await writeFile(join(cwd, '.editorconfig'), 'root=true\n[*]\nindent_style=space\n[*.md]\nmax_line_length=80\n');
  await expect(resolveBrowserOptions({ cwd, filename: 'article.md', requireUniformPolicy: true })).rejects.toThrow(
    /Uniform/,
  );
  const mismatch = await fixture();
  await rm(join(mismatch, 'node_modules/oxfmt'));
  await mkdir(join(mismatch, 'node_modules/oxfmt'));
  await writeFile(
    join(mismatch, 'node_modules/oxfmt/package.json'),
    '{"version":"0.73.0","exports":{"./package.json":"./package.json"}}',
  );
  await expect(resolveBrowserOptions({ cwd: mismatch, filename: 'article.md' })).rejects.toThrow(/does not match/);
});
test('uses only the nearest EditorConfig and verifies per-file fallback against the real CLI', async () => {
  const cwd = await fixture({ proseWrap: 'always' });
  await mkdir(join(cwd, 'child'));
  await writeFile(
    join(cwd, 'child/.editorconfig'),
    '[*]\nindent_style=space\nindent_size=4\n[*.md]\nmax_line_length=45\nquote_type=single\n',
  );
  const input = { cwd: join(cwd, 'child'), filename: 'article.md', configFile: '../oxfmt.config.mjs' };
  const { resolvedOptions } = await resolveBrowserOptions(input);
  expect(resolvedOptions.options).toMatchObject({ printWidth: 45, tabWidth: 4, singleQuote: true });
  const source =
    'A paragraph with enough words to demonstrate configured width and indentation from one authoritative project policy.\n\n```ts\nconst value="hello";\n```\n';
  const cli = execFileSync(
    process.execPath,
    [
      resolve('../../node_modules/oxfmt/bin/oxfmt'),
      '--config',
      join(cwd, 'oxfmt.config.mjs'),
      '--stdin-filepath',
      join(cwd, 'child/article.md'),
    ],
    { cwd: input.cwd, input: source, encoding: 'utf8' },
  );
  const { format } = await import('oxfmt');
  expect((await format('article.md', source, { ...resolvedOptions.options })).code).toBe(cli);
  await writeFile(join(cwd, 'child/.editorconfig'), '[*]\nindent_style=space\n');
  expect((await resolveBrowserOptions(input)).resolvedOptions.options.printWidth).toBe(100);
  await expect(resolveBrowserOptions({ cwd, filename: 'child/article.md' })).rejects.toThrow(/Descendant/);
  await writeFile(join(cwd, 'child/oxfmt.config.mjs'), 'export default {}');
  await expect(resolveBrowserOptions({ cwd, filename: 'child/article.md' })).rejects.toThrow(/Nested/);
});
test('rejects unverified EditorConfig indentation forms and hidden-path wildcard overrides', async () => {
  const cwd = await fixture();
  for (const value of ['indent_style=tab', 'indent_size=tab', 'max_line_length=unset', 'insert_final_newline=false']) {
    await writeFile(join(cwd, '.editorconfig'), `root=true\n[*]\n${value}\n`);
    await expect(resolveBrowserOptions({ cwd, filename: 'article.md' })).rejects.toThrow(/Unsupported EditorConfig/);
  }
  await writeFile(join(cwd, '.editorconfig'), 'root=true\n[*]\nindent_style=space\n');
  await writeFile(
    join(cwd, 'oxfmt.config.mjs'),
    'export default {overrides:[{files:["*.md"],options:{printWidth:40}}]}',
  );
  await expect(resolveBrowserOptions({ cwd, filename: 'src/.hidden.md' })).rejects.toThrow(/Hidden/);
});

test('uniform policy rejects a nested config even outside the representative Markdown path', async () => {
  const cwd = await fixture();
  await mkdir(join(cwd, 'other-collection'));
  await writeFile(join(cwd, 'other-collection/.editorconfig'), '[*]\nmax_line_length=40\n');
  await expect(resolveBrowserOptions({ cwd, filename: 'article.md', requireUniformPolicy: true })).rejects.toThrow(
    /Uniform/,
  );
});

test('uses explicit EditorConfig tab width and configured tabs without inferring missing indentation style', async () => {
  const cwd = await fixture({ proseWrap: 'never', useTabs: true, tabWidth: 4, singleQuote: true, endOfLine: 'crlf' });
  const { resolvedOptions } = await resolveBrowserOptions({ cwd, filename: 'article.md' });
  const source = '```ts\nfunction test(){if(true){console.log("hello");}}\n```\n';
  const cli = execFileSync(
    process.execPath,
    [
      resolve('../../node_modules/oxfmt/bin/oxfmt'),
      '--config',
      join(cwd, 'oxfmt.config.mjs'),
      '--stdin-filepath',
      join(cwd, 'article.md'),
    ],
    { cwd, input: source, encoding: 'utf8' },
  );
  const { format } = await import('oxfmt');
  expect((await format('article.md', source, { ...resolvedOptions.options })).code).toBe(cli);
  await writeFile(join(cwd, 'oxfmt.config.mjs'), 'export default {}');
  await writeFile(join(cwd, '.editorconfig'), '[*]\nindent_style=space\ntab_width=4\n');
  expect((await resolveBrowserOptions({ cwd, filename: 'article.md' })).resolvedOptions.options.tabWidth).toBe(4);
  await writeFile(join(cwd, '.editorconfig'), '[*]\nindent_size=4\n');
  await expect(resolveBrowserOptions({ cwd, filename: 'article.md' })).rejects.toThrow(/requires indent_style/);
});

test('does not silently truncate malformed EditorConfig or apply ignored filename policies', async () => {
  const cwd = await fixture({ ignorePatterns: ['excluded/**', 'docs/private.md'] });
  expect((await resolveBrowserOptions({ cwd, filename: 'article.md' })).resolvedOptions.options.printWidth).toBe(120);
  await expect(resolveBrowserOptions({ cwd, filename: 'excluded/article.md' })).rejects.toThrow(/excluded/);
  await expect(resolveBrowserOptions({ cwd, filename: 'docs/private.md' })).rejects.toThrow(/excluded/);
  await writeFile(join(cwd, '.editorconfig'), '[*]\nindent_style=space\ninvalid line\nmax_line_length=44\n');
  await expect(resolveBrowserOptions({ cwd, filename: 'article.md' })).rejects.toThrow(/Invalid EditorConfig/);
});

test('checks accepted question-mark and anchored literal patterns against the matching CLI', async () => {
  const cwd = await fixture({
    proseWrap: 'always',
    overrides: [{ files: ['question?.md', './root.md'], options: { printWidth: 40 } }],
  });
  const source =
    'Words in a paragraph exercise the chosen width so a pattern mismatch changes public output and cannot pass unnoticed.\n';
  const { format } = await import('oxfmt');
  for (const filename of ['root.md', 'nested/root.md', 'question1.md', 'question😀.md']) {
    const { resolvedOptions } = await resolveBrowserOptions({ cwd, filename });
    const expected = execFileSync(
      process.execPath,
      [
        resolve('../../node_modules/oxfmt/bin/oxfmt'),
        '--config',
        join(cwd, 'oxfmt.config.mjs'),
        '--stdin-filepath',
        join(cwd, filename),
      ],
      { cwd, input: source, encoding: 'utf8' },
    );
    expect((await format(filename, source, { ...resolvedOptions.options })).code).toBe(expected);
  }
});
