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
          <Globe className="h-[1.2rem] w-[1.2rem] transition-all" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLanguage('en')} className={locale === 'en' ? 'font-bold' : ''}>
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('es')} className={locale === 'es' ? 'font-bold' : ''}>
          {t('spanish')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ca')} className={locale === 'ca' ? 'font-bold' : ''}>
          {t('catalan')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage('ar')} className={locale === 'ar' ? 'font-bold' : ''}>
          {t('arabic')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
