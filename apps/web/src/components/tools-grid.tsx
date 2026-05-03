"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { sidebarData } from "@/components/sidebar/data/sidebar-data";
import { toolsMetadata } from "@/lib/metadata";
import { toolCategoryMap } from "@/lib/tool-categories";

type ToolEntry = {
  slug: string;
  title: string;
  description: string;
  icon?: React.ElementType;
  category: string;
};

type CategoryEntry = {
  title: string;
  icon?: React.ElementType;
  tools: ToolEntry[];
};

const gradients = [
  "from-sky-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-indigo-500 to-blue-400",
] as const;

function buildCategories(): CategoryEntry[] {
  const out: CategoryEntry[] = [];
  for (const group of sidebarData.navGroups) {
    const tools: ToolEntry[] = [];
    for (const item of group.items) {
      const subItems = "items" in item && item.items?.length ? item.items : [];
      const entries = subItems.length > 0 ? subItems : ["url" in item ? [item] : []].flat();
      for (const entry of entries.length > 0 ? entries : "url" in item ? [item] : []) {
        if (!("url" in entry) || !entry.url) continue;
        const url = typeof entry.url === "string" ? entry.url : String(entry.url);
        const slug = url.replace(/^\/app\//, "");
        if (slug.startsWith("break-room")) continue;
        if (!toolsMetadata[slug]) continue;
        tools.push({
          slug,
          title: toolsMetadata[slug].title,
          description: toolsMetadata[slug].description,
          icon: entry.icon ?? ("icon" in item ? item.icon : undefined),
          category: group.title,
        });
      }
    }
    if (tools.length) out.push({ title: group.title, icon: group.icon, tools });
  }
  return out;
}

const categories = buildCategories();
const allTools: ToolEntry[] = categories.flatMap((c) => c.tools);

export function ToolsGrid() {
  const [activeCategory, setActiveCategory] = useState("All");

  const visibleTools = useMemo(
    () => activeCategory === "All" ? allTools : allTools.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 md:mb-10">
        {[
          { key: "All", count: allTools.length, icon: undefined as React.ElementType | undefined },
          ...categories.map((c) => ({ key: c.title, count: c.tools.length, icon: c.icon })),
        ].map((pill) => {
          const active = activeCategory === pill.key;
          const Icon = pill.icon;
          return (
            <button
              key={pill.key}
              onClick={() => setActiveCategory(pill.key)}
              aria-pressed={active}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 active:scale-[0.97] ${
                active
                  ? "bg-foreground text-background border-foreground shadow-md"
                  : "glass-overlay text-foreground hover:border-border/70 hover:scale-[1.02]"
              }`}
            >
              {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
              <span>{pill.key}</span>
              <span className={`text-xs tabular-nums ${active ? "opacity-80" : "text-muted-foreground"}`}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <AnimatePresence mode="popLayout">
          {visibleTools.map((tool, i) => {
            const g = gradients[i % gradients.length];
            const Icon = tool.icon;
            return (
              <motion.div
                key={tool.slug}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, delay: Math.min(i * 0.02, 0.18) }}
              >
                <Link
                  href={`/tools/${tool.slug}`}
                  className="group block h-full rounded-xl glass-overlay p-4 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-300"
                >
                  <div className="flex gap-3 items-start">
                    {Icon && (
                      <div className={`shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${g} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                        <Icon className="w-5 h-5 text-white" stroke={1.75} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base mb-0.5 flex items-center gap-1.5">
                        {tool.title}
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
