"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NavCollapsible, NavItem, NavLink } from "./types"; // Import types
import useAuth from "@/utils/useAuth"; // Import useAuth
import { useTranslations } from "next-intl";
import { requiresAuth } from "@/lib/tool-config";
import { getToolMessageKey } from "@/lib/tool-i18n";
import { Star } from "lucide-react";
import { usePinnedToolsStore, usePinnedToolsForActiveWorkspace } from "@/store/pinned-tools-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useToolPermission } from "@/lib/workspace-rbac";
import { useActiveWorkspace } from "@/store/workspace-store";
import { sidebarUrlToToolSlug } from "@/lib/sidebar-tool-slug";

// Define the props interface for NavGroup
interface NavGroupProps {
  title: string;
  titleKey?: string;
  items: (NavLink | NavCollapsible)[];
  collapsible?: boolean;
  icon?: React.ElementType;
  hiddenOnMobile?: boolean;
}

/**
 * Role-gated wrapper around a single NavLink item.
 * For non-/app URLs or personal workspaces, always renders.
 * For shared workspaces, hides the link when the active role lacks "read".
 */
function NavLinkGated({
  item,
  href,
  onClick,
}: {
  item: NavLink;
  href: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const itemUrl = typeof item.url === "string" ? item.url : item.url.toString();
  const slug = sidebarUrlToToolSlug(itemUrl);
  const canRead = useToolPermission(slug ?? "", "read");
  const activeWs = useActiveWorkspace();

  // Non-matrix URLs (e.g. /dashboard) and personal workspaces always render.
  if (!slug || activeWs?.is_personal) {
    return <SidebarMenuLink item={item} href={href} onClick={onClick} />;
  }
  if (!canRead) return null;
  return <SidebarMenuLink item={item} href={href} onClick={onClick} />;
}

// Main NavGroup Component
export function NavGroup({ title, titleKey, items, collapsible, icon: Icon, hiddenOnMobile }: NavGroupProps) {
  const { state, isMobile } = useSidebar();
  const pathname = usePathname();
  const { user, loading } = useAuth(false); // Check auth state with loading
  const tNav = useTranslations("Navigation");
  const groupTitle = titleKey ? tNav(titleKey as never) : title;

  // Drop collapsible groups that ended up with no children.
  const visibleItems = items.filter((item) => {
    if ("items" in item && Array.isArray((item as NavCollapsible).items) && (item as NavCollapsible).items.length === 0) return false;
    return true;
  });

  if (visibleItems.length === 0) {
    return null;
  }

  // Use centralized requiresAuth function from tool-config

  const handleClick = (e: React.MouseEvent, url: string) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!user && requiresAuth(url)) {
      e.preventDefault();
      window.location.href = "/login";
    }
  };

  const content = (
    <SidebarMenu>
      {visibleItems.map((item) => {
        const key = `${item.title}-${item.url}`;

        if (!("items" in item)) {
          const itemUrl =
            typeof item.url === "string" ? item.url : item.url.toString();
          return (
            <NavLinkGated
              key={key}
              item={item as NavLink}
              href={pathname}
              onClick={(e) => handleClick(e, itemUrl)}
            />
          );
        }

        if (state === "collapsed") {
          return (
            <SidebarMenuCollapsedDropdown
              key={key}
              item={item as NavCollapsible}
              href={pathname}
            />
          );
        }

        return (
          <SidebarMenuCollapsible
            key={key}
            item={item as NavCollapsible}
            href={pathname}
          />
        );
      })}
    </SidebarMenu>
  );

  if (collapsible) {
    return (
      <Collapsible asChild defaultOpen={false} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild className="group-data-[collapsible=icon]:!mt-0 group-data-[collapsible=icon]:!opacity-100">
            <CollapsibleTrigger suppressHydrationWarning>
              {Icon && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Icon className="mr-2 group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:size-4" size={16} />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" className="capitalize">{groupTitle}</TooltipContent>
                </Tooltip>
              )}
              <span className="group-data-[collapsible=icon]:hidden">{groupTitle}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent suppressHydrationWarning>
            <SidebarGroupContent>
              {content}
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        {Icon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Icon className="mr-2 opacity-70" size={15} />
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="capitalize">{groupTitle}</TooltipContent>
          </Tooltip>
        )}
        {groupTitle}
      </SidebarGroupLabel>
      {content}
    </SidebarGroup>
  );
}

// SidebarMenuLink Component
const SidebarMenuLink = ({
  item,
  href,
  onClick,
}: {
  item: NavLink;
  href: string;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const { setOpenMobile, state } = useSidebar();
  const tNav = useTranslations("Navigation");
  const togglePinKeyed = usePinnedToolsStore((s) => s.togglePin);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const togglePin = (url: string) => {
    if (activeWorkspaceId) togglePinKeyed(activeWorkspaceId, url)
  };
  const pinnedTools = usePinnedToolsForActiveWorkspace();
  const itemUrl =
    typeof item.url === "string" ? item.url : item.url.toString();
  const toolKey = getToolMessageKey(itemUrl);
  const displayTitle = toolKey ? tNav(toolKey as never) : item.title;
  const isPinned = pinnedTools.includes(itemUrl);

  const isActive = checkIsActive(href, item);

  return (
    <SidebarMenuItem className="relative group">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={displayTitle}
        className={cn("transition-all duration-200", isActive && "bg-transparent dark:bg-transparent hover:bg-transparent")}
      >
        <Link
          href={item.url}
          onClick={(e) => {
            onClick(e);
            // setOpenMobile(false); // Uncomment if you want to close mobile sidebar on click
          }}
          className="relative flex items-center"
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-0 -z-10 rounded-md bg-gradient-to-r from-primary/15 to-primary/[0.03] ring-1 ring-inset ring-primary/15 dark:from-primary/25 dark:to-primary/5"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-violet-500" />
            </motion.div>
          )}
          {item.icon && (
            <item.icon className={cn("z-10 transition-colors", isActive && "text-primary")} />
          )}
          <span
            className={cn(
              "z-10 font-medium transition-transform group-hover:translate-x-0.5",
              isActive && "text-primary",
            )}
          >
            {displayTitle}
          </span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
      {state !== "collapsed" && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePin(itemUrl);
          }}
          aria-label={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 z-10 p-0.5 rounded transition-all duration-150 cursor-pointer",
            "opacity-0 group-hover:opacity-100",
            isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className={cn("h-3 w-3", isPinned && "fill-primary")} />
        </button>
      )}
    </SidebarMenuItem>
  );
};

// SidebarMenuCollapsible Component
const SidebarMenuCollapsible = ({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) => {
  const { setOpenMobile } = useSidebar();
  const { user, loading } = useAuth(false);
  const tNav = useTranslations("Navigation");
  const parentLabel = item.titleKey ? tNav(item.titleKey as never) : item.title;

  // Use centralized requiresAuth function from tool-config

  const handleSubLinkClick = (e: React.MouseEvent, subUrl: string) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!user && requiresAuth(subUrl)) {
      e.preventDefault();
      window.location.href = "/login";
    }
  };

  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={parentLabel}>
            {item.icon && <item.icon />}
            <span>{parentLabel}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <div suppressHydrationWarning>
          <CollapsibleContent className="CollapsibleContent">
            <SidebarMenuSub>
              {item.items.map((subItem) => {
                const subItemUrl =
                  typeof subItem.url === "string"
                    ? subItem.url
                    : subItem.url.toString();
                const isSubActive = checkIsActive(href, subItem);
                
                return (
                  <SidebarMenuSubItem key={subItem.title} className="relative group/sub">
                    <SidebarMenuSubButton
                      asChild
                      isActive={isSubActive}
                      className={cn("transition-all duration-200", isSubActive && "bg-transparent hover:bg-transparent")}
                    >
                      <Link
                        href={subItem.url}
                        onClick={(e) => {
                          handleSubLinkClick(e, subItemUrl);
                          setOpenMobile(false);
                        }}
                        className="relative flex items-center pl-4 overflow-hidden"
                      >
                        {isSubActive && (
                          <>
                            <motion.div
                              layoutId="sidebar-sub-active-pill"
                              className="absolute inset-0 rounded-md bg-primary/5 dark:bg-primary/10 -z-10"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                            <motion.div
                              layoutId="sidebar-sub-active-border"
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-primary rounded-full transition-all duration-300"
                            />
                          </>
                        )}
                        {subItem.icon && <subItem.icon className="z-10" />}
                        <span className="z-10 font-medium group-hover/sub:translate-x-0.5 transition-transform">{subItem.title}</span>
                        {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </div>
      </SidebarMenuItem>
    </Collapsible>
  );
};

// SidebarMenuCollapsedDropdown Component
const SidebarMenuCollapsedDropdown = ({
  item,
  href,
}: {
  item: NavCollapsible;
  href: string;
}) => {
  const { user, loading } = useAuth(false);
  const tNav = useTranslations("Navigation");
  const parentLabel = item.titleKey ? tNav(item.titleKey as never) : item.title;

  // Use centralized requiresAuth function from tool-config

  const handleSubLinkClick = (e: React.MouseEvent, subUrl: string) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!user && requiresAuth(subUrl)) {
      e.preventDefault();
      window.location.href = "/login";
    }
  };

  return (
    <SidebarMenuItem suppressHydrationWarning>
      <div suppressHydrationWarning>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={parentLabel}
              isActive={checkIsActive(href, item)}
            >
              {item.icon && <item.icon />}
              <span>{parentLabel}</span>
              {item.badge && <NavBadge>{item.badge}</NavBadge>}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={4}>
            <DropdownMenuLabel>
              {parentLabel} {item.badge ? `(${item.badge})` : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.items.map((sub) => {
              const subUrl =
                typeof sub.url === "string" ? sub.url : sub.url.toString();
              return (
                <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                  <Link
                    href={sub.url}
                    className={`${checkIsActive(href, sub) ? "bg-secondary" : ""}`}
                    onClick={(e) => handleSubLinkClick(e, subUrl)}
                  >
                    {sub.icon && <sub.icon />}
                    <span className="max-w-52 text-wrap">{sub.title}</span>
                    {sub.badge && (
                      <span className="ml-auto text-xs">{sub.badge}</span>
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </SidebarMenuItem>
  );
};

// Helper Components and Functions
const NavBadge = ({ children }: { children: ReactNode }) => (
  <Badge className="text-xs rounded-full px-1 py-0">{children}</Badge>
);

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url ||
    href.split("?")[0] === item.url ||
    !!item?.items?.filter((i) => i.url === href).length ||
    (mainNav &&
      href.split("/")[1] !== "" &&
      href.split("/")[1] ===
      (typeof item.url === "string" ? item.url.split("/")[1] : ""))
  );
}