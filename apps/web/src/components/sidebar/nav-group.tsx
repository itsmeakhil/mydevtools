"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
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
import { useToolVisibility } from "@/hooks/use-tool-visibility";
import { getToolMessageKey } from "@/lib/tool-i18n";

// Define the props interface for NavGroup
interface NavGroupProps {
  title: string;
  items: (NavLink | NavCollapsible)[];
  collapsible?: boolean;
  icon?: React.ElementType;
  hiddenOnMobile?: boolean;
}

// Main NavGroup Component
export function NavGroup({ title, items, collapsible, icon: Icon, hiddenOnMobile }: NavGroupProps) {
  const { state, isMobile } = useSidebar();
  const pathname = usePathname();
  const { user, loading } = useAuth(false); // Check auth state with loading
  const { isToolEnabled } = useToolVisibility();

  // Filter items based on mobile state and tool availability
  const visibleItems = items
    .filter((item) => {
      if (isMobile && item.hiddenOnMobile) return false;
      
      const itemUrl = typeof item.url === "string" ? item.url : item.url?.toString() || '';
      if (itemUrl.startsWith('/app/') && !isToolEnabled(itemUrl)) {
        return false;
      }
      return true;
    })
    .map((item) => {
      if ("items" in item && Array.isArray((item as NavCollapsible).items)) {
        return {
          ...item,
          items: (item as NavCollapsible).items.filter((sub) => {
            const subUrl = typeof sub.url === "string" ? sub.url : sub.url?.toString() || '';
            if (subUrl.startsWith('/app/') && !isToolEnabled(subUrl)) {
              return false;
            }
            return true;
          })
        };
      }
      return item;
    })
    .filter((item) => {
      if ("items" in item && Array.isArray((item as NavCollapsible).items) && (item as NavCollapsible).items.length === 0) return false;
      return true;
    });

  // If group is hidden on mobile or has no visible items, don't render
  if ((isMobile && hiddenOnMobile) || visibleItems.length === 0) {
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
            <SidebarMenuLink
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
                  <TooltipContent side="right" align="center" className="capitalize">{title}</TooltipContent>
                </Tooltip>
              )}
              <span className="group-data-[collapsible=icon]:hidden">{title}</span>
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
      <SidebarGroupLabel>
        {Icon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Icon className="mr-2" size={16} />
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="capitalize">{title}</TooltipContent>
          </Tooltip>
        )}
        {title}
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
  const { setOpenMobile } = useSidebar();
  const tNav = useTranslations("Navigation");
  const itemUrl =
    typeof item.url === "string" ? item.url : item.url.toString();
  const toolKey = getToolMessageKey(itemUrl);
  const displayTitle = toolKey ? tNav(toolKey as never) : item.title;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={displayTitle}
      >
        <Link
          href={item.url}
          onClick={(e) => {
            onClick(e);
            // setOpenMobile(false); // Uncomment if you want to close mobile sidebar on click
          }}
          className="relative flex items-center"
        >
          {item.icon && <item.icon />}
          <span>{displayTitle}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
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
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
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
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={checkIsActive(href, subItem)}
                    >
                      <Link
                        href={subItem.url}
                        onClick={(e) => {
                          handleSubLinkClick(e, subItemUrl);
                          setOpenMobile(false);
                        }}
                      >
                        {subItem.icon && <subItem.icon />}
                        <span>{subItem.title}</span>
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
              tooltip={item.title}
              isActive={checkIsActive(href, item)}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
              {item.badge && <NavBadge>{item.badge}</NavBadge>}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={4}>
            <DropdownMenuLabel>
              {item.title} {item.badge ? `(${item.badge})` : ""}
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