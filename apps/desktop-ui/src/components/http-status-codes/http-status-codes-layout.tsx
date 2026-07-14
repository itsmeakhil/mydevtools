'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CopyButton } from '@/components/tools/copy-button'
import { ToolHeader } from '@/components/tools/tool-header'
import { ToolWrapper } from '@/components/tools/tool-wrapper'
import { HTTP_STATUS_CODES, type HttpStatusClass } from '@/lib/http-status-codes'

type ClassFilter = 'all' | HttpStatusClass

function classLabel(c: HttpStatusClass): string {
  switch (c) {
    case '1xx':
      return '1xx Informational'
    case '2xx':
      return '2xx Success'
    case '3xx':
      return '3xx Redirection'
    case '4xx':
      return '4xx Client Error'
    case '5xx':
      return '5xx Server Error'
  }
}

function badgeClass(cls: HttpStatusClass): string {
  switch (cls) {
    case '1xx':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case '2xx':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case '3xx':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case '4xx':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    case '5xx':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  }
}

export function HttpStatusCodesLayout() {
  const t = useTranslations('HttpStatusCodes')
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return HTTP_STATUS_CODES.filter((s) => {
      if (classFilter !== 'all' && s.class !== classFilter) return false
      if (!q) return true
      const hay = `${s.code} ${s.phrase} ${s.description} ${s.spec ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [classFilter, query])

  return (
    <ToolWrapper toolId="http-status-codes" maxWidth="5xl">
      <ToolHeader
        title={t('header.title')}
        description={t('header.description')}
        toolId="http-status-codes"
      />

      <div className="mt-6 space-y-4">
        <Card className="border-border/40 bg-background/50 backdrop-blur-sm shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-64">
                <Select
                  value={classFilter}
                  onValueChange={(v) => setClassFilter(v as ClassFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('classFilterPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('classFilterAll')}</SelectItem>
                    {(['1xx', '2xx', '3xx', '4xx', '5xx'] as const).map((c) => (
                      <SelectItem key={c} value={c}>
                        {classLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {t('resultsCount', { count: filtered.length, total: HTTP_STATUS_CODES.length })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[120px]">{t('table.code')}</TableHead>
                  <TableHead className="w-[220px]">{t('table.phrase')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead className="w-[90px] text-right">{t('table.copy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {t('noResults', { query })}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.code}>
                      <TableCell className="font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{s.code}</span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2 py-0.5 ${badgeClass(s.class)}`}
                          >
                            {s.class}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{s.phrase}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <span>{s.description}</span>
                        {s.spec ? (
                          <span className="ml-2 text-xs text-muted-foreground/80">
                            {t('specPrefix')} {s.spec}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <CopyButton
                          text={String(s.code)}
                          successMessage={t('copied')}
                          variant="ghost"
                          size="icon"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </ToolWrapper>
  )
}

