'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const t = useTranslations('Settings');
  const locale = useLocale();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('language')}>
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLanguage('en')} className={locale === 'en' ? 'font-semibold text-primary' : ''}>
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('fr')} className={locale === 'fr' ? 'font-semibold text-primary' : ''}>
          {t('french')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('es')} className={locale === 'es' ? 'font-semibold text-primary' : ''}>
          {t('spanish')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('id')} className={locale === 'id' ? 'font-semibold text-primary' : ''}>
          {t('indonesian')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ca')} className={locale === 'ca' ? 'font-semibold text-primary' : ''}>
          {t('catalan')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ar')} className={locale === 'ar' ? 'font-semibold text-primary' : ''}>
          {t('arabic')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('zh')} className={locale === 'zh' ? 'font-semibold text-primary' : ''}>
          {t('chineseSimplified')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('cs')} className={locale === 'cs' ? 'font-semibold text-primary' : ''}>
          {t('czech')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('el')} className={locale === 'el' ? 'font-semibold text-primary' : ''}>
          {t('greek')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('de')} className={locale === 'de' ? 'font-semibold text-primary' : ''}>
          {t('german')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('da')} className={locale === 'da' ? 'font-semibold text-primary' : ''}>
          {t('danish')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('nb')} className={locale === 'nb' ? 'font-semibold text-primary' : ''}>
          {t('norwegian')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('nl')} className={locale === 'nl' ? 'font-semibold text-primary' : ''}>
          Nederlands
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('sv')} className={locale === 'sv' ? 'font-semibold text-primary' : ''}>
          Svenska
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('tr')} className={locale === 'tr' ? 'font-semibold text-primary' : ''}>
          Türkçe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('pt')} className={locale === 'pt' ? 'font-semibold text-primary' : ''}>
          Português
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('pt-BR')} className={locale === 'pt-BR' ? 'font-semibold text-primary' : ''}>
          Português (Brasil)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('af')} className={locale === 'af' ? 'font-semibold text-primary' : ''}>
          {t('afrikaans')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('fa')} className={locale === 'fa' ? 'font-semibold text-primary' : ''}>
          {t('persian')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ru')} className={locale === 'ru' ? 'font-semibold text-primary' : ''}>
          Русский
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('it')} className={locale === 'it' ? 'font-semibold text-primary' : ''}>
          Italiano
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ja')} className={locale === 'ja' ? 'font-semibold text-primary' : ''}>
          日本語
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ko')} className={locale === 'ko' ? 'font-semibold text-primary' : ''}>
          한국어
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ms')} className={locale === 'ms' ? 'font-semibold text-primary' : ''}>
          Bahasa Melayu
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('pl')} className={locale === 'pl' ? 'font-semibold text-primary' : ''}>
          Polski
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('vi')} className={locale === 'vi' ? 'font-semibold text-primary' : ''}>
          Tiếng Việt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('uk')} className={locale === 'uk' ? 'font-semibold text-primary' : ''}>
          Українська
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
