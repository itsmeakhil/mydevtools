'use client';

import { useState, useCallback, useRef } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  IconSearch,
  IconLoader2,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconWorld,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface DNSRecord {
  type: string;
  value: string;
  ttl: number | null;
  priority: number | null;
  extra: Record<string, string | number> | null;
}

interface DNSLookupResult {
  domain: string;
  records: Record<string, DNSRecord[]>;
  errors: Record<string, string>;
}

const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA', 'PTR'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

const RECORD_TYPE_META: Record<RecordType, { color: string; bg: string; description: string }> = {
  A:     { color: 'text-blue-500',   bg: 'bg-blue-500/10 border-blue-500/20',   description: 'IPv4 address' },
  AAAA:  { color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20', description: 'IPv6 address' },
  MX:    { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', description: 'Mail server' },
  TXT:   { color: 'text-green-500',  bg: 'bg-green-500/10 border-green-500/20',  description: 'Text record' },
  NS:    { color: 'text-cyan-500',   bg: 'bg-cyan-500/10 border-cyan-500/20',   description: 'Nameserver' },
  CNAME: { color: 'text-pink-500',   bg: 'bg-pink-500/10 border-pink-500/20',   description: 'Canonical name' },
  SOA:   { color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/20',  description: 'Start of authority' },
  CAA:   { color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20',    description: 'Cert authority' },
  PTR:   { color: 'text-teal-500',   bg: 'bg-teal-500/10 border-teal-500/20',   description: 'Reverse DNS' },
};

const DEFAULT_SELECTED: RecordType[] = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'];

function formatTtl(ttl: number): string {
  if (ttl < 60) return `${ttl}s`;
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h`;
  return `${Math.floor(ttl / 86400)}d`;
}

function CopyButton({ text }: { text: string }) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(text, { silent: true, resetMs: 1500 })}
      className="shrink-0 p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied
        ? <IconCheck className="h-3.5 w-3.5 text-green-500" />
        : <IconCopy className="h-3.5 w-3.5" />}
    </button>
  );
}

function RecordTypeBadge({ type }: { type: RecordType }) {
  const meta = RECORD_TYPE_META[type];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border', meta.color, meta.bg)}>
      {type}
    </span>
  );
}

function RecordRow({ record }: { record: DNSRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasExtra = record.extra && Object.keys(record.extra).length > 0;

  return (
    <div className="group">
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg">
        {record.priority != null && (
          <span className="shrink-0 text-xs font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded mt-0.5">
            {record.priority}
          </span>
        )}
        <span className="flex-1 font-mono text-sm break-all leading-relaxed">{record.value}</span>
        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
          {record.ttl != null && (
            <span className="text-[11px] text-muted-foreground/60 font-mono">
              TTL {formatTtl(record.ttl)}
            </span>
          )}
          {hasExtra && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <IconChevronUp className="h-3.5 w-3.5" /> : <IconChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          <CopyButton text={record.value} />
        </div>
      </div>
      <AnimatePresence>
        {hasExtra && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-3 rounded-lg bg-muted/20 border border-border/40 px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono">
              {Object.entries(record.extra!).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground/70 shrink-0">{k}:</span>
                  <span className="text-foreground/80">{String(v)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecordSection({ type, records }: { type: RecordType; records: DNSRecord[] }) {
  const meta = RECORD_TYPE_META[type];
  const isEmpty = records.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/10')}>
          <RecordTypeBadge type={type} />
          <span className="text-xs text-muted-foreground">{meta.description}</span>
          <div className="ml-auto">
            <Badge variant="secondary" className="text-xs px-2 h-5">
              {records.length}
            </Badge>
          </div>
        </div>
        <CardContent className="p-0">
          {isEmpty ? (
            <p className="px-4 py-3 text-sm text-muted-foreground/50 italic">No records found</p>
          ) : (
            <div className="divide-y divide-border/30">
              {records.map((rec, i) => (
                <RecordRow key={i} record={rec} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const QUICK_DOMAINS = ['google.com', 'github.com', 'cloudflare.com', 'example.com'];

export function DnsLookupLayout() {
  const t = useTranslations('DnsLookup');
  const [domain, setDomain] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>(DEFAULT_SELECTED);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DNSLookupResult | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleType = useCallback((type: RecordType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev
        : [...prev, type]
    );
  }, []);

  const lookup = useCallback(async (overrideDomain?: string) => {
    const target = (overrideDomain ?? domain).trim().replace(/^https?:\/\//i, '').split('/')[0];
    if (!target) return;
    setLoading(true);
    setResult(null);
    setGlobalError(null);
    if (overrideDomain) setDomain(overrideDomain);

    try {
      const params = new URLSearchParams({ domain: target });
      selectedTypes.forEach(rt => params.append('record_types', rt));
      const res = await fetch(`/api/backend/dns-lookup/lookup?${params}`, {
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || `Request failed (${res.status})`);
      }
      const data: DNSLookupResult = await res.json();
      if (data.errors?._ ) {
        setGlobalError(data.errors._);
      } else {
        setResult(data);
      }
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : t('errors.lookupFailed'));
    } finally {
      setLoading(false);
    }
  }, [domain, selectedTypes, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookup();
  };

  const hasResults = result && Object.keys(result.records).length > 0;
  const resultTypes = result
    ? (selectedTypes.filter(rt => rt in result.records) as RecordType[])
    : [];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full w-full space-y-4">
        {/* Search card */}
        <Card className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <IconWorld className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={domain}
                onChange={e => setDomain(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                className="pl-9 font-mono text-sm"
                disabled={loading}
              />
            </div>
            <Button onClick={() => lookup()} disabled={loading || !domain.trim()} className="gap-2 shrink-0">
              {loading
                ? <IconLoader2 className="h-4 w-4 animate-spin" />
                : <IconSearch className="h-4 w-4" />}
              {loading ? t('looking') : t('lookupBtn')}
            </Button>
          </div>

          {/* Record type selector */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('recordTypesLabel')}</p>
            <div className="flex flex-wrap gap-1.5">
              {RECORD_TYPES.map(rt => {
                const meta = RECORD_TYPE_META[rt];
                const active = selectedTypes.includes(rt);
                return (
                  <Tooltip key={rt}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => toggleType(rt)}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-all duration-150',
                          active
                            ? cn(meta.color, meta.bg, 'shadow-sm')
                            : 'text-muted-foreground/50 bg-muted/20 border-border/30 hover:border-border/60 hover:text-muted-foreground'
                        )}
                      >
                        {rt}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {meta.description}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedTypes([...RECORD_TYPES])}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs border border-dashed border-border/40 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/60 transition-colors"
              >
                {t('allBtn')}
              </button>
            </div>
          </div>

          {/* Quick domains */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60">{t('tryLabel')}</span>
            {QUICK_DOMAINS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => lookup(d)}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-muted-foreground/30 hover:decoration-foreground/50 transition-colors disabled:opacity-40"
              >
                {d}
              </button>
            ))}
          </div>
        </Card>

        {/* Global error */}
        <AnimatePresence>
          {globalError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3"
            >
              <IconAlertCircle className="h-4 w-4 shrink-0" />
              {globalError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {selectedTypes.slice(0, 4).map(rt => (
                <Card key={rt} className="overflow-hidden border-border/40">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-muted/10">
                    <div className="h-5 w-12 rounded-md bg-muted/40 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted/30 animate-pulse" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted/30 animate-pulse" />
                    {rt === 'TXT' && <div className="h-4 w-1/2 rounded bg-muted/30 animate-pulse" />}
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {hasResults && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Results for <span className="font-mono font-medium text-foreground">{result!.domain}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => lookup()}
                  className="gap-1.5 h-7 text-xs text-muted-foreground"
                >
                  <IconRefresh className="h-3 w-3" />
                  {t('refreshBtn')}
                </Button>
              </div>

              {resultTypes.map((rt, i) => (
                <motion.div
                  key={rt}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <RecordSection type={rt} records={result!.records[rt] ?? []} />
                </motion.div>
              ))}

              {/* Per-type errors */}
              {Object.entries(result!.errors).filter(([k]) => k !== '_').map(([rtype, msg]) => (
                <div key={rtype} className="flex items-center gap-2 text-xs text-muted-foreground/70 px-1">
                  <span className="font-mono">{rtype}:</span>
                  <span>{msg}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
