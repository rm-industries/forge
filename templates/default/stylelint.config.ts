import type { Config } from 'stylelint';

export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['apply', 'plugin', 'theme'],
      },
    ],
    'import-notation': [
      'string',
      {
        ignore: ['tailwindcss'],
      },
    ],
  },
} satisfies Config;
