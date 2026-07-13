'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconPalette } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { BoxShadowTab } from './box-shadow-tab'
import { BorderRadiusTab } from './border-radius-tab'
import { ClampTab } from './clamp-tab'

export function CssGeneratorsLayout() {
  const t = useTranslations('CssGenerators')

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconPalette}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Media & Design']}
        />
      </RevealItem>

      <Tabs defaultValue="boxShadow" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="boxShadow">{t('tabs.boxShadow')}</TabsTrigger>
          <TabsTrigger value="borderRadius">{t('tabs.borderRadius')}</TabsTrigger>
          <TabsTrigger value="clamp">{t('tabs.clamp')}</TabsTrigger>
        </TabsList>
        <TabsContent value="boxShadow" className="min-h-0 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col">
          <BoxShadowTab />
        </TabsContent>
        <TabsContent value="borderRadius" className="min-h-0 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col">
          <BorderRadiusTab />
        </TabsContent>
        <TabsContent value="clamp" className="min-h-0 flex-1 overflow-y-auto data-[state=active]:flex data-[state=active]:flex-col">
          <ClampTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
