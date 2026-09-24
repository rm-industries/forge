import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, test } from 'vitest';

const readPublicAsset = (name: string) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
const pathData = (svg: string) => Array.from(svg.matchAll(/<path[^>]+d="([^"]+)"/gu), ([, path]) => path);

describe('Forge brand assets', () => {
  let logo: string;
  let favicon: string;
  let socialCard: string;

  beforeAll(async () => {
    [logo, favicon, socialCard] = await Promise.all([
      readFile(new URL('../../docs/assets/forge-logo.svg', import.meta.url), 'utf8'),
      readPublicAsset('favicon.svg'),
      readPublicAsset('social-card.svg'),
    ]);
  });

  test('keeps the logo and favicon transparent, scalable, and geometrically aligned', () => {
    expect(logo).toContain('viewBox="0 0 160 160"');
    expect(favicon).toContain('viewBox="0 0 160 160"');
    expect(logo).not.toContain('<rect');
    expect(favicon).not.toContain('<rect');
    expect(pathData(favicon)).toEqual(pathData(logo));

    for (const color of ['#4c4f69', '#cdd6f4', '#cba6f7']) {
      expect(logo).toContain(color);
      expect(favicon).toContain(color);
    }
  });

  test('uses the Forge mark, pipeline motif, typography, and Mocha palette on the social card', () => {
    expect(socialCard).toContain('viewBox="0 0 1200 630"');
    expect(socialCard).toContain('<title id="title">Forge</title>');
    expect(socialCard).toContain('<desc id="description">Forge content pipeline by RM Industries</desc>');
    expect(socialCard).toContain('font-family="\'Fira Sans\', system-ui, sans-serif"');
    expect(socialCard).toContain('font-family="\'Fira Code\', ui-monospace, monospace"');
    expect(pathData(socialCard)).toEqual(pathData(logo));

    for (const color of ['#1e1e2e', '#11111b', '#cdd6f4', '#cba6f7']) {
      expect(socialCard).toContain(color);
    }

    for (const stage of ['01 / DEFINE', '02 / GENERATE', '03 / OWN']) {
      expect(socialCard).toContain(stage);
    }
  });
});
