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
  const en = (await import(`../../messages/en.json`)).default;
  const messages =
    locale === 'en'
      ? en
      // Fall back to English for any key missing in the active locale, so a new
      // string added to en.json renders in English everywhere until translated —
      // instead of showing the raw key path in 26 locales.
      : deepMerge(en, (await import(`../../messages/${locale}.json`)).default);
  return { locale, messages };
});

// Deep-merges translation objects: `override` (locale) wins over `base` (en);
// missing keys inherit from base. Both are trusted, static JSON.
type Messages = { [k: string]: string | Messages };
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    out[key] =
      b && o && typeof b === 'object' && typeof o === 'object'
        ? deepMerge(b, o)
        : o;
  }
  return out;
}
