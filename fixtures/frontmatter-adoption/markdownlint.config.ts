import rule, { frontmatterOrderFromModel } from '@rm-industries/markdownlint-frontmatter';

import markdownRules from './.markdownlint-rules.json' with { type: 'json' };
import { contentModels } from './src/config/content-models/registry.ts';

export default {
  gitignore: '.gitignore',
  customRules: [rule],
  config: { ...markdownRules, 'forge/frontmatter-order': false },
  overrides: contentModels.map((model) => ({
    filter: [`${model.folder}/**/*.md`],
    config: { 'forge/frontmatter-order': frontmatterOrderFromModel(model) },
    combine: 'merge',
  })),
};
