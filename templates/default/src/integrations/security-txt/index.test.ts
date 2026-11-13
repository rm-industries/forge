import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { security as configuredSecurity } from '../../config/security';
import securityTxt from './index';
import { securityTxtPath } from './render';

// Astro's Vite config supplies the runtime module in tests. Load the Node build API.
const { build } = createRequire(import.meta.url)('astro') as typeof import('astro');
let root: string;
const site = 'https://www.example.com/';
const security = {
  contacts: ['mailto:security@example.com'],
  expiration: { fixed: new Date(Date.now() + 86_400_000).toISOString() },
};

beforeEach(async () => {
  root = await mkdtemp(fileURLToPath(new URL('../../../node_modules/.security-txt-build-', import.meta.url)));
  const pages = join(root, 'src/pages');
  await mkdir(pages, { recursive: true });
  await writeFile(join(pages, 'index.astro'), '<h1>Example</h1>');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it('matches the project configuration when building', async () => {
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    site,
    integrations: configuredSecurity === undefined ? [] : [securityTxt(configuredSecurity)],
  });
  expect(existsSync(join(root, 'dist', securityTxtPath))).toBe(configuredSecurity !== undefined);
});

it('emits security.txt in a static build when configured', async () => {
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    site,
    integrations: [securityTxt(security)],
  });
  const body = await readFile(join(root, 'dist', securityTxtPath), 'utf8');
  expect(body).toContain('Contact: mailto:security@example.com\n');
  expect(body).toContain('Canonical: https://www.example.com/.well-known/security.txt\n');
});
