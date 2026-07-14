import { cookies, headers } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppContent } from "./app-content";
import { ToolJsonLd } from "@/components/seo/tool-json-ld";
import { toolSlugFromPathname } from "@/lib/seo/structured-data";

// Static export (Tauri desktop) cannot use request APIs; fall back to defaults there.
const isTauriBuild = process.env.TAURI_BUILD === "1";

export default async function Layout({ children }: { children: React.ReactNode }) {
  let defaultOpen = true;
  let pathname = "";
  if (!isTauriBuild) {
    const cookieStore = await cookies();
    defaultOpen = cookieStore.get("sidebar:state")?.value !== "false";
    const headerList = await headers();
    pathname = headerList.get("x-mdt-pathname") ?? "";
  }
  const toolSlug = toolSlugFromPathname(pathname);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ToolJsonLd slug={toolSlug} />
      <AppContent>{children}</AppContent>
    </SidebarProvider>
  );
}
