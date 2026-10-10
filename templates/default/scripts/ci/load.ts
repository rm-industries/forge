import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CiPinResolver } from '@zuke/core';

import { createCiPinResolver } from './pins.ts';
import type { SiteCiConfig } from './site.ts';

export function loadConfig(projectRoot: string): SiteCiConfig {
  const config = JSON.parse(readFileSync(join(projectRoot, 'scripts/ci/config.json'), 'utf8'));
  if (
    !config ||
    typeof config.directory !== 'string' ||
    typeof config.repositoryRoot !== 'string' ||
    !Array.isArray(config.providers) ||
    config.providers.length === 0 ||
    config.providers.some((provider: unknown) => provider !== 'github' && provider !== 'gitlab') ||
    new Set(config.providers).size !== config.providers.length ||
    (config.primary !== undefined && !config.providers.includes(config.primary)) ||
    (config.prefix !== undefined &&
      (typeof config.prefix !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.prefix) ||
        config.prefix.length > 80)) ||
    ![config.securityMinute, config.automationMinute].every(
      (minute) => Number.isInteger(minute) && minute >= 1 && minute <= 59,
    )
  ) {
    throw new TypeError('Invalid CI configuration in scripts/ci/config.json');
  }
  return config;
}

export function loadPins(projectRoot: string, repositoryRoot: string, prefix?: string): CiPinResolver {
  const defaults = JSON.parse(readFileSync(join(projectRoot, 'scripts/ci/pins.json'), 'utf8')) as Record<
    string,
    { ref: string; version?: string }
  >;
  const workflows: Record<string, string> = {};
  for (const name of ['project', 'security', 'automation', 'deployment']) {
    const path = join(repositoryRoot, '.github/workflows', `${prefix ? `${prefix}-` : ''}${name}.yml`);
    if (existsSync(path)) workflows[path] = readFileSync(path, 'utf8');
  }
  const resolve = createCiPinResolver(workflows);
  return (action) => {
    try {
      return resolve(action);
    } catch (error) {
      if (!(error instanceof TypeError) || error.message !== `Missing action pin: ${action}`) throw error;
      const pin = defaults[action];
      if (!pin || !new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@[a-f0-9]{40}$`).test(pin.ref)) {
        throw new TypeError(`Missing or invalid default action pin: ${action}`);
      }
      return { ...pin };
    }
  };
}
