'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Copy, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

type GradientType = 'linear' | 'radial';

interface ColorStop {
  id: string;
  color: string;
  position: number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function GradientLayout() {
  const t = useTranslations('CssGradientBuilder');

  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState<number>(90);
  const [stops, setStops] = useState<ColorStop[]>([
    { id: generateId(), color: '#6366f1', position: 0 },
    { id: generateId(), color: '#ec4899', position: 100 },
  ]);

  const [copied, setCopied] = useState(false);

  // Compute CSS
  const cssString = useMemo(() => {
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const stopStrings = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
    
    if (type === 'linear') {
      return `background: linear-gradient(${angle}deg, ${stopStrings});`;
    } else {
      return `background: radial-gradient(circle, ${stopStrings});`;
    }
  }, [type, angle, stops]);

  const cssValue = cssString.replace('background: ', '').replace(';', '');

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [cssString]);

  const addStop = () => {
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const lastStopPos = sortedStops.length > 0 ? sortedStops[sortedStops.length - 1].position : 0;
    
    // Attempt to position somewhat intelligently
    let newPosition = Math.min(100, lastStopPos + 10);
    if (sortedStops.length >= 2) {
      newPosition = Math.round((sortedStops[0].position + sortedStops[1].position) / 2);
    }

    setStops([
      ...stops,
      { id: generateId(), color: '#ffffff', position: newPosition }
    ]);
  };

  const updateStop = (id: string, updates: Partial<ColorStop>) => {
    setStops(stops.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) return; // Prevent less than 2 stops
    setStops(stops.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 overflow-auto pb-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 shrink-0">
        
        {/* Left Column: Preview + Settings */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col items-center justify-center">
            <Label className="text-xs text-muted-foreground uppercase w-full text-left tracking-wider mb-3">
              {t('preview')}
            </Label>
            <div 
              className="w-full h-48 sm:h-64 rounded-xl border border-border shadow-inner transition-all duration-300 ease-out"
              style={{ background: cssValue }}
            />
          </Card>

          <Card className="p-4 space-y-5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('settings')}
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('type')}</Label>
                <Select value={type} onValueChange={(v) => setType(v as GradientType)}>
                  <SelectTrigger aria-label={t('type')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">{t('linear')}</SelectItem>
                    <SelectItem value="radial">{t('radial')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'linear' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('angle')}</Label>
                    <span className="text-xs text-muted-foreground font-mono">{angle}°</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[angle]}
                      min={0}
                      max={360}
                      step={1}
                      onValueChange={(val: number[]) => setAngle(val[0])}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={angle}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setAngle(Math.min(360, Math.max(0, val)));
                        }
                      }}
                      className="w-16 h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('output')}
              </Label>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={cssString}
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm font-mono min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                spellCheck={false}
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button 
                  size="sm" 
                  className={cn("h-8 gap-1.5 transition-all", copied ? "bg-green-500 hover:bg-green-600 text-white" : "")} 
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Stops */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('stops')}
              </Label>
              <Button size="sm" variant="secondary" onClick={addStop} className="gap-1.5 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" />
                {t('addStop')}
              </Button>
            </div>

            <div className="space-y-4">
              {stops.map((stop, index) => (
                <div key={stop.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, { color: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1 shrink-0"
                      aria-label={t('color')}
                    />
                    <Input
                      type="text"
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, { color: e.target.value })}
                      className="font-mono text-xs h-10 w-24 shrink-0 uppercase"
                    />
                    
                    <div className="flex-1 px-2 hidden sm:block">
                      <Slider
                        value={[stop.position]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(val: number[]) => updateStop(stop.id, { position: val[0] })}
                      />
                    </div>
                    
                    <div className="relative flex items-center shrink-0">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) updateStop(stop.id, { position: Math.min(100, Math.max(0, val)) });
                        }}
                        className="w-16 h-10 font-mono text-xs pr-6"
                      />
                      <span className="absolute right-2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="flex sm:hidden px-1 pt-2 w-full">
                    <Slider
                      value={[stop.position]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(val: number[]) => updateStop(stop.id, { position: val[0] })}
                    />
                  </div>
                  
                  <div className="flex justify-end mt-2 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStop(stop.id)}
                      disabled={stops.length <= 2}
                      className={cn("h-10 w-10 shrink-0", stops.length <= 2 ? "opacity-50" : "text-destructive hover:text-destructive hover:bg-destructive/10")}
                      title={t('deleteStop')}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
          </Card>
        </div>

      </div>
    </div>
  );
}
