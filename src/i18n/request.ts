import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['en', 'fr', 'es', 'ar', 'ca', 'zh', 'cs', 'el', 'de', 'da', 'af', 'id', 'fa', 'ru', 'it', 'ja', 'ko', 'ms', 'nb', 'nl', 'sv', 'pl', 'tr', 'pt'] as const;
type AppLocale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const locale: AppLocale = locales.includes(raw as AppLocale)
    ? (raw as AppLocale)
    : 'en';
  const messagesLocale = locale === 'nb' || locale === 'nl' || locale === 'ru' || locale === 'sv' || locale === 'pt' ? 'en' : locale;

  return {
    locale,
    messages: (await import(`../../messages/${messagesLocale}.json`)).default
  };
});
