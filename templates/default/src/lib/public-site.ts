export function normalizePublicSite(value: string): URL {
  let publicSite: URL;
  try {
    publicSite = new URL(value);
  } catch {
    throw new Error('The public site URL must be an absolute URL.');
  }
  if (
    !['http:', 'https:'].includes(publicSite.protocol) ||
    publicSite.username ||
    publicSite.password ||
    publicSite.href.includes('?') ||
    publicSite.href.includes('#')
  ) {
    throw new Error('The public site URL must use HTTP or HTTPS without credentials, a query, or a fragment.');
  }

  publicSite.pathname = `${publicSite.pathname.replace(/\/+$/, '')}/`;
  return publicSite;
}
