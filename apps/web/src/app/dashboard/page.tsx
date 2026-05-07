'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from "@/components/ui/card";
import { sidebarData } from "../../components/sidebar/data/sidebar-data";
import Link, { LinkProps } from "next/link";
import { Clock, ArrowRight, Sparkles, Layers, Zap, Search, X, LayoutGrid, BarChart3, LogIn, Wand2, Pin, SlidersHorizontal } from 'lucide-react';
import { requiresAuth } from '@/lib/tool-config';
import { usePinnedToolsStore } from '@/store/pinned-tools-store';
import { useToolUsage } from '@/hooks/use-tool-usage';
import { useMediaQuery } from "@/hooks/use-media-query";
import useAuth from "@/utils/useAuth";
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TOOL_PATH_TO_MESSAGE_KEY } from '@/lib/tool-i18n';
import { cn } from '@/lib/utils';

// Popular tool slugs shown in the no-results state
const POPULAR_TOOL_URLS = [
  '/app/json-formatter',
  '/app/jwt-decoder',
  '/app/api-client',
  '/app/regex-tester',
  '/app/uuid-generator',
  '/app/base64',
];

// Lazy-load the analytics panel — it's behind a tab click, not in the critical path
const DashboardAnalyticsPanel = dynamic(
  () => import('@/components/dashboard/dashboard-analytics-panel').then((m) => m.DashboardAnalyticsPanel),
  {
    loading: () => (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    ),
  }
);

function dashboardGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('greeting.morning');
  if (hour < 17) return t('greeting.afternoon');
  return t('greeting.evening');
}

function groupDisplayTitle(title: string, t: (key: string) => string): string {
  if (title === 'Apps') return t('groups.apps');
  return title;
}

// Define types for our items
interface ToolItem {
  title: string;
  url?: LinkProps['href'];
  icon?: React.ElementType;
  badge?: string;
  description?: string;
  items?: ToolItem[];
  customUI?: boolean;
  hiddenOnMobile?: boolean;
}

interface FavoriteItem extends ToolItem {
  id: string;
  timestamp?: number;
}

interface RenderToolItem extends ToolItem {
  originalId?: string;
}

interface RenderGroup {
  title: string;
  icon?: React.ElementType;
  items: RenderToolItem[];
  originalGroupIndex: number;
}

// Helper function to create a unique ID for each item
const createItemId = (groupIndex: number, itemIndex: number, subIndex: number | null = null): string => {
  return subIndex !== null
    ? `${groupIndex}-${itemIndex}-${subIndex}`
    : `${groupIndex}-${itemIndex}`;
};

// Helper function to find an item by its ID
const findItemById = (id: string | undefined | null): ToolItem | undefined => {
  if (!id || typeof id !== 'string') {
    return undefined;
  }

  const [groupIndexStr, itemIndexStr, subIndexStr] = id.split('-');
  const groupIndex = parseInt(groupIndexStr);
  const itemIndex = parseInt(itemIndexStr);
  const subIndex = subIndexStr ? parseInt(subIndexStr) : undefined;

  if (isNaN(groupIndex) || isNaN(itemIndex) || groupIndex >= sidebarData.navGroups.length) {
    return undefined;
  }

  const group = sidebarData.navGroups[groupIndex];
  if (!group || itemIndex >= group.items.length) {
    return undefined;
  }

  if (subIndex !== undefined && !isNaN(subIndex)) {
    const parentItem = group.items[itemIndex];
    return parentItem.items && subIndex < parentItem.items.length
      ? parentItem.items[subIndex]
      : undefined;
  } else {
    return group.items[itemIndex];
  }
};

// Wraps a horizontal scroll row with a right-edge fade affordance
const HScrollFade = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background/80 to-transparent rounded-r-xl" />
  </div>
);

// ToolCard is defined outside DashboardPage to prevent remount on every render
interface ToolCardProps {
  item: ToolItem;
  id: string;
  index: number;
  user: { displayName?: string | null } | null;
  isPinned: (url: string) => boolean;
  togglePin: (url: string) => void;
  timestamp?: number;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const ToolCard = ({ item, id, index, user, isPinned, togglePin, timestamp }: ToolCardProps) => {
  const tCard = useTranslations('Dashboard');
  const tTools = useTranslations('Dashboard.tools');
  const pathname = item.url?.toString().split('?')[0] ?? '';
  const toolKey = TOOL_PATH_TO_MESSAGE_KEY[pathname];
  const displayTitle = toolKey ? tTools(`${toolKey}.title` as Parameters<typeof tTools>[0]) : item.title;
  const displayDescription = toolKey
    ? tTools(`${toolKey}.description` as Parameters<typeof tTools>[0])
    : item.description || tCard('toolCard.defaultDescription');

  const itemRequiresAuth = item.url ? requiresAuth(item.url.toString()) : false;

  const handleClick = (e: React.MouseEvent) => {
    if (itemRequiresAuth && !user) {
      e.preventDefault();
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="card-gradient-border rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'both' }}
    >
      <Link href={item.url || "#"} className="block group h-full" onClick={handleClick}>
        <Card className="glass-card border-border/30 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5 md:group-hover:-translate-y-1.5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <CardContent className="p-3 md:p-5 h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:scale-110 transition-all duration-300 icon-container-pulse">
                {item.icon ? <item.icon size={18} strokeWidth={1.5} className="md:w-[22px] md:h-[22px]" /> : <Sparkles size={18} strokeWidth={1.5} className="md:w-[22px] md:h-[22px]" />}
              </div>
              {item.url && (
                <div
                  className="p-2 rounded-full hover:bg-muted/80 transition-colors z-20 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin(item.url!.toString());
                  }}
                >
                  <Pin
                    className={cn('transition-all duration-300', isPinned(item.url.toString())
                      ? 'text-primary fill-primary scale-110'
                      : 'text-muted-foreground/60 hover:text-primary')}
                    size={14}
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                <h3 className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {displayTitle}
                </h3>
                {item.badge && (
                  <span className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-[9px] md:text-[10px] font-semibold px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-wider border border-primary/20">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground/80 text-xs md:text-sm line-clamp-2 group-hover:text-muted-foreground transition-colors">
                {displayDescription}
              </p>
              {timestamp && (
                <p className="mt-1 text-[10px] text-muted-foreground/50 tabular-nums">
                  {formatRelativeTime(timestamp)}
                </p>
              )}
            </div>

            <div className="mt-2 md:mt-3 flex items-center text-[10px] md:text-xs font-medium text-primary opacity-40 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-4px] group-hover:translate-x-0">
              {tCard('toolCard.launchTool')} <ArrowRight size={10} className="md:w-3 md:h-3 ml-1 md:ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const t = useTranslations('Dashboard');
  const tTabs = useTranslations('Dashboard.tabs');
  const { user, loading } = useAuth(false); // Dashboard shows for all users
  const pinnedToolUrls = usePinnedToolsStore((s) => s.pinnedTools);
  const togglePin = usePinnedToolsStore((s) => s.togglePin);
  const isPinned = (url: string) => pinnedToolUrls.includes(url);
  const { getRecentlyUsedTools } = useToolUsage();
  const [recentlyUsedItems, setRecentlyUsedItems] = useState<FavoriteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get recently used tools
  useEffect(() => {
    const recent = getRecentlyUsedTools(5);
    const items = recent.map(usage => {
      const item = findItemById(usage.toolId);
      return item ? { id: usage.toolId, timestamp: usage.timestamp, ...item } : null;
    }).filter((item): item is FavoriteItem => {
      if (!item) return false;
      return true;
    });

    setRecentlyUsedItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Cmd/Ctrl + K focuses search for fast navigation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Groups for category filter chips
  const filterGroups = useMemo(() => {
    return sidebarData.navGroups.map(g => ({ title: g.title, icon: g.icon }));
  }, []);

  // Tools with a badge — shown in the "What's New" section
  const whatsNewItems = useMemo<RenderToolItem[]>(() => {
    const items: RenderToolItem[] = [];
    sidebarData.navGroups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        if (item.badge) {
          items.push({ ...item, originalId: createItemId(groupIndex, itemIndex) });
        }
        item.items?.forEach((subItem, subIndex) => {
          if (subItem.badge) {
            items.push({ ...subItem, icon: subItem.icon || item.icon, originalId: createItemId(groupIndex, itemIndex, subIndex) });
          }
        });
      });
    });
    return items;
  }, []);

  // Pinned tools — derived from URL-keyed store, preserving pin order
  const pinnedItems = useMemo<RenderToolItem[]>(() => {
    if (pinnedToolUrls.length === 0) return [];
    const found: RenderToolItem[] = [];
    sidebarData.navGroups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        const url = item.url?.toString() ?? '';
        if (pinnedToolUrls.includes(url)) {
          found.push({ ...item, originalId: createItemId(groupIndex, itemIndex) });
        }
        item.items?.forEach((subItem, subIndex) => {
          const subUrl = subItem.url?.toString() ?? '';
          if (pinnedToolUrls.includes(subUrl)) {
            found.push({ ...subItem, icon: subItem.icon || item.icon, originalId: createItemId(groupIndex, itemIndex, subIndex) });
          }
        });
      });
    });
    // Preserve the order items were pinned
    return pinnedToolUrls
      .map(url => found.find(i => i.url?.toString() === url))
      .filter((i): i is RenderToolItem => !!i);
  }, [pinnedToolUrls]);

  // Filter tools based on search query, mobile visibility, and active group filter
  const filteredGroups = useMemo<RenderGroup[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const mobileFilteredGroups = sidebarData.navGroups.map((group, groupIndex) => {
      if (filterGroup && group.title !== filterGroup) return null;

      const visibleItems = group.items
        .map((item, itemIndex) => ({ item, itemIndex }));

      const searchableItems = visibleItems.flatMap<RenderToolItem>(({ item, itemIndex }) => {

        if (item.items?.length) {
          return item.items
            .map((subItem, subIndex) => ({
              ...subItem,
              icon: subItem.icon || item.icon,
              originalId: createItemId(groupIndex, itemIndex, subIndex),
            }))
            .filter((subItem) => {
              if (!normalizedQuery) return true;
              const title = (subItem.title || "").toLowerCase();
              const description = (subItem.description || "").toLowerCase();
              return title.includes(normalizedQuery) || description.includes(normalizedQuery);
            });
        }

        const normalizedTitle = (item.title || "").toLowerCase();
        const normalizedDescription = (item.description || "").toLowerCase();
        if (
          normalizedQuery &&
          !normalizedTitle.includes(normalizedQuery) &&
          !normalizedDescription.includes(normalizedQuery)
        ) {
          return [];
        }
        return [{
          ...item,
          originalId: createItemId(groupIndex, itemIndex),
        }];
      });

      const groupMatches = normalizedQuery && group.title.toLowerCase().includes(normalizedQuery);
      const finalItems =
        groupMatches && searchableItems.length === 0
          ? visibleItems
              .filter(({ item }) => !item.items)
              .map(({ item, itemIndex }) => ({
                ...item,
                originalId: createItemId(groupIndex, itemIndex),
              }))
          : searchableItems;

      const dedupedItems = Array.from(
        new Map(finalItems.map((item) => [item.originalId || item.title, item])).values()
      );

      const itemsToRender: RenderToolItem[] = normalizedQuery ? dedupedItems : visibleItems
        .map(({ item, itemIndex }) => {
        if (item.items?.length) {
          return {
            ...item,
            items: item.items.map((subItem, subIndex) => ({
              ...subItem,
              icon: subItem.icon || item.icon,
              originalId: createItemId(groupIndex, itemIndex, subIndex),
            })),
            originalId: createItemId(groupIndex, itemIndex),
          };
        }
        return { ...item, originalId: createItemId(groupIndex, itemIndex) };
      });
      if (itemsToRender.length === 0) return null;

      return {
        ...group,
        items: itemsToRender,
        originalGroupIndex: groupIndex,
      };
    }).filter((group): group is RenderGroup => group !== null);

    return mobileFilteredGroups;
  }, [searchQuery, filterGroup]);

  // Total tools count
  const totalTools = useMemo(() => {
    return sidebarData.navGroups.reduce((acc, group) => {
      return acc + group.items.reduce((itemAcc, item) => {
        return itemAcc + (item.items ? item.items.length : 1);
      }, 0);
    }, 0);
  }, []);

  // Popular tools shown in the no-results state
  const popularItems = useMemo<RenderToolItem[]>(() => {
    const found: RenderToolItem[] = [];
    sidebarData.navGroups.forEach((group, gi) => {
      group.items.forEach((item, ii) => {
        const url = item.url?.toString() ?? '';
        if (POPULAR_TOOL_URLS.includes(url)) {
          found.push({ ...item, originalId: createItemId(gi, ii) });
        }
        item.items?.forEach((sub, si) => {
          const subUrl = sub.url?.toString() ?? '';
          if (POPULAR_TOOL_URLS.includes(subUrl)) {
            found.push({ ...sub, icon: sub.icon || item.icon, originalId: createItemId(gi, ii, si) });
          }
        });
      });
    });
    return POPULAR_TOOL_URLS
      .map(url => found.find(i => i.url?.toString() === url))
      .filter((i): i is RenderToolItem => !!i);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const toolCardProps = { user, isPinned, togglePin };

  return (
    <div className="min-h-screen bg-background/50 dashboard-grid-bg mobile-nav-offset">
      {/* Mobile Sticky Header - App-like feel */}
      <div className="sticky top-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">{t('brandName')}</h1>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {dashboardGreeting(t)}
                {user?.displayName ? t('commaName', { name: user.displayName.split(' ')[0] }) : ''}
              </p>
            </div>
          </div>
          {/* Quick Stats in Header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 min-h-[32px]">
              <Layers size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold">{totalTools}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 md:px-8 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto space-y-5 md:space-y-8">
          {/* Desktop Header Section - Hidden on mobile */}
          <div className="hidden md:flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {dashboardGreeting(t)}
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight gradient-text-animated">
                    {user?.displayName
                      ? t('welcomeBackNamed', { name: user.displayName.split(' ')[0] })
                      : t('welcomeBack')}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {t('tagline')}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-2 md:gap-3">
                <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl glass-card stats-glow">
                  <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-primary/10">
                    <Layers size={14} className="md:w-4 md:h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t('stats.tools')}</p>
                    <p className="text-xs md:text-sm font-semibold">{totalTools}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="apps" className="w-full">
            <TabsList className="mb-3 grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 sm:inline-flex sm:w-auto sm:justify-start">
              <TabsTrigger value="apps" className="gap-1.5 text-xs sm:text-sm">
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tTabs('apps')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tTabs('analytics')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apps" className="mt-0 space-y-5 md:space-y-8 focus-visible:outline-none">
              {/* Search + category filter chips */}
              <div className="sticky top-[56px] md:top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border/40 focus-within:border-primary/50 rounded-xl px-3 py-2 transition-colors">
                <div className="relative flex items-center gap-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={`Search ${totalTools}+ tools…`}
                    className="pl-9 pr-20 h-10 border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7", (showFilters || filterGroup) && "text-primary bg-primary/10")}
                      onClick={() => setShowFilters(v => !v)}
                      aria-label="Toggle category filters"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    <span className="hidden md:inline-flex items-center rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      Ctrl/⌘ K
                    </span>
                  </div>
                </div>
                {/* Category filter chips — hidden until toggled */}
                {(showFilters || filterGroup !== null) && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 mobile-scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setFilterGroup(null)}
                    className={cn(
                      "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      filterGroup === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t('filterAll')}
                  </button>
                  {filterGroups.map(({ title, icon: GroupIcon }) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => setFilterGroup(filterGroup === title ? null : title)}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        filterGroup === title
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {GroupIcon && <GroupIcon className="w-3 h-3 shrink-0" />}
                      {groupDisplayTitle(title, t)}
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* Pinned — shown first, always visible unless searching or group-filtering */}
              {/* Pinned empty state — shown once, only when nothing is pinned */}
              {pinnedItems.length === 0 && !searchQuery && !filterGroup && (
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Pin size={16} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('sections.pinned')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('pinnedEmpty')}</p>
                  </div>
                </div>
              )}

              {pinnedItems.length > 0 && !searchQuery && !filterGroup && (
                <section className="space-y-3 md:space-y-5">
                  <div className="flex items-center gap-3 section-header-line pb-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Pin size={18} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-semibold">{t('sections.pinned')}</h2>
                    <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {pinnedItems.length}
                    </span>
                  </div>
                  <div className="md:hidden -mx-4 px-4">
                    <HScrollFade>
                      <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
                        {pinnedItems.map((item, index) => (
                          <div key={`pinned-mobile-${item.originalId}`} className="scroll-snap-item w-[min(280px,75vw)] flex-shrink-0">
                            <ToolCard item={item} id={item.originalId!} index={index} {...toolCardProps} />
                          </div>
                        ))}
                      </div>
                    </HScrollFade>
                  </div>
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {pinnedItems.map((item, index) => (
                      <ToolCard key={`pinned-${item.originalId}`} item={item} id={item.originalId!} index={index} {...toolCardProps} />
                    ))}
                  </div>
                </section>
              )}

              {/* What's New — only visible when not searching and no group filter active */}
              {whatsNewItems.length > 0 && !searchQuery && !filterGroup && (
                <section className="space-y-3 md:space-y-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4 md:p-5">
                  <div className="flex items-center gap-3 pb-2 border-b border-amber-500/15">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                      <Wand2 size={18} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-semibold">{t('sections.whatsNew')}</h2>
                    <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {whatsNewItems.length}
                    </span>
                  </div>
                  <div className="md:hidden -mx-4 px-4">
                    <HScrollFade>
                      <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
                        {whatsNewItems.map((item, index) => (
                          <div key={`new-mobile-${item.originalId}`} className="scroll-snap-item w-[min(280px,75vw)] flex-shrink-0">
                            <ToolCard item={item} id={item.originalId!} index={index} {...toolCardProps} />
                          </div>
                        ))}
                      </div>
                    </HScrollFade>
                  </div>
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {whatsNewItems.map((item, index) => (
                      <ToolCard key={`new-${item.originalId}`} item={item} id={item.originalId!} index={index} {...toolCardProps} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recently Used — only when logged in and no search query */}
              {user && recentlyUsedItems.length > 0 && !searchQuery && (
                <section className="space-y-3 md:space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 section-header-line pb-2">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                        <Clock size={18} strokeWidth={1.5} />
                      </div>
                      <h2 className="text-xl font-semibold">{t('sections.recentlyUsed')}</h2>
                      <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                        {recentlyUsedItems.length}
                      </span>
                    </div>
                  </div>
                  {/* Horizontal scroll on mobile, grid on larger screens */}
                  <div className="md:hidden -mx-4 px-4">
                    <HScrollFade>
                      <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
                        {recentlyUsedItems.map((item, index) => (
                          <div key={`recent-mobile-${item.id}`} className="scroll-snap-item w-[min(280px,75vw)] flex-shrink-0">
                            <ToolCard item={item} id={item.id} index={index} timestamp={item.timestamp} {...toolCardProps} />
                          </div>
                        ))}
                      </div>
                    </HScrollFade>
                  </div>
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {recentlyUsedItems.map((item, index) => (
                      <ToolCard key={`recent-${item.id}`} item={item} id={item.id} index={index} timestamp={item.timestamp} {...toolCardProps} />
                    ))}
                  </div>
                </section>
              )}

              {/* Non-auth CTA — shown when logged out and not searching */}
              {!user && !searchQuery && (
                <div className="relative rounded-2xl border border-border/40 overflow-hidden">
                  {/* Ghost cards preview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 pointer-events-none select-none" aria-hidden>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3 blur-[2px] opacity-60">
                        <div className="w-8 h-8 rounded-lg bg-primary/10" />
                        <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
                        <div className="h-2.5 w-full rounded bg-muted-foreground/10" />
                        <div className="h-2.5 w-2/3 rounded bg-muted-foreground/10" />
                      </div>
                    ))}
                  </div>
                  {/* Overlay CTA */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <LogIn size={20} strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-muted-foreground text-center max-w-xs px-4">{t('loginCta.description')}</p>
                    <Button size="sm" className="rounded-xl shadow-sm" asChild>
                      <Link href="/login">{t('signIn')}</Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* All Tools / Search Results */}
              <div className="space-y-5 md:space-y-8">
                {filteredGroups.map((group, groupIndex) => (
                  <section key={`${group.title}-${group.originalGroupIndex}`} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 section-header-line pb-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          {group.icon ? <group.icon size={18} strokeWidth={1.5} /> : <Sparkles size={18} strokeWidth={1.5} />}
                        </div>
                        <h2 className="text-xl font-semibold">{groupDisplayTitle(group.title, t)}</h2>
                        <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          {group.items.reduce((acc, item) => acc + (item.items ? item.items.length : 1), 0)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                      {group.items.map((item: any, itemIndex) => (
                        <React.Fragment key={`${groupIndex}-${itemIndex}`}>
                          {/* Render search result items (flattened) */}
                          {item.originalId && (
                            <ToolCard
                              item={item}
                              id={item.originalId}
                              index={itemIndex}
                              {...toolCardProps}
                            />
                          )}

                          {/* Render nested items directly in the grid (only when not searching) */}
                          {item.items && item.items.map((subItem: ToolItem, subIndex: number) => (
                            <ToolCard
                              key={`${groupIndex}-${itemIndex}-${subIndex}`}
                              item={{ ...subItem, icon: item.icon }}
                              id={createItemId(group.originalGroupIndex, itemIndex, subIndex)}
                              index={subIndex}
                              {...toolCardProps}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </section>
                ))}
                {(searchQuery || filterGroup) && filteredGroups.length === 0 && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <p className="text-sm font-medium text-foreground">{t('noResults')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t('noResultsHint')}</p>
                    </div>
                    {popularItems.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">{t('popularTools')}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                          {popularItems.map((item, index) => (
                            <ToolCard
                              key={`popular-${item.originalId}`}
                              item={item}
                              id={item.originalId!}
                              index={index}
                              {...toolCardProps}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 rounded-2xl focus-visible:outline-none">
              {user ? (
                <DashboardAnalyticsPanel />
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-br from-primary/[0.04] via-muted/20 to-background px-6 py-12 text-center md:px-10 md:py-16">
                  <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-30" aria-hidden />
                  <div className="relative mx-auto max-w-md space-y-5">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary shadow-inner ring-1 ring-border/40">
                      <BarChart3 className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t('analytics.loginHint')}</p>
                    <Button type="button" className="rounded-xl shadow-sm" asChild>
                      <Link href="/login">{t('signIn')}</Link>
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
