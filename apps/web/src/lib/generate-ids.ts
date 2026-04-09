import { v1, v3, v4, v5, v6, v7, validate } from 'uuid';
import { createUlid } from '@/lib/ulid';

export type IdKind = 'ulid' | 'uuid1' | 'uuid3' | 'uuid4' | 'uuid5' | 'uuid6' | 'uuid7';

export type NamespacePreset = 'DNS' | 'URL' | 'custom';

const MAX_BULK = 10_000;

export function resolveNamespace(preset: NamespacePreset, custom: string): string {
  if (preset === 'DNS') return v5.DNS;
  if (preset === 'URL') return v5.URL;
  const trimmed = custom.trim();
  if (!validate(trimmed)) {
    throw new Error('Custom namespace must be a valid UUID.');
  }
  return trimmed;
}

export interface GenerateIdsOptions {
  kind: IdKind;
  count: number;
  /** v3 / v5 only */
  name: string;
  namespacePreset: NamespacePreset;
  customNamespace: string;
}

export function generateIds(options: GenerateIdsOptions): string[] {
  const count = Math.min(Math.max(1, Math.floor(options.count)), MAX_BULK);
  const { kind, name, namespacePreset, customNamespace } = options;
  const lines: string[] = [];

  if (kind === 'uuid3' || kind === 'uuid5') {
    const ns = resolveNamespace(namespacePreset, customNamespace);
    const base = name.trim();
    if (!base) {
      throw new Error('Name is required for UUID v3 and v5.');
    }
    for (let i = 0; i < count; i++) {
      const input = count === 1 ? base : `${base}#${i}`;
      lines.push(kind === 'uuid3' ? v3(input, ns) : v5(input, ns));
    }
    return lines;
  }

  for (let i = 0; i < count; i++) {
    switch (kind) {
      case 'ulid':
        lines.push(createUlid());
        break;
      case 'uuid1':
        lines.push(v1());
        break;
      case 'uuid4':
        lines.push(v4());
        break;
      case 'uuid6':
        lines.push(v6());
        break;
      case 'uuid7':
        lines.push(v7());
        break;
    }
  }
  return lines;
}

export { MAX_BULK };
