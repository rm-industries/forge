import assert from 'node:assert/strict';
import test from 'node:test';

import { flavors } from '@catppuccin/palette';
import type { FlavorName } from '@catppuccin/palette';

import { darkTheme, darkThemeColor, getCatppuccinDaisyOptions, lightTheme, lightThemeColor } from './site-theme.ts';

test('derives browser colors from the configured Catppuccin flavors', () => {
  assert.equal(lightThemeColor, flavors[lightTheme].colors.base.hex);
  assert.equal(darkThemeColor, flavors[darkTheme].colors.base.hex);
});

test('marks exactly one light default and one preferred dark theme', () => {
  const flavorNames = Object.keys(flavors) as FlavorName[];
  const defaults = flavorNames.filter((flavor) => getCatppuccinDaisyOptions(flavor).default);
  const preferredDark = flavorNames.filter((flavor) => getCatppuccinDaisyOptions(flavor).prefersdark);

  assert.deepEqual(defaults, [lightTheme]);
  assert.deepEqual(preferredDark, [darkTheme]);
});
