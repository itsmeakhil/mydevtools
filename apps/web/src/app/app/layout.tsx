import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppContent } from "./app-content";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppContent>{children}</AppContent>
    </SidebarProvider>
  );
}
