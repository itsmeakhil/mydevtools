'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, Copy, Download, X, Search, Loader2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function GitignoreLayout() {
  const t = useTranslations('GitignoreGenerator');

  const [open, setOpen] = React.useState(false);
  const [list, setList] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  
  const [output, setOutput] = React.useState<string>('');
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingOutput, setLoadingOutput] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch complete tag list on mount
  React.useEffect(() => {
    fetch('/api/gitignore?list=true')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setList(data);
        else setErrorMsg(t('errorFetching'));
      })
      .catch(() => setErrorMsg(t('errorFetching')))
      .finally(() => setLoadingList(false));
  }, [t]);

  // Fetch aggregated output whenever selected changes
  React.useEffect(() => {
    if (selected.length === 0) {
      setOutput('');
      return;
    }

    const abort = new AbortController();
    setLoadingOutput(true);
    setErrorMsg(null);

    fetch(`/api/gitignore?tags=${encodeURIComponent(selected.join(','))}`, { signal: abort.signal })
      .then(async r => {
        if (!r.ok) throw new Error('Fetch failed');
        return r.text();
      })
      .then(text => setOutput(text))
      .catch(err => {
        if (err.name !== 'AbortError') {
          setErrorMsg(t('errorGenerating'));
          setOutput('');
        }
      })
      .finally(() => setLoadingOutput(false));

    return () => abort.abort();
  }, [selected, t]);

  const handleCopy = () => {
    void copyToClipboard(output, { silent: true });
  };

  const downloadFile = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.gitignore';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleStack = (tag: string) => {
    setSelected(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 overflow-auto pb-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full min-h-0">
        
        {/* Left Column: Stack Selection */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col items-start justify-start flex-1 min-h-[300px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              {t('searchPlaceholder')}
            </Label>
            
            <div className="w-full relative">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-11 px-3 py-2 text-left font-normal"
                    disabled={loadingList}
                  >
                    {loadingList ? (
                      <span className="flex items-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading stacks...
                      </span>
                    ) : selected.length === 0 ? (
                      <span className="text-muted-foreground">Select one or more stacks...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selected.map(item => (
                          <Badge 
                            variant="secondary" 
                            key={item} 
                            className="mr-1 mb-1 px-1.5 py-0.5 rounded-sm hover:bg-destructive/10 hover:text-destructive group transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStack(item);
                            }}
                          >
                            {item}
                            <X className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchPlaceholder')} />
                    <CommandList>
                      <CommandEmpty>{t('noResults')}</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        {list.map((stack) => {
                          const isSelected = selected.includes(stack);
                          return (
                            <CommandItem
                              key={stack}
                              value={stack}
                              onSelect={() => {
                                toggleStack(stack);
                              }}
                            >
                              <div className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                              )}>
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              <span>{stack}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {errorMsg && (
              <p className="mt-4 text-xs font-medium text-destructive">{errorMsg}</p>
            )}

            <div className="mt-8 flex flex-col flex-1 w-full gap-2 text-sm text-muted-foreground">
               <span className="text-xs uppercase tracking-wider">{t('selectedStacks')}</span>
               {selected.length === 0 ? (
                 <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 bg-card/30">
                    <p className="text-center">{t('emptyState')}</p>
                 </div>
               ) : (
                 <ScrollArea className="flex-1 border rounded-md bg-card/30 p-2">
                   <div className="flex flex-col gap-1">
                     {selected.map((item, idx) => (
                       <div key={item} className="flex justify-between items-center rounded-md px-3 py-2 text-sm border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors group">
                          <code className="font-mono">{idx + 1}. {item}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => toggleStack(item)}>
                            <X className="h-4 w-4" />
                          </Button>
                       </div>
                     ))}
                   </div>
                 </ScrollArea>
               )}
            </div>
          </Card>
        </div>

        {/* Right Column: Output */}
        <Card className="flex flex-col flex-1 p-4 overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              {t('output')}
              {loadingOutput && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
            </Label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={downloadFile} disabled={!output || loadingOutput} className="h-7 text-xs gap-1.5 px-2">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('download')}</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!output || loadingOutput} className={cn("h-7 text-xs gap-1.5 px-2 transition-all", copied ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : "")}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? t('copied') : t('copy')}</span>
              </Button>
            </div>
          </div>
          
          <div className="relative flex-1 overflow-hidden rounded-md border bg-muted/30">
             {loadingOutput ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-background/50 z-10">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 <p className="text-sm font-medium animate-pulse">{t('generating')}</p>
               </div>
             ) : null}
             
             <textarea
              readOnly
              value={output}
              placeholder={t('emptyState')}
              className="h-full w-full bg-transparent p-4 font-mono text-sm resize-none focus-visible:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-auto"
              spellCheck={false}
             />
          </div>
        </Card>
      </div>
    </div>
  );
}
