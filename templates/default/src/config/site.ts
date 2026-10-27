import type { ImageMetadata } from 'astro';

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  description: string;
  author: string;
  repository: string;
  language: string;
  socialImage: string | Pick<ImageMetadata, 'src'>;
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

const validateOptionalText = (value: string, field: string): string => {
  const normalizedValue = value.trim();
  if (/\p{Cc}/u.test(normalizedValue)) throw new TypeError(`${field} must not contain control characters.`);
  return normalizedValue;
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
    author: validateOptionalText(config.author, 'author'),
    repository: validateOptionalText(config.repository, 'repository'),
    language: requireText(config.language, 'language'),
    socialImage:
      typeof config.socialImage === 'string' ? requireText(config.socialImage, 'socialImage') : config.socialImage,
    navigation: requireLinks(config.navigation, 'navigation'),
    socialLinks: requireLinks(config.socialLinks, 'socialLinks'),
  });

export const site = defineSiteConfig({
  name: 'Forge',
  description: 'A content-driven website created with Forge.',
  author: 'Site Author',
  repository: '',
  language: 'en',
  socialImage: '/social-card.svg',
  navigation: [
    { label: 'Home', href: '/' },
    { label: 'Articles', href: '/articles/' },
    { label: 'About', href: '/about/' },
  ],
  socialLinks: [],
});

export const cmsBranding = Object.freeze({
  appTitle: `${site.name} Content Manager`,
});
