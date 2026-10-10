import { generateCi, type CiPipeline } from 'jsr:@zuke/core@1.70.1';
import { parseDocument } from 'yaml';

Deno.test('Zuke preserves self-repository action references', () => {
  const reference = '$/.github/actions/setup-project';
  const pipeline = {
    bootstrap: false,
    jobs: [{ id: 'test', steps: [{ uses: reference }] }],
  } satisfies CiPipeline;
  const document = parseDocument(generateCi(pipeline, 'github'));
  if (document.errors.length > 0) throw document.errors[0];
  if (document.getIn(['jobs', 'test', 'steps', 0, 'uses']) !== reference) {
    throw new Error('Zuke changed the self-repository reference');
  }
});
