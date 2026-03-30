import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['en', 'es', 'ar', 'ca', 'zh', 'cs', 'el', 'de', 'da', 'af'] as const;
type AppLocale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const locale: AppLocale = locales.includes(raw as AppLocale)
    ? (raw as AppLocale)
    : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
