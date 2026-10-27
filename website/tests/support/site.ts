import { getViteConfig } from 'astro/config';

import { createPreviewTarget, resolveConfiguredSite } from './preview-url';

// Preview serves the production artifact, including configuration that branches on NODE_ENV.
process.env.NODE_ENV = 'production';
const { define } = await getViteConfig({})({ command: 'serve', mode: 'production' });

export const configuredSite = resolveConfiguredSite(
  define?.['import.meta.env.SITE'],
  define?.['import.meta.env.BASE_URL'],
);
export const {
  origin: previewOrigin,
  port: previewPort,
  resolvePath: resolvePreviewPath,
  resolveUrl: resolvePreviewUrl,
} = createPreviewTarget(configuredSite, process.env.PLAYWRIGHT_PORT);
