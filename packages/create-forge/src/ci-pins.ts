import { isScalar, parseDocument, visit } from 'yaml';

/** Read immutable action references and their version comments from committed workflows. */
export function createCiPinResolver(workflows: Record<string, string>) {
  const pins = new Map<string, { ref: string; version?: string }>();
  for (const [path, content] of Object.entries(workflows)) {
    const document = parseDocument(content, { uniqueKeys: true });
    if (document.errors.length > 0) throw document.errors[0];
    visit(document, {
      Pair(_key, pair) {
        if (!isScalar(pair.key) || pair.key.value !== 'uses' || !isScalar(pair.value)) return;
        const ref = pair.value.value;
        if (typeof ref !== 'string') throw new TypeError(`Invalid action reference in ${path}`);
        if (ref.startsWith('./') || ref.startsWith('docker://')) return;
        const match = /^([^@\s]+)@([a-f0-9]{40})$/.exec(ref);
        if (!match) throw new TypeError(`Action must use a full commit SHA in ${path}: ${ref}`);
        const action = match[1]!;
        const version = pair.value.comment?.trim();
        const pin = version ? { ref, version } : { ref };
        const existing = pins.get(action);
        if (existing && (existing.ref !== ref || existing.version !== pin.version)) {
          throw new TypeError(`Conflicting pins for ${action} in ${path}; update all occurrences together`);
        }
        pins.set(action, pin);
      },
    });
  }
  return (action: string) => {
    const pin = pins.get(action);
    if (!pin) throw new TypeError(`Missing action pin: ${action}`);
    return { ...pin };
  };
}
