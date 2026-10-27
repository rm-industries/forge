export const resolveConfiguredSite = (siteDefinition: unknown, baseDefinition: unknown): URL => {
  try {
    if (typeof siteDefinition !== 'string' || typeof baseDefinition !== 'string') {
      throw new TypeError('Resolved definitions must be JSON strings.');
    }
    const site: unknown = JSON.parse(siteDefinition);
    const base: unknown = JSON.parse(baseDefinition);
    if (
      typeof site !== 'string' ||
      !site ||
      typeof base !== 'string' ||
      !base.startsWith('/') ||
      base.startsWith('//')
    ) {
      throw new TypeError('Resolved settings must contain a site URL and root-relative base.');
    }
    return new URL(base.endsWith('/') ? base : `${base}/`, site);
  } catch (cause) {
    throw new Error('Browser tests require Astro to provide SITE and BASE_URL.', { cause });
  }
};

export const createPreviewTarget = (site: URL, portInput = '4321') => {
  const port = Number(portInput);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || String(port) !== portInput) {
    throw new Error('PLAYWRIGHT_PORT must be an integer between 1 and 65535.');
  }
  const origin = new URL(`http://127.0.0.1:${port}`).origin;
  const base = new URL(site.pathname, origin);
  const resolveUrl = (path: string) => new URL(path.replace(/^\//u, ''), base).href;

  return {
    origin,
    port,
    resolveUrl,
    resolvePath: (path: string) => resolveUrl(path).slice(origin.length),
  };
};
