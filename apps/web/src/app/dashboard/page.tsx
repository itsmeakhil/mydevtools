'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { sidebarData } from "../../components/sidebar/data/sidebar-data";
import Link, { LinkProps } from "next/link";
import { Heart, Clock, ArrowRight, Sparkles, Layers, Zap, Search, X } from 'lucide-react';
import { requiresAuth } from '@/lib/tool-config';
import { useFavoriteTool } from '@/hooks/use-favorite-tool';
import { useToolUsage } from '@/hooks/use-tool-usage';
import { motion } from 'framer-motion';
import { useMediaQuery } from "@/hooks/use-media-query";
import useAuth from "@/utils/useAuth";
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TOOL_URL_TO_KEY: Record<string, string> = {
  '/app/to-do': 'toDo',
  '/app/notes': 'notes',
  '/app/password-manager': 'passwordManager',
  '/app/bookmarks': 'bookmarks',
  '/app/api-client': 'apiClient',
  '/app/nosql-explorer': 'nosqlExplorer',
  '/app/email-validator': 'emailValidator',
};

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

const DashboardPage: React.FC = () => {
  const t = useTranslations('Dashboard');
  const { user, loading } = useAuth(false); // Dashboard shows for all users
  const { favorites, isFavorite, toggleFavorite } = useFavoriteTool();
  const { getRecentlyUsedTools } = useToolUsage();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [recentlyUsedItems, setRecentlyUsedItems] = useState<FavoriteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update favoriteItems whenever favorites change
  useEffect(() => {
    const items = favorites.map(id => {
      const item = findItemById(id);
      return item ? { id, ...item } : null;
    }).filter((item): item is FavoriteItem => {
      if (!item) return false;
      if (isMobile && item.hiddenOnMobile) return false;
      return true;
    });

    setFavoriteItems(items);
  }, [favorites, isMobile]);

  // Get recently used tools
  useEffect(() => {
    const recent = getRecentlyUsedTools(5);
    const items = recent.map(usage => {
      const item = findItemById(usage.toolId);
      return item ? { id: usage.toolId, ...item } : null;
    }).filter((item): item is FavoriteItem => {
      if (!item) return false;
      if (isMobile && item.hiddenOnMobile) return false;
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

  // Filter tools based on search query and mobile visibility
  const filteredGroups = useMemo<RenderGroup[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const mobileFilteredGroups = sidebarData.navGroups.map((group, groupIndex) => {
      if (isMobile && group.hiddenOnMobile) return null;

      const visibleItems = group.items
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => !(isMobile && item.hiddenOnMobile));

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

      const itemsToRender: RenderToolItem[] = normalizedQuery ? dedupedItems : visibleItems.map(({ item, itemIndex }) => {
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
  }, [isMobile, searchQuery]);

  // Calculate total tools count
  const totalTools = useMemo(() => {
    return sidebarData.navGroups.reduce((acc, group) => {
      return acc + group.items.reduce((itemAcc, item) => {
        return itemAcc + (item.items ? item.items.length : 1);
      }, 0);
    }, 0);
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

  // Component for rendering a tool card
  const ToolCard = ({ item, id, index }: { item: ToolItem, id: string, index: number }) => {
    const tCard = useTranslations('Dashboard');
    const tTools = useTranslations('Dashboard.tools');
    const pathname = item.url?.toString().split('?')[0] ?? '';
    const toolKey = TOOL_URL_TO_KEY[pathname];
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
        className="card-gradient-border rounded-xl"
      >
        <Link href={item.url || "#"} className="block group h-full" onClick={handleClick}>
          <Card className="glass-card border-border/30 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full min-h-[130px] md:min-h-[180px] relative overflow-hidden group-hover:-translate-y-0.5 md:group-hover:-translate-y-1.5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="p-3 md:p-5 h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start mb-2 md:mb-4">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:scale-110 transition-all duration-300 icon-container-pulse">
                  {item.icon ? <item.icon size={18} strokeWidth={1.5} className="md:w-[22px] md:h-[22px]" /> : <Sparkles size={18} strokeWidth={1.5} className="md:w-[22px] md:h-[22px]" />}
                </div>
                <div
                  className="p-2 rounded-full hover:bg-muted/80 transition-colors z-20 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(id);
                  }}
                >
                  <Heart
                    className={`transition-all duration-300 ${isFavorite(id)
                      ? "text-red-500 fill-red-500 scale-110"
                      : "text-muted-foreground/60 hover:text-red-500"}`}
                    size={16}
                  />
                </div>
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
              </div>

              <div className="mt-2 md:mt-3 flex items-center text-[10px] md:text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                {tCard('toolCard.launchTool')} <ArrowRight size={10} className="md:w-3 md:h-3 ml-1 md:ml-1.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

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
              <h1 className="text-base font-bold tracking-tight">{t('brandName')}</h1>
              <p className="text-[11px] text-muted-foreground">
                {dashboardGreeting(t)}
                {user?.displayName ? t('commaName', { name: user.displayName.split(' ')[0] }) : ''}
              </p>
            </div>
          </div>
          {/* Quick Stats in Header */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50">
              <Layers size={12} className="text-primary" />
              <span className="text-xs font-semibold">{totalTools}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50">
              <Heart size={12} className="text-red-500" />
              <span className="text-xs font-semibold">{favorites.length}</span>
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
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight gradient-text-animated">
                  {user?.displayName
                    ? t('welcomeBackNamed', { name: user.displayName.split(' ')[0] })
                    : t('welcomeBack')}
                </h1>
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
                <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl glass-card stats-glow">
                  <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-red-500/10">
                    <Heart size={14} className="md:w-4 md:h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t('stats.favorites')}</p>
                    <p className="text-xs md:text-sm font-semibold">{favorites.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky top-[56px] md:top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border/40 rounded-xl px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`${t('stats.tools')}...`}
                className="pl-9 pr-20 h-10"
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
                <span className="hidden md:inline-flex items-center rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Ctrl/⌘ K
                </span>
              </div>
            </div>
          </div>

          {/* Recently Used Tools - Only show when no search query */}
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
                <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
                  {recentlyUsedItems.map((item, index) => (
                    <div key={`recent-mobile-${item.id}`} className="scroll-snap-item w-[280px] flex-shrink-0">
                      <ToolCard item={item} id={item.id} index={index} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                {recentlyUsedItems.map((item, index) => (
                  <ToolCard key={`recent-${item.id}`} item={item} id={item.id} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* Favorites Section - Only show when no search query */}
          {user && favorites.length > 0 && !searchQuery && (
            <section className="space-y-3 md:space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 section-header-line pb-2">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                    <Heart size={18} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('sections.favorites')}</h2>
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {favoriteItems.length}
                  </span>
                </div>
              </div>
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="md:hidden -mx-4 px-4">
                <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
                  {favoriteItems.map((item, index) => (
                    <div key={`fav-mobile-${item.id}`} className="scroll-snap-item w-[280px] flex-shrink-0">
                      <ToolCard item={item} id={item.id} index={index} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
                {favoriteItems.map((item, index) => (
                  <ToolCard key={`fav-${item.id}`} item={item} id={item.id} index={index} />
                ))}
              </div>
            </section>
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
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {group.items.map((item: any, itemIndex) => (
                    <React.Fragment key={`${groupIndex}-${itemIndex}`}>
                      {/* Render search result items (flattened) */}
                      {item.originalId && (
                        <ToolCard
                          item={item}
                          id={item.originalId}
                          index={itemIndex}
                        />
                      )}

                      {/* Render nested items directly in the grid (only when not searching) */}
                      {item.items && item.items.map((subItem: ToolItem, subIndex: number) => (
                        <ToolCard
                          key={`${groupIndex}-${itemIndex}-${subIndex}`}
                          item={{ ...subItem, icon: item.icon }}
                          id={createItemId(group.originalGroupIndex, itemIndex, subIndex)}
                          index={subIndex}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </section>
            ))}
            {searchQuery && filteredGroups.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm font-medium text-foreground">{t('toolCard.defaultDescription')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{searchQuery}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;