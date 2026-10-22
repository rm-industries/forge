import { expect, test, vi } from 'vitest';

vi.mock('@sveltia/cms', () => ({
  registerPreviewTemplate: vi.fn<(name: string, render: unknown) => void>(),
}));

import { previewCollectionNames } from './preview-collections.ts';
import { registerSveltiaPreviews } from './previews.ts';

test('registers configured previews and renders their rich content', () => {
  const register = vi.fn<NonNullable<Parameters<typeof registerSveltiaPreviews>[0]>>();
  registerSveltiaPreviews(register);

  expect(register.mock.calls.map(([name]) => name)).toEqual(previewCollectionNames);
  const [name, render] = register.mock.calls[0] ?? [];
  const add = vi.fn<(first: string, second: string) => void>();
  const widgetFor = vi.fn<(name: string) => string>(() => 'rendered body');
  const result = render({ document: { body: { classList: { add } } }, widgetFor } as never);

  expect(name).toBe(previewCollectionNames[0]);
  expect(widgetFor).toHaveBeenCalledWith('body');
  expect(result).toBe('rendered body');
});
