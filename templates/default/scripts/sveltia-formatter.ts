import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBrowserOptions } from '@rm-industries/browser-oxfmt/build';
import type { AstroIntegration } from 'astro';

export function sveltiaFormatter(): AstroIntegration {
  const assets = fileURLToPath(new URL('.', import.meta.resolve('@rm-industries/browser-oxfmt')));
  let prefix: string;
  let policy: string;
  let files: Set<string>;

  return {
    name: 'sveltia-formatter',
    hooks: {
      'astro:config:setup': async ({ config, logger }) => {
        const result = await resolveBrowserOptions({
          cwd: fileURLToPath(config.root),
          filename: 'src/content/articles/article.md',
          requireUniformPolicy: true,
        });
        for (const diagnostic of result.diagnostics) logger.warn(diagnostic.message);
        policy = JSON.stringify(result.resolvedOptions);
        prefix = `${config.base.replace(/\/$/, '')}/admin/formatter/`;
        files = new Set(await readdir(assets, { recursive: true }));
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
          if (!pathname.startsWith(prefix)) return next();
          const name = pathname.slice(prefix.length);
          if (name !== 'policy.json' && !files.has(name)) return next();
          const types: Record<string, string> = {
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.wasm': 'application/wasm',
          };
          try {
            const content = name === 'policy.json' ? policy : await readFile(join(assets, name));
            response.setHeader('Content-Type', types[extname(name)] ?? 'application/octet-stream');
            response.end(content);
          } catch {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir }) => {
        const destination = new URL('admin/formatter/', dir);
        await mkdir(destination, { recursive: true });
        await cp(assets, destination, { recursive: true });
        await writeFile(new URL('policy.json', destination), policy);
      },
    },
  };
}
