import { Suspense } from "react";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppContent } from "./app-content";

// Static export (Tauri desktop) cannot use request APIs; fall back to defaults there.
const isTauriBuild = process.env.TAURI_BUILD === "1";

export default async function Layout({ children }: { children: React.ReactNode }) {
  let defaultOpen = true;
  if (!isTauriBuild) {
    const cookieStore = await cookies();
    defaultOpen = cookieStore.get("sidebar:state")?.value !== "false";
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* Suspense boundary so tool pages that read useSearchParams() (base64,
          jwt-decoder, hash-generator, url-encode, json-formatter, qr-code) pass
          the static export prerender instead of erroring on a CSR bailout. */}
      <AppContent>
        <Suspense fallback={null}>{children}</Suspense>
      </AppContent>
    </SidebarProvider>
  );
}
