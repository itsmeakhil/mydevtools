'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconPalette } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { BoxShadowTab } from './box-shadow-tab'
import { BorderRadiusTab } from './border-radius-tab'
import { ClampTab } from './clamp-tab'

export function CssGeneratorsLayout() {
  const t = useTranslations('CssGenerators')

  return (
    <ToolShell icon={IconPalette} title={t('title')} description={t('subtitle')}>
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
    </ToolShell>
  )
}
