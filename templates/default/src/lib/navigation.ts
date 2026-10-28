/** Canonicalize local paths so active navigation is stable across URL variants. */
const normalizePath = (path: string) => {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (withLeadingSlash === '/') return withLeadingSlash;

  return withLeadingSlash.replace(/\/+$/, '');
};

export const isExternalHref = (href: string) => /^https?:\/\//u.test(href);

export const isCurrentPath = (currentPath: string, href: string, exact = false) => {
  if (!href.startsWith('/')) return false;

  const current = normalizePath(currentPath);
  const target = normalizePath(href);

  if (exact || target === '/') return current === target;

  return current === target || current.startsWith(`${target}/`);
};
