// cspell:words enochian mingo isdn isub subaddress

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

const uriPattern = /^[a-z][a-z0-9+.-]*:(?:[a-z0-9._~:/?#[\]@!$&'()*+,;=-]|%[a-f0-9]{2})+$/i;
const ipLiteralAuthority = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?\[[^\]]+\](?=[:/?#]|$)/i;
const httpsPattern = /^https:\/\/[^/]/i;
const contactSchemePattern = /^(?:https:\/\/|mailto:|tel:)/i;
const fixedTimestampPattern =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])t(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/i;
const languageTagPattern =
  /^(?:(?:[a-z]{2,3}(?:-[a-z]{3}){0,3}|[a-z]{4,8})(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?(?:-(?:[a-z0-9]{5,8}|\d[a-z0-9]{3}))*(?:-[0-9a-wyz](?:-[a-z0-9]{2,8})+)*(?:-x(?:-[a-z0-9]{1,8})+)?|x(?:-[a-z0-9]{1,8})+)$/i;
const grandfatheredTagPattern =
  /^(?:en-gb-oed|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)|sgn-(?:be-fr|be-nl|ch-de))$/i;

const mailAddressPattern = /^[a-z0-9.!$%'*+_~:@-]+@[a-z0-9.!$%'*+_~:-]+$/i;
const mailHeaderPattern = /^[a-z0-9._~%!$'()*+,;:@-]*=[a-z0-9._~%!$'()*+,;:@-]*$/i;

const validMailRecipients = (value: string) => value.split(',').every((address) => mailAddressPattern.test(address));

const validMailto = (value: string) => {
  const [recipients = '', ...query] = value.split('?');
  if (recipients && !validMailRecipients(recipients)) return false;
  if (!query.length) return Boolean(recipients);
  const headers = query.join('?').split('&');
  return (
    headers.every((header) => mailHeaderPattern.test(header)) &&
    (Boolean(recipients) ||
      headers.some((header) => header.toLowerCase().startsWith('to=') && validMailRecipients(header.slice(3))))
  );
};

const globalNumberPattern = /^\+[().\d-]*\d[().\d-]*$/;
const localNumberPattern = /^[().\da-f*#-]*[\da-f*#][().\da-f*#-]*$/i;
const phoneContextPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z](?:[a-z0-9-]*[a-z0-9])?\.?$/i;
const phoneParameterPattern = /^[a-z0-9-]+(?:=[a-z0-9._~%!$&'()*+/:[\]-]+)?$/i;
const extensionPattern = /^[().\d-]+$/;
const isdnSubaddressPattern = /^[a-z0-9._~%!$&'()*+,/:;=?@-]+$/i;

const validTel = (value: string) => {
  const [number = '', ...parameters] = value.split(';');
  const global = globalNumberPattern.test(number);
  const local = localNumberPattern.test(number);
  const names = new Set<string>();
  let hasContext = false;
  for (const parameter of parameters) {
    const [name = '', argument] = parameter.split('=', 2);
    const key = name.toLowerCase();
    if (names.has(key)) return false;
    names.add(key);
    if (key === 'phone-context') {
      if (!argument || !(globalNumberPattern.test(argument) || phoneContextPattern.test(argument))) return false;
      hasContext = true;
    } else if (key === 'ext') {
      if (!argument || !extensionPattern.test(argument)) return false;
    } else if (key === 'isub') {
      if (!isdnSubaddressPattern.test(parameter.slice(name.length + 1))) return false;
    } else if (!phoneParameterPattern.test(parameter)) {
      return false;
    }
  }
  return global ? !hasContext : local && hasContext;
};

const validUri = (value: string) => {
  if (typeof value !== 'string' || !uriPattern.test(value) || !URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol === 'http:') return false;
  if (url.protocol === 'tel:') return validTel(value.slice('tel:'.length));
  const withoutIpLiteral = value.replace(ipLiteralAuthority, '');
  if (/[[\]]/.test(withoutIpLiteral) || withoutIpLiteral.indexOf('#') !== withoutIpLiteral.lastIndexOf('#'))
    return false;
  if (url.protocol === 'mailto:') return validMailto(value.slice('mailto:'.length));
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
  if (!Number.isInteger(months) || months < 2 || months > 12) {
    throw new TypeError('security.txt rolling expiration requires 2 to 12 whole calendar months.');
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
  if (!validUri(canonical) || !httpsPattern.test(canonical) || canonical.includes('#')) {
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
      !config.preferredLanguages.every(
        (language) =>
          typeof language === 'string' && (languageTagPattern.test(language) || grandfatheredTagPattern.test(language)),
      )
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
