'use client';

import { useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { computeIpv4Subnet, computeIpv6Subnet } from '@/lib/ip-subnet';
import { cn } from '@/lib/utils';
import { IconHierarchy2 } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';

function Row({
  label,
  value,
  mono,
  copyLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyLabel: string;
}) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const handleCopy = () => {
    void copyToClipboard(value, { silent: true, resetMs: 1500 });
  };

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className={cn('min-w-0 break-all text-right text-sm', mono && 'font-mono')}>{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleCopy}
          aria-label={copyLabel}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function IpSubnetCalculatorLayout() {
  const t = useTranslations('IpSubnetCalculator');
  const [family, setFamily] = useState<'ipv4' | 'ipv6'>('ipv4');
  const [ipv4Input, setIpv4Input] = useState('10.0.0.0/24');
  const [ipv6Input, setIpv6Input] = useState('2001:db8::/32');
  const [ipv4Debounced, setIpv4Debounced] = useState(ipv4Input);
  const [ipv6Debounced, setIpv6Debounced] = useState(ipv6Input);

  const debounceIpv4 = useDebouncedCallback((v: string) => setIpv4Debounced(v), 200);
  const debounceIpv6 = useDebouncedCallback((v: string) => setIpv6Debounced(v), 200);

  const onIpv4Change = (v: string) => {
    setIpv4Input(v);
    debounceIpv4(v);
  };

  const onIpv6Change = (v: string) => {
    setIpv6Input(v);
    debounceIpv6(v);
  };

  const ipv4Result = useMemo(() => computeIpv4Subnet(ipv4Debounced), [ipv4Debounced]);
  const ipv6Result = useMemo(() => computeIpv6Subnet(ipv6Debounced), [ipv6Debounced]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <RevealItem index={0} className="shrink-0">
        <ToolPageHeader
          icon={IconHierarchy2}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Network & API']}
        />
      </RevealItem>

      <Tabs value={family} onValueChange={(v) => setFamily(v as 'ipv4' | 'ipv6')} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="ipv4">{t('tabIpv4')}</TabsTrigger>
          <TabsTrigger value="ipv6">{t('tabIpv6')}</TabsTrigger>
        </TabsList>

        <TabsContent value="ipv4" className="mt-0 flex min-h-0 flex-1 flex-col gap-4 data-[state=inactive]:hidden">
          <Card className="space-y-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="ipv4-input">{t('inputLabel')}</Label>
              <Input
                id="ipv4-input"
                value={ipv4Input}
                onChange={(e) => onIpv4Change(e.target.value)}
                placeholder={t('placeholderIpv4')}
                className="font-mono text-sm"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">{t('hintIpv4')}</p>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            {!ipv4Result.ok ? (
              <p className="text-sm text-destructive">{t(`errors.${ipv4Result.errorKey}`)}</p>
            ) : (
              <>
                <Row label={t('rows.cidr')} value={ipv4Result.value.cidrNotation} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.network')} value={ipv4Result.value.networkAddress} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.netmask')} value={ipv4Result.value.netmask} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.wildcard')} value={ipv4Result.value.wildcardMask} mono copyLabel={t('copyValue')} />
                {ipv4Result.value.broadcast !== null && (
                  <Row label={t('rows.broadcast')} value={ipv4Result.value.broadcast} mono copyLabel={t('copyValue')} />
                )}
                <Row label={t('rows.firstHost')} value={ipv4Result.value.firstHost} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.lastHost')} value={ipv4Result.value.lastHost} mono copyLabel={t('copyValue')} />
                <Row
                  label={t('rows.totalAddresses')}
                  value={ipv4Result.value.totalAddresses.toLocaleString('en-US')}
                  mono
                  copyLabel={t('copyValue')}
                />
                {ipv4Result.value.usableHosts !== null && (
                  <Row
                    label={t('rows.usableHosts')}
                    value={ipv4Result.value.usableHosts.toString()}
                    mono
                    copyLabel={t('copyValue')}
                  />
                )}
                {ipv4Result.value.usableNoteKey === 'pointToPoint' && (
                  <p className="text-xs text-muted-foreground">{t('usableNote.pointToPoint')}</p>
                )}
                {ipv4Result.value.usableNoteKey === 'singleHost' && (
                  <p className="text-xs text-muted-foreground">{t('usableNote.singleHost')}</p>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ipv6" className="mt-0 flex min-h-0 flex-1 flex-col gap-4 data-[state=inactive]:hidden">
          <Card className="space-y-3 p-4">
            <div className="space-y-2">
              <Label htmlFor="ipv6-input">{t('inputLabel')}</Label>
              <Input
                id="ipv6-input"
                value={ipv6Input}
                onChange={(e) => onIpv6Change(e.target.value)}
                placeholder={t('placeholderIpv6')}
                className="font-mono text-sm"
                spellCheck={false}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">{t('hintIpv6')}</p>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-4">
            {!ipv6Result.ok ? (
              <p className="text-sm text-destructive">{t(`errors.${ipv6Result.errorKey}`)}</p>
            ) : (
              <>
                <Row label={t('rows.cidr')} value={ipv6Result.value.cidrNotation} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.prefixLength')} value={String(ipv6Result.value.prefixLength)} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.networkIpv6')} value={ipv6Result.value.networkAddress} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.lastIpv6')} value={ipv6Result.value.lastAddress} mono copyLabel={t('copyValue')} />
                <Row label={t('rows.totalAddressesIpv6')} value={ipv6Result.value.totalAddresses} mono copyLabel={t('copyValue')} />
                <p className="text-xs text-muted-foreground">
                  {t(`ipv6RangeHint.${ipv6Result.value.rangeSummaryKey}`)}
                </p>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
