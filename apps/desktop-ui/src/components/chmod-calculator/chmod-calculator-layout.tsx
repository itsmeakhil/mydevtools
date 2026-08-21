'use client'

import React, { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy, SquareTerminal } from 'lucide-react'
import { IconLockAccess } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import {
  CHMOD_PRESETS,
  PERMISSION_CLASSES,
  flagsToOctal,
  flagsToSymbolic,
  octalToFlags,
  symbolicToFlags,
  type ClassFlags,
  type PermissionClass,
  type PermissionFlags,
} from '@/lib/chmod-calculator'

const PERMISSION_BITS: (keyof ClassFlags)[] = ['read', 'write', 'execute']
const SPECIAL_BITS = ['setuid', 'setgid', 'sticky'] as const

export function ChmodCalculatorLayout() {
  const t = useTranslations('ChmodCalculator')
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const [flags, setFlags] = useState<PermissionFlags>(() => octalToFlags('755')!)
  const [octalText, setOctalText] = useState('755')
  const [symbolicText, setSymbolicText] = useState('rwxr-xr-x')

  const octalValid = octalToFlags(octalText) !== null
  const symbolicValid = symbolicToFlags(symbolicText) !== null

  /** Single sync point: set new flags and rewrite both text inputs. */
  const applyFlags = useCallback((next: PermissionFlags) => {
    setFlags(next)
    setOctalText(flagsToOctal(next))
    setSymbolicText(flagsToSymbolic(next))
  }, [])

  const toggleBit = (cls: PermissionClass, bit: keyof ClassFlags, checked: boolean) => {
    applyFlags({ ...flags, [cls]: { ...flags[cls], [bit]: checked } })
  }

  const toggleSpecial = (bit: (typeof SPECIAL_BITS)[number], checked: boolean) => {
    applyFlags({ ...flags, [bit]: checked })
  }

  const onOctalChange = (value: string) => {
    setOctalText(value)
    const parsed = octalToFlags(value)
    if (parsed) {
      setFlags(parsed)
      setSymbolicText(flagsToSymbolic(parsed))
    }
  }

  const onSymbolicChange = (value: string) => {
    setSymbolicText(value)
    const parsed = symbolicToFlags(value)
    if (parsed) {
      setFlags(parsed)
      setOctalText(flagsToOctal(parsed))
    }
  }

  const octal = flagsToOctal(flags)
  const command = `chmod ${octal} file`

  const classPerms = (cls: PermissionClass): string => {
    const active = PERMISSION_BITS.filter((bit) => flags[cls][bit]).map((bit) => t(`grid.${bit}`).toLowerCase())
    if (active.length === 0) return t('explain.none', { cls: t(`grid.${cls}`) })
    return t('explain.line', { cls: t(`grid.${cls}`), perms: active.join(', ') })
  }

  return (
    <ToolShell icon={IconLockAccess} title={t('title')} description={t('subtitle')}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Checkbox grid */}
          <div className="rounded-lg border border-border bg-card p-5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('grid.title')}
            </Label>
            <div className="mt-3 grid grid-cols-4 gap-y-3 text-sm">
              <div />
              {PERMISSION_BITS.map((bit) => (
                <div key={bit} className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t(`grid.${bit}`)}
                </div>
              ))}
              {PERMISSION_CLASSES.map((cls) => (
                <React.Fragment key={cls}>
                  <div className="flex items-center font-medium">{t(`grid.${cls}`)}</div>
                  {PERMISSION_BITS.map((bit) => (
                    <div key={bit} className="flex items-center justify-center">
                      <Checkbox
                        checked={flags[cls][bit]}
                        onCheckedChange={(v) => toggleBit(cls, bit, v === true)}
                        aria-label={`${t(`grid.${cls}`)} ${t(`grid.${bit}`)}`}
                      />
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

            <Label className="mt-6 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('special.title')}
            </Label>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
              {SPECIAL_BITS.map((bit) => (
                <label key={bit} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={flags[bit]}
                    onCheckedChange={(v) => toggleSpecial(bit, v === true)}
                    aria-label={t(`special.${bit}`)}
                  />
                  {t(`special.${bit}`)}
                </label>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="chmod-octal" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('octal.label')}
                </Label>
                <Input
                  id="chmod-octal"
                  value={octalText}
                  onChange={(e) => onOctalChange(e.target.value)}
                  placeholder={t('octal.placeholder')}
                  className={`font-mono ${octalValid ? '' : 'border-destructive focus-visible:ring-destructive'}`}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={4}
                />
                {!octalValid && <p className="text-xs text-destructive">{t('octal.invalid')}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chmod-symbolic" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('symbolic.label')}
                </Label>
                <Input
                  id="chmod-symbolic"
                  value={symbolicText}
                  onChange={(e) => onSymbolicChange(e.target.value)}
                  placeholder={t('symbolic.placeholder')}
                  className={`font-mono ${symbolicValid ? '' : 'border-destructive focus-visible:ring-destructive'}`}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={9}
                />
                {!symbolicValid && <p className="text-xs text-destructive">{t('symbolic.invalid')}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Output */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('output.title')}
                </Label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyToClipboard(command, { silent: true })}
                >
                  {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? t('output.copied') : t('output.copy')}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-2.5 font-mono text-sm">
                <SquareTerminal className="h-4 w-4 shrink-0 text-muted-foreground" />
                {command}
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {PERMISSION_CLASSES.map((cls) => (
                  <p key={cls}>{classPerms(cls)}</p>
                ))}
                {flags.setuid && <p>{t('explain.setuid')}</p>}
                {flags.setgid && <p>{t('explain.setgid')}</p>}
                {flags.sticky && <p>{t('explain.sticky')}</p>}
              </div>
            </div>

            {/* Presets */}
            <div className="rounded-lg border border-border bg-card p-5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('presets.title')}
              </Label>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-1.5 pr-3 font-medium">{t('presets.octal')}</th>
                      <th className="py-1.5 pr-3 font-medium">{t('presets.permissions')}</th>
                      <th className="py-1.5 font-medium">{t('presets.description')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHMOD_PRESETS.map((preset) => (
                      <tr
                        key={preset.octal}
                        onClick={() => applyFlags(octalToFlags(preset.octal)!)}
                        className={`cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50 ${
                          octal === preset.octal ? 'bg-muted/60' : ''
                        }`}
                      >
                        <td className="py-2 pr-3 font-mono font-semibold">{preset.octal}</td>
                        <td className="py-2 pr-3 font-mono text-muted-foreground">
                          {flagsToSymbolic(octalToFlags(preset.octal)!)}
                        </td>
                        <td className="py-2 text-muted-foreground">{t(`presets.${preset.descriptionKey}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  )
}
