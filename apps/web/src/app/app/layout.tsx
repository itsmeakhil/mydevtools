import { cookies, headers } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppContent } from "./app-content";
import { ToolJsonLd } from "@/components/seo/tool-json-ld";
import { toolSlugFromPathname } from "@/lib/seo/structured-data";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value !== "false";
  const headerList = await headers();
  const pathname = headerList.get("x-mdt-pathname") ?? "";
  const toolSlug = toolSlugFromPathname(pathname);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ToolJsonLd slug={toolSlug} />
      <AppContent>{children}</AppContent>
    </SidebarProvider>
  );
}
