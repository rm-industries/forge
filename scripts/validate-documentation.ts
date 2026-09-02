import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  criticalCommands,
  externalLinkExceptions,
  externalLinkPolicy,
  type CriticalCommand,
  type ExternalLinkException,
} from './documentation-validation.config.ts';

export interface DocumentationProblem {
  file: string;
  line: number;
  message: string;
}

interface Link {
  destination: string;
  line: number;
}

const ignoredDirectories = new Set([
  '.cache',
  '.git',
  '.lighthouseci',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const markdownLinks = /!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['"][^'"]*['"])?\s*\)/gu;

const delay = async (milliseconds: number) => new Promise<void>((complete) => setTimeout(complete, milliseconds));

const normalizeRelativePath = (path: string) => path.split(sep).join('/');

const lineNumberAt = (value: string, index: number) => value.slice(0, index).split('\n').length;

const withoutFencedCode = (markdown: string) => {
  let inFence = false;

  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/u.test(line)) {
        inFence = !inFence;
        return '';
      }

      return inFence ? '' : line;
    })
    .join('\n');
};

export const findMarkdownLinks = (markdown: string): Link[] => {
  const visibleMarkdown = withoutFencedCode(markdown);

  return [...visibleMarkdown.matchAll(markdownLinks)].map((match) => ({
    destination: match[1] ?? match[2] ?? '',
    line: lineNumberAt(visibleMarkdown, match.index),
  }));
};

const headingSlug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/<[^>]*>/gu, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/[`*_~]/gu, '')
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\- ]/gu, '')
    .trim()
    .replace(/\s+/gu, '-');

export const findHeadingAnchors = (markdown: string) => {
  const anchors = new Set<string>();
  const occurrences = new Map<string, number>();

  for (const line of withoutFencedCode(markdown).split('\n')) {
    const match = /^#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!match?.[1]) continue;

    const base = headingSlug(match[1]);
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    anchors.add(occurrence === 0 ? base : `${base}-${occurrence}`);
  }

  return anchors;
};

const listMarkdownFiles = async (root: string, directory = root): Promise<string[]> => {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(root, path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }

  return files;
};

const resolveMarkdownTarget = async (path: string) => {
  try {
    return (await stat(path)).isDirectory() ? join(path, 'README.md') : path;
  } catch {
    return path;
  }
};

const isExternal = (destination: string) => /^https?:\/\//u.test(destination);

export const validateInternalLinks = async (root: string, files?: string[]) => {
  const markdownFiles = files ?? (await listMarkdownFiles(root));
  const problems: DocumentationProblem[] = [];

  for (const file of markdownFiles) {
    const markdown = await readFile(file, 'utf8');

    for (const link of findMarkdownLinks(markdown)) {
      if (isExternal(link.destination) || /^(mailto|tel|data):/u.test(link.destination)) continue;

      const [encodedPath = '', encodedFragment] = link.destination.split('#', 2);
      const decodedPath = decodeURIComponent(encodedPath.split('?', 1)[0] ?? '');
      const target = await resolveMarkdownTarget(
        decodedPath === ''
          ? file
          : resolve(dirname(file), isAbsolute(decodedPath) ? decodedPath.slice(1) : decodedPath),
      );
      const targetRelative = normalizeRelativePath(relative(root, target));

      if (targetRelative === '..' || targetRelative.startsWith('../')) {
        problems.push({
          file: normalizeRelativePath(relative(root, file)),
          line: link.line,
          message: `link escapes the repository: ${link.destination}`,
        });
        continue;
      }

      try {
        const targetMarkdown = await readFile(target, 'utf8');
        if (encodedFragment) {
          const fragment = decodeURIComponent(encodedFragment).toLowerCase();
          if (!findHeadingAnchors(targetMarkdown).has(fragment)) {
            problems.push({
              file: normalizeRelativePath(relative(root, file)),
              line: link.line,
              message: `heading not found: ${link.destination}`,
            });
          }
        }
      } catch {
        problems.push({
          file: normalizeRelativePath(relative(root, file)),
          line: link.line,
          message: `file not found: ${link.destination}`,
        });
      }
    }
  }

  return problems;
};

export const validateCriticalCommands = async (root: string, commands: CriticalCommand[] = criticalCommands) => {
  const problems: DocumentationProblem[] = [];

  for (const rule of commands) {
    const documentation = await readFile(join(root, rule.documentation), 'utf8');
    if (!documentation.includes(rule.command)) {
      problems.push({
        file: rule.documentation,
        line: 1,
        message: `critical command is missing or stale: ${rule.command}`,
      });
    }

    if (rule.manifest) {
      const script = /npm run ([\w:.-]+)/u.exec(rule.command)?.[1];
      const manifest = JSON.parse(await readFile(join(root, rule.manifest), 'utf8')) as {
        scripts?: Record<string, string>;
      };
      if (script && !manifest.scripts?.[script]) {
        problems.push({
          file: rule.documentation,
          line: 1,
          message: `${rule.command} refers to a missing script in ${rule.manifest}`,
        });
      }
    }
  }

  return problems;
};

const requestExternalLink = async (url: string, fetcher: typeof fetch) => {
  const response = await fetcher(url, {
    headers: { 'user-agent': 'rm-industries-forge-documentation-checker' },
    method: 'HEAD',
    redirect: 'follow',
    signal: AbortSignal.timeout(externalLinkPolicy.timeoutMilliseconds),
  });

  if (response.status === 405) {
    return fetcher(url, {
      headers: { 'user-agent': 'rm-industries-forge-documentation-checker' },
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(externalLinkPolicy.timeoutMilliseconds),
    });
  }

  return response;
};

export const validateExternalLinks = async (
  root: string,
  fetcher: typeof fetch = fetch,
  exceptions: ExternalLinkException[] = externalLinkExceptions,
) => {
  const files = await listMarkdownFiles(root);
  const destinations = new Map<string, { file: string; line: number }>();
  const problems: DocumentationProblem[] = [];

  for (const file of files) {
    for (const link of findMarkdownLinks(await readFile(file, 'utf8'))) {
      if (isExternal(link.destination) && !destinations.has(link.destination)) {
        destinations.set(link.destination, {
          file: normalizeRelativePath(relative(root, file)),
          line: link.line,
        });
      }
    }
  }

  for (const [url, location] of destinations) {
    const exception = exceptions.find((candidate) => candidate.url === url);
    if (exception && Date.parse(exception.expires) >= Date.now()) continue;

    let failure = 'request failed';
    for (let attempt = 1; attempt <= externalLinkPolicy.attempts; attempt += 1) {
      try {
        const response = await requestExternalLink(url, fetcher);
        if (response.ok) {
          failure = '';
          break;
        }
        failure = `HTTP ${response.status}`;
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
      }

      if (attempt < externalLinkPolicy.attempts) {
        await delay(externalLinkPolicy.retryDelayMilliseconds * attempt);
      }
    }

    if (failure) problems.push({ ...location, message: `external link failed: ${url} (${failure})` });
  }

  return problems;
};

const printProblems = (problems: DocumentationProblem[]) => {
  for (const problem of problems) {
    console.error(`::error file=${problem.file},line=${problem.line}::${problem.message}`);
  }
};

export const runDocumentationValidation = async (root: string, includeExternal: boolean) => {
  const problems = [
    ...(await validateInternalLinks(root)),
    ...(await validateCriticalCommands(root)),
    ...(includeExternal ? await validateExternalLinks(root) : []),
  ];
  printProblems(problems);
  return problems.length === 0;
};

const isDirectExecution = process.argv[1] ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href : false;

if (isDirectExecution) {
  const valid = await runDocumentationValidation(process.cwd(), process.argv.includes('--external'));
  if (!valid) process.exitCode = 1;
}
