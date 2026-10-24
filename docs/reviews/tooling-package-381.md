<!-- cspell:ignore Volq -->

# Representative package orchestration experiment (#381)

Evaluation only; no production scripts, dependencies, generated projects, or CI are changed.
The representative is `@rm-industries/content-model`: three public ESM entry points,
32 source tests, emitted declarations, optional Astro/CMS peers, and a real package boundary.
This exercises more than a single bundle without requiring the unavailable Rust toolchain.

## Environment and comparison contract

Both runs use revision `595a5e00d7e2fea04b26b54c7fb6bb7b6396f4e9`, macOS arm64,
Node 26.9.0, npm 11.19.1, the same checked-in npm lockfile, and `npm ci --ignore-scripts`.
Candidate binary: exact `vite-plus@1.4.0`, installed only under `/tmp/forge-368/candidate`.
The existing tools remain TypeScript 7.0.2, Vitest 5.0.5 and tsdown 0.23.1.
Using `vp run` does not test replacements from the candidate's bundled tools.
No package-manager conversion, global installation, remote cache, credentials, or publication.

Temporary `vite.config.ts` below was created in an isolated working copy and removed afterward.
It exports a plain config object, avoiding a production import/dependency on `vite-plus`.
All tasks explicitly disable caching; cache and invalidation correctness belong to #383.
These runs prove command equivalence and scheduling, not safe reuse of cached results.

## Public commands and task graph

The existing baseline is:

```sh
npm run typecheck --workspace @rm-industries/content-model
npm test --workspace @rm-industries/content-model
npm run build --workspace @rm-industries/content-model
npm pack --ignore-scripts --workspace @rm-industries/content-model \
  --pack-destination /tmp/forge-368/package-baseline
```

Candidate commands from the repository root are:

```sh
/tmp/forge-368/candidate/node_modules/.bin/vp run poc:pack
/tmp/forge-368/candidate/node_modules/.bin/vp run poc:root
/tmp/forge-368/candidate/node_modules/.bin/vp run poc:consumer
```

Package source typechecking and tests run concurrently, then build, then packing, then
installed consumer checks. Only build owns `packages/content-model/dist`; only pack owns the
scratch tarball. Nothing else writes those outputs. `--ignore-scripts` avoids repeating the
existing `prepack` typecheck/test/build chain, because the task dependencies already enforce it.
It is appropriate only behind that explicit gate; ordinary contributor `npm pack` is unchanged.

Root format, code lint, Markdown lint, spelling, documentation validation and root typechecking
each execute once, followed by the existing 49 root contract tests. Package tasks do not repeat
repository-wide scans. Root `typecheck:root` also checks its existing integration configuration;
it is not a replacement for the separate package source typecheck.

```ts
export default {
  run: {
    cache: false,
    tasks: {
      'poc:type': { command: 'npm run typecheck --workspace @rm-industries/content-model', cache: false },
      'poc:test': { command: 'npm test --workspace @rm-industries/content-model', cache: false },
      'poc:build': {
        command: 'npm run build --workspace @rm-industries/content-model',
        dependsOn: ['poc:type', 'poc:test'],
        cache: false,
      },
      'poc:pack': {
        command:
          'npm pack --ignore-scripts --workspace @rm-industries/content-model --pack-destination /tmp/forge-368/package-candidate',
        dependsOn: ['poc:build'],
        cache: false,
      },
      'poc:format': { command: 'npm run format', cache: false },
      'poc:code': { command: 'npm run lint:code', cache: false },
      'poc:markdown': { command: 'npm run lint:markdown', cache: false },
      'poc:spelling': { command: 'npm run spellcheck', cache: false },
      'poc:documentation': { command: 'npm run docs:validate', cache: false },
      'poc:root-type': { command: 'npm run typecheck:root', cache: false },
      'poc:consumer': {
        command: [
          'npm install --ignore-scripts --no-audit --no-fund --cache /tmp/forge-368/npm-cache --prefix /tmp/forge-368/consumer-candidate',
          'node /tmp/forge-368/consumer-candidate/consumer.mjs',
          'TSC="$PWD/node_modules/.bin/tsc"; cd /tmp/forge-368/consumer-candidate && "$TSC" --noEmit --module NodeNext --moduleResolution NodeNext --target es2023 --skipLibCheck consumer.ts',
        ],
        dependsOn: ['poc:pack'],
        cache: false,
      },
      'poc:root': {
        command: 'npm run test:contracts',
        dependsOn: ['poc:format', 'poc:code', 'poc:markdown', 'poc:spelling', 'poc:documentation', 'poc:root-type'],
        cache: false,
      },
    },
  },
};
```

Default candidate concurrency is four. The successful package log showed typechecking and source
tests start before build, and pack start only after build completed. Consumer execution finished
with `7/7 successful`; root finished with `7/7 successful` (compound commands may expand into
multiple runner tasks). Root checks cover the existing configuration and inputs, rather than
candidate-native formatter/linter defaults.

## Observed execution

| Run                                                    | Seconds | Exit |
| ------------------------------------------------------ | ------: | ---: |
| npm typecheck + test + build + pack                    |   1.975 |    0 |
| Candidate same graph, first measured run               |   1.701 |    0 |
| Candidate same graph, unchanged repeat                 |   1.693 |    0 |
| Candidate initial root graph, before adding root types |   3.320 |    0 |
| Candidate injected build failure                       |   1.289 |    1 |

These are exploratory wall times on one machine, after dependency installation and initial
execution, not independent cold-cache samples. The candidate repeat executed commands again;
there were no cache hits. The small difference is consistent with parallel package checks,
not evidence of a meaningful maintenance or performance advantage. No broad benchmark claim.

### Real prerequisite failure

Temporarily prepending `throw new Error('FORGE_381_EXPECTED_BUILD_FAILURE');` to the real
`packages/content-model/tsdown.config.ts` made tsdown fail. Source types and all 32 tests still
passed, proving that the build prerequisite itself failed. The process returned exit 1,
reported the marker and npm build failure, never printed the pack command, and produced no
tarball after the previous archive was removed. Runner summary: `2/3 successful`.

The config was restored in a `finally` block, and the original graph subsequently passed again.
No permanent failing tests, artificial build implementation, or altered production config remain.
This proves failure propagation despite stale `dist` files remaining available.

## Artifact equivalence

Both pack operations produced 15 files, approximately 20.7 kB packed and 88.4 kB unpacked.
Every unpacked file is byte-identical: emitted JavaScript, source maps, declarations, package
metadata, README and license. This comparison includes all three export mappings and their
referenced files. No executable entry point or native asset exists in this representative package.
Tar metadata and gzip bytes are not used as the equivalence contract.

Common SHA-256 manifest for baseline and candidate:

| Published path                    | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `LICENSE`                         | `59cc4ec7623f0c492198043fbfe63c1624032d83c2e83332b1ad151f331dde16` |
| `README.md`                       | `58eab52f2f6ba295eea12cda182664b3807a34d6ce81263b6447c481c05be5d6` |
| `dist/astro.d.ts`                 | `7a80f2d14fa875ffcf4f47f49e3a04d73e682cb3056023e1b9dbe7d531bd4cfd` |
| `dist/astro.js`                   | `9221d016e754d73de42b09325cd1cbe61b354025f3fb61e09979a4e23bd6e3e3` |
| `dist/astro.js.map`               | `3fae04613401862c1d91c2b5ea73d5dce8ab32045baf227c204b2b788124a690` |
| `dist/index.d.ts`                 | `b3eb15ad75b485ea54b383c0397e88398c46586593bcfd7f9c0d5812ae115120` |
| `dist/index.js`                   | `1fd527efc115728684e66c7f0f80c1dc410e8fc39930f871971abbe0dcffa176` |
| `dist/index.js.map`               | `724fd7ab9bd1c018d4e77e2b205095f9e8b645fcfee00ca73b3360da6776f3b4` |
| `dist/sveltia.d.ts`               | `cba7c07b62cd0980ea9a536e26bc0d3a38ebf7ff3b0a1b7584e8709aac648c44` |
| `dist/sveltia.js`                 | `d69f01296289b4be1f2ea2bbf8140761b39ac15f33ad46593e5e857ae549650c` |
| `dist/sveltia.js.map`             | `f63b4473a8108002be56033b9280b0300b45da06f7d6a77ed8be37289de2d94b` |
| `dist/types-CHBlVolq.d.ts`        | `e3d90c9308eb8ab6de3dce80f417884811ee723174c38bb48706475dd9a3342e` |
| `dist/validation-Br9rmRv1.js`     | `6e123a31c30ef4f52eb41a94d15e5c9bc4f88973afb91a82f229132459433805` |
| `dist/validation-Br9rmRv1.js.map` | `e11000ef969beb58892e1c355e3d90361c409a6477e73b4359da97d46d9f052e` |
| `package.json`                    | `0d770301c4c3717efca3e522fa507fd6191074e801d1a3b2b868bfd75a364a6f` |

To reproduce comparison, inspect each tar archive with Python `tarfile`, read every regular
file, hash its contents with SHA-256, and assert the two path-to-hash dictionaries are equal.
The baseline and candidate archives were produced independently by the commands above.

## Installed consumer boundary

Two separate directories outside the repository each installed its respective tarball and exact
`astro@7.3.8` using npm, with scripts disabled. Neither directory is a workspace, and the package
is physically installed from the archive rather than linked to source. Optional CMS peer remains
absent, matching the package's optional peer contract. Existing root TypeScript invokes the
consumer compilation, but package and peer resolution is from the isolated consumer directory.
`--skipLibCheck` excludes third-party declaration internals; all three public import paths and
the consumer's typed usage are checked.

Each consumer `package.json` contains `private: true`, `type: module`, and these dependencies:

```json
{
  "@rm-industries/content-model": "file:/tmp/forge-368/package-candidate/rm-industries-content-model-1.1.9.tgz",
  "astro": "7.3.8"
}
```

Use `package-baseline` in the baseline consumer instead. Both consumers were freshly installed
before checks; the candidate task subsequently re-ran install against the identical archive.

```js
import assert from 'node:assert/strict';

import { defineModel, validateContentModel } from '@rm-industries/content-model';
import { createAstroSchema } from '@rm-industries/content-model/astro';
import { createSveltiaCollection } from '@rm-industries/content-model/sveltia';
const model = defineModel({
  name: 'articles',
  label: 'Articles',
  labelSingular: 'Article',
  slug: '{{slug}}',
  folder: 'src/content/articles',
  fields: { title: { kind: 'string', required: true, label: 'Title' } },
});
validateContentModel(model);
const cms = createSveltiaCollection(model);
assert.equal(cms.name, 'articles');
assert.equal(cms.fields[0].name, 'title');
const schema = createAstroSchema(model, {
  image: () => {
    throw new Error('unused image helper');
  },
});
assert.equal(schema.parse({ title: 'Consumer title' }).title, 'Consumer title');
assert.equal(schema.safeParse({}).success, false);
console.log(JSON.stringify({ name: cms.name, fields: cms.fields, parsed: schema.parse({ title: 'Consumer title' }) }));
```

```ts
import { defineModel, type ContentCollectionModel } from '@rm-industries/content-model';
import { createAstroSchema, type AstroModelData } from '@rm-industries/content-model/astro';
import { createSveltiaCollection } from '@rm-industries/content-model/sveltia';
const model = defineModel({
  name: 'articles',
  label: 'Articles',
  labelSingular: 'Article',
  slug: '{{slug}}',
  folder: 'src/content/articles',
  fields: { title: { kind: 'string', required: true, label: 'Title' } },
});
const declaration: ContentCollectionModel = model;
const data: AstroModelData<typeof model> = { title: 'Consumer title' };
createSveltiaCollection(declaration);
void createAstroSchema;
void data;
```

Commands inside each isolated consumer:

```sh
npm install --ignore-scripts --no-audit --no-fund --cache /tmp/forge-368/npm-cache
node consumer.mjs
/path/to/forge/node_modules/.bin/tsc --noEmit --module NodeNext \
  --moduleResolution NodeNext --target es2023 --skipLibCheck consumer.ts
```

Both runtime and declaration checks exited 0 for both artifacts. Runtime output was identical:

```json
{
  "name": "articles",
  "fields": [{ "name": "title", "label": "Title", "required": true }],
  "parsed": { "title": "Consumer title" }
}
```

The first consumer fixture intentionally failed at the public boundary because it omitted the
model's required `labelSingular` and `slug`; adding those real contract fields made it pass.
This was fixture correction, not a production behavior change.

## Maintenance result and limits

The candidate can schedule existing npm commands and correctly prevent packing after build
failure. It does not remove TypeScript, Vitest, tsdown, npm packing, optional peer management,
or consumer verification. This prototype adds a task graph alongside existing scripts; adopting
it unchanged would increase configuration ownership. The existing `prepack` chain still needs
an intentional migration decision to avoid duplicate gates. Faster focused execution alone is
insufficient to justify that added responsibility.

No inference about other packages, native output equivalence, Windows/Linux runtimes, hosted CI,
remote cache security, or invalidation follows from this package result. The website/template
installation boundary is evaluated separately in #382; cache correctness in #383.
The experiment demonstrates capability, not adoption or production readiness.
