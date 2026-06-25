import { type useTranslations } from 'next-intl';

type TEnc = ReturnType<typeof useTranslations<'EncryptionPlayground'>>;

export function mapEncryptError(t: TEnc, code: string): string {
  switch (code) {
    case 'emptyKey':
      return t('errors.emptyKey');
    case 'oddHex':
    case 'invalidHex':
    case 'badKeyMaterial':
      return t('errors.badKeyMaterial');
    case 'wrongKeyLength':
      return t('errors.wrongKeyLength');
    case 'emptyPassphrase':
      return t('errors.emptyPassphrase');
    default:
      return t('errors.encryptFailed');
  }
}

export function mapDecryptError(t: TEnc, code: string): string {
  switch (code) {
    case 'invalidJson':
      return t('errors.invalidJson');
    case 'invalidBundle':
    case 'unsupportedVersion':
    case 'badBits':
    case 'badKdf':
    case 'missingFields':
    case 'badPbkdf2':
      return t('errors.invalidBundle');
    case 'emptyKey':
      return t('errors.emptyKey');
    case 'oddHex':
    case 'invalidHex':
    case 'badKeyMaterial':
      return t('errors.badKeyMaterial');
    case 'wrongKeyLength':
      return t('errors.wrongKeyLength');
    case 'emptyPassphrase':
      return t('errors.emptyPassphrase');
    case 'decryptFailed':
      return t('errors.decryptFailed');
    default:
      return t('errors.decryptFailed');
  }
}
