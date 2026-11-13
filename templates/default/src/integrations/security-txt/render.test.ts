import { expect, test } from 'vitest';

import {
  renderSecurityTxt,
  validateFixedExpiration,
  validateRollingMonths,
  validateSecurityContacts,
  type SecurityConfig,
} from './render';

const site = 'https://www.example.com/';
const now = new Date('2028-01-01T00:00:00Z');
const config: SecurityConfig = {
  contacts: ['mailto:security@example.com', 'https://example.com/report'],
  expiration: { fixed: '2028-02-29T14:30:00+02:00' },
};

test('renders ordered contacts, a fixed RFC 3339 date and the canonical site URL', () => {
  expect(renderSecurityTxt(config, site, '/', now)).toBe(
    'Contact: mailto:security@example.com\n' +
      'Contact: https://example.com/report\n' +
      'Expires: 2028-02-29T14:30:00+02:00\n' +
      'Canonical: https://www.example.com/.well-known/security.txt\n',
  );
});

test.each([
  ['2027-08-31T18:30:00.123Z', '2028-02-29T18:30:00.123Z'],
  ['2028-08-31T18:30:00.123Z', '2029-02-28T18:30:00.123Z'],
  ['2028-09-01T18:30:00.123Z', '2029-03-01T18:30:00.123Z'],
])('rolls forward six UTC calendar months from %s', (buildTime, expiration) => {
  const rolling = { ...config, expiration: { months: 6 } };
  expect(renderSecurityTxt(rolling, site, '/', new Date(buildTime))).toContain(`Expires: ${expiration}\n`);
});

test.each([0, 13, 1.5])('rejects an invalid rolling duration (%s)', (months) => {
  expect(() => validateRollingMonths(months)).toThrow('calendar months');
});

test('renders the canonical override and all optional fields', () => {
  const body = renderSecurityTxt(
    {
      ...config,
      canonical: 'https://example.net/.well-known/security.txt',
      preferredLanguages: ['en', 'fr-CA'],
      acknowledgments: ['https://example.net/thanks'],
      encryption: ['https://example.net/key', 'dns:key.example.net'],
      hiring: ['https://example.net/jobs'],
      policy: ['https://example.net/policy'],
    },
    site,
    '/',
    now,
  );
  expect(body.split('\n').slice(3)).toEqual([
    'Canonical: https://example.net/.well-known/security.txt',
    'Preferred-Languages: en, fr-CA',
    'Acknowledgments: https://example.net/thanks',
    'Encryption: https://example.net/key',
    'Encryption: dns:key.example.net',
    'Hiring: https://example.net/jobs',
    'Policy: https://example.net/policy',
    '',
  ]);
});

test.each([
  { site, base: '/project/' },
  { site: 'https://www.example.com/project/', base: '/' },
])('rejects a subpath deployment ($site, $base)', ({ site, base }) => {
  expect(() => renderSecurityTxt(config, site, base, now)).toThrow('requires a root deployment');
});

test.each([undefined, 'http://example.com/', 'https://a@example.com/'])('rejects an unsuitable site (%s)', (url) => {
  expect(() => renderSecurityTxt(config, url, '/', now)).toThrow('requires an HTTPS site URL');
});

test.each([
  [{ ...config, canonical: 'http://example.com/security.txt' }, 'requires an HTTPS canonical URL'],
  [{ ...config, canonical: 'https://?query' }, 'requires an HTTPS canonical URL'],
  [{ ...config, canonical: 'https://example.com/security.txt#fragment' }, 'requires an HTTPS canonical URL'],
  [{ ...config, contacts: ['mailto:a@example.com\nExpires: x'] }, 'contacts must be absolute'],
  [{ ...config, contacts: ['dns:example.com'] }, 'contacts must be absolute'],
  [
    { ...config, expiration: { months: 6, fixed: '2028-07-01T00:00:00Z' } } as unknown as SecurityConfig,
    'requires either a fixed or a rolling expiration',
  ],
  [{ ...config, expiration: { fixed: '' } }, 'requires a fixed RFC 3339 expiration'],
  [
    { ...config, expiration: undefined as unknown as SecurityConfig['expiration'] },
    'requires a fixed RFC 3339 expiration',
  ],
  [{ ...config, expiration: { fixed: '2100-02-29T00:00:00Z' } }, 'valid RFC 3339 calendar date'],
  [{ ...config, expiration: { fixed: '2028-01-01T00:00:00Z' } }, 'must be in the future'],
  [{ ...config, preferredLanguages: [] }, 'Preferred-Languages'],
  [{ ...config, preferredLanguages: ['en_US'] }, 'Preferred-Languages'],
  [{ ...config, policy: [] }, 'Policy requires a non-empty list'],
  [{ ...config, policy: ['http://example.com/'] }, 'Policy requires a non-empty list'],
])('rejects invalid fields with a diagnostic (%j)', (invalid, message) => {
  expect(() => renderSecurityTxt(invalid, site, '/', now)).toThrow(message);
});

test('the CLI validators reject a missing contact or impossible calendar date before rendering', () => {
  expect(() => validateSecurityContacts([])).toThrow('requires at least one monitored contact');
  expect(() => validateFixedExpiration('2029-02-29T00:00:00Z', now)).toThrow('valid RFC 3339 calendar date');
});
