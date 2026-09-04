const normalizeBase = (base: string): string => {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;

  if (withLeadingSlash === '/') return withLeadingSlash;

  return withLeadingSlash.replace(/\/+$/, '');
};

/** Prefix a root-relative URL with Astro's deployment base path. */
export const resolveSiteHref = (href: string, base = import.meta.env.BASE_URL): string => {
  if (!href.startsWith('/') || href.startsWith('//')) return href;

  const normalizedBase = normalizeBase(base);
  if (normalizedBase === '/' || href === normalizedBase || href.startsWith(`${normalizedBase}/`)) return href;

  return `${normalizedBase}${href}`;
};

/** Resolve a runtime route against the canonical deployment URL. */
export const resolveCanonicalHref = (href: string, siteUrl: string, runtimeBase = import.meta.env.BASE_URL): string => {
  const canonicalUrl = new URL(siteUrl);
  const canonicalBase = normalizeBase(canonicalUrl.pathname);
  const normalizedRuntimeBase = normalizeBase(runtimeBase);
  const route =
    normalizedRuntimeBase !== '/' && (href === normalizedRuntimeBase || href.startsWith(`${normalizedRuntimeBase}/`))
      ? href.slice(normalizedRuntimeBase.length) || '/'
      : href;

  canonicalUrl.pathname = resolveSiteHref(route, canonicalBase);
  canonicalUrl.search = '';
  canonicalUrl.hash = '';

  return canonicalUrl.href;
};
