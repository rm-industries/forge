import { expect, test } from 'vitest';

import { cmsBranding, defineSiteConfig, site, type SiteConfig } from './site.ts';

const validConfig = {
  name: 'Example site',
  description: 'An example site description.',
  author: 'Example Author',
  repository: 'example/site',
  language: 'en',
  socialImage: '/social-card.svg',
  navigation: [{ label: 'Home', href: '/' }],
  socialLinks: [],
} satisfies SiteConfig;

test('freezes valid editorial configuration', () => {
  const config = defineSiteConfig(validConfig);

  expect(Object.isFrozen(config)).toBe(true);
  expect(Object.isFrozen(config.navigation)).toBe(true);
});

test('rejects an empty site name', () => {
  expect(() => defineSiteConfig({ ...validConfig, name: '  ' })).toThrow(/name must not be empty/);
});

test('rejects control characters in optional text and invalid links', () => {
  expect(() => defineSiteConfig({ ...validConfig, author: 'Example\u0000Author' })).toThrow(/control characters/);
  expect(() => defineSiteConfig({ ...validConfig, navigation: [{ label: ' ', href: '/' }] })).toThrow(
    /navigation\[0\]\.label must not be empty/,
  );
});

test('derives CMS branding from the site name', () => {
  expect(cmsBranding.appTitle).toBe(`${site.name} Content Manager`);
});

test('preserves an Astro-imported social image instead of treating it as an authored path', () => {
  const image = { src: '/articles/_astro/social-card.hash.svg' };
  expect(defineSiteConfig({ ...validConfig, socialImage: image }).socialImage).toBe(image);
});
