import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['en', 'fr', 'es', 'ar', 'ca', 'zh', 'cs', 'el', 'de', 'da', 'af', 'id', 'fa', 'ru', 'it', 'ja', 'ko', 'ms', 'nb', 'nl', 'sv', 'pl', 'tr', 'pt', 'pt-BR', 'vi', 'uk'] as const;
type AppLocale = (typeof locales)[number];

// Static export (Tauri desktop) has no request cookies; locale is fixed at build time.
const isTauriBuild = process.env.TAURI_BUILD === '1';

export default getRequestConfig(async () => {
  let raw = 'en';
  if (!isTauriBuild) {
    const cookieStore = await cookies();
    raw = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  }
  const locale: AppLocale = locales.includes(raw as AppLocale)
    ? (raw as AppLocale)
    : 'en';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
