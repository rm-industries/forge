import assert from 'node:assert/strict';
import test from 'node:test';

import { cmsBranding, defineSiteConfig, site, type SiteConfig } from './site.ts';

const validConfig = {
  name: 'Example site',
  description: 'An example site description.',
  url: 'https://example.test',
  language: 'en',
  navigation: [{ label: 'Home', href: '/' }],
  socialLinks: [],
} satisfies SiteConfig;

test('normalizes and freezes valid configuration', () => {
  const config = defineSiteConfig(validConfig);

  assert.equal(config.url, 'https://example.test/');
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.navigation), true);
});

test('rejects an empty site name', () => {
  assert.throws(() => defineSiteConfig({ ...validConfig, name: '  ' }), /name must not be empty/);
});

test('rejects a non-HTTP canonical URL', () => {
  assert.throws(
    () => defineSiteConfig({ ...validConfig, url: 'file:///example' }),
    /url must use the HTTP or HTTPS protocol/,
  );
});

test('derives CMS branding from the site name', () => {
  assert.equal(cmsBranding.appTitle, `${site.name} Content Manager`);
});
