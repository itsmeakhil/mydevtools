import { type GenerateIdsErrorKey } from '@/lib/generate-ids';

export function errorKeyFromGenerateIdsErrorKey(key: GenerateIdsErrorKey): string {
  switch (key) {
    case 'invalidCustomNamespace':
      return 'errors.invalidCustomNamespace';
    case 'missingName':
      return 'errors.missingName';
    default:
      return 'errors.unknown';
  }
}
