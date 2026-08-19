export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  language: string;
  navigation: readonly SiteLink[];
  socialLinks: readonly SiteLink[];
}

const requireText = (value: string, field: string): string => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new TypeError(`${field} must not be empty.`);
  }

  return normalizedValue;
};

const requireSiteUrl = (value: string): string => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new TypeError('url must be an absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('url must use the HTTP or HTTPS protocol.');
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError('url must not include credentials, a query, or a fragment.');
  }

  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;

  return url.href;
};

const requireLinks = (links: readonly SiteLink[], field: string): readonly SiteLink[] =>
  Object.freeze(
    links.map((link, index) => ({
      label: requireText(link.label, `${field}[${index}].label`),
      href: requireText(link.href, `${field}[${index}].href`),
    })),
  );

export const defineSiteConfig = (config: SiteConfig): Readonly<SiteConfig> =>
  Object.freeze({
    name: requireText(config.name, 'name'),
    description: requireText(config.description, 'description'),
    url: requireSiteUrl(config.url),
    language: requireText(config.language, 'language'),
    navigation: requireLinks(config.navigation, 'navigation'),
    socialLinks: requireLinks(config.socialLinks, 'socialLinks'),
  });

export const site = defineSiteConfig({
  name: 'Forge',
  description: 'A content-driven website created with Forge.',
  url: 'https://example.com',
  language: 'en',
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Features', href: '#features' },
    { label: 'Get started', href: '#start' },
  ],
  socialLinks: [],
});

export const cmsBranding = Object.freeze({
  appTitle: `${site.name} Content Manager`,
});
