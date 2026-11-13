export interface SecurityConfig {
  contacts: readonly string[];
  expiration: { fixed: string; months?: never } | { months: number; fixed?: never };
  canonical?: string;
  preferredLanguages?: readonly string[];
  acknowledgments?: readonly string[];
  encryption?: readonly string[];
  hiring?: readonly string[];
  policy?: readonly string[];
}

export const securityTxtPath = '/.well-known/security.txt';

const uriPattern = /^[a-z][a-z0-9+.-]*:(?:[a-z0-9._~:/?#[\]@!$&'()*+,;=-]|%[a-f0-9]{2})+$/iu;
const httpsPattern = /^https:\/\/[^/]/iu;
const contactSchemePattern = /^(?:https:\/\/|mailto:|tel:)/iu;
const fixedTimestampPattern =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])t(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/iu;
const languageTagPattern = /^(?:[a-z]{2,8}(?:-[a-z0-9]{1,8})*|x(?:-[a-z0-9]{1,8})+|i-[a-z]{1,8})$/iu;

const validUri = (value: string) => {
  if (typeof value !== 'string' || !uriPattern.test(value) || !URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol === 'http:') return false;
  return url.protocol !== 'https:' || (httpsPattern.test(value) && !url.username && !url.password);
};

export function validateSecurityContacts(contacts: readonly string[]): void {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new TypeError('security.txt requires at least one monitored contact URI.');
  }
  for (const contact of contacts) {
    if (!validUri(contact) || !contactSchemePattern.test(contact)) {
      throw new TypeError('security.txt contacts must be absolute HTTPS, mailto, or tel URIs.');
    }
  }
}

export function validateFixedExpiration(fixed: string, now = new Date()): string {
  const timestamp = typeof fixed === 'string' ? fixedTimestampPattern.exec(fixed) : null;
  if (!timestamp) throw new TypeError('security.txt requires a fixed RFC 3339 expiration timestamp.');
  const [, year, month, day] = timestamp;
  const leapYear = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (Number(day) > daysInMonth[Number(month) - 1]!) {
    throw new TypeError('security.txt expiration must be a valid RFC 3339 calendar date.');
  }
  if (!(Date.parse(fixed) > now.getTime())) throw new TypeError('security.txt expiration must be in the future.');
  return fixed;
}

export function validateRollingMonths(months: number): number {
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    throw new TypeError('security.txt rolling expiration requires 1 to 12 whole calendar months.');
  }
  return months;
}

function rollingExpiration(months: number, now: Date): string {
  validateRollingMonths(months);
  const expires = new Date(now);
  expires.setUTCMonth(expires.getUTCMonth() + months + 1, 0);
  expires.setUTCDate(Math.min(now.getUTCDate(), expires.getUTCDate()));
  return expires.toISOString();
}

const uriFields = [
  ['acknowledgments', 'Acknowledgments'],
  ['encryption', 'Encryption'],
  ['hiring', 'Hiring'],
  ['policy', 'Policy'],
] as const;

export function renderSecurityTxt(
  config: SecurityConfig,
  site: string | undefined,
  base: string,
  now = new Date(),
): string {
  if (base !== '/' || (site && new URL(site).pathname !== '/')) {
    throw new TypeError('security.txt requires a root deployment.');
  }
  if (!site || !validUri(site) || !httpsPattern.test(site)) {
    throw new TypeError('security.txt requires an HTTPS site URL.');
  }

  const canonical = config.canonical ?? new URL(securityTxtPath, site).href;
  if (!validUri(canonical) || !httpsPattern.test(canonical) || new URL(canonical).hash) {
    throw new TypeError('security.txt requires an HTTPS canonical URL without a fragment.');
  }

  validateSecurityContacts(config.contacts);
  const { expiration } = config;
  if (expiration?.months !== undefined && expiration.fixed !== undefined) {
    throw new TypeError('security.txt requires either a fixed or a rolling expiration.');
  }
  const expires =
    expiration?.months === undefined
      ? validateFixedExpiration(expiration?.fixed, now)
      : rollingExpiration(expiration.months, now);
  const lines = [
    ...config.contacts.map((contact) => `Contact: ${contact}`),
    `Expires: ${expires}`,
    `Canonical: ${canonical}`,
  ];
  if (config.preferredLanguages !== undefined) {
    if (
      !Array.isArray(config.preferredLanguages) ||
      !config.preferredLanguages.length ||
      !config.preferredLanguages.every((language) => typeof language === 'string' && languageTagPattern.test(language))
    ) {
      throw new TypeError('security.txt Preferred-Languages requires a non-empty list of language tags.');
    }
    lines.push(`Preferred-Languages: ${config.preferredLanguages.join(', ')}`);
  }
  for (const [property, field] of uriFields) {
    const uris = config[property];
    if (uris === undefined) continue;
    if (!Array.isArray(uris) || !uris.length || !uris.every(validUri)) {
      throw new TypeError(
        `security.txt ${field} requires a non-empty list of absolute URIs using HTTPS for web links.`,
      );
    }
    lines.push(...uris.map((uri) => `${field}: ${uri}`));
  }
  return [...lines, ''].join('\n');
}
