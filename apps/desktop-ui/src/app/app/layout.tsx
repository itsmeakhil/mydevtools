import { Suspense } from "react";
import { AppContent } from "./app-content";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // Suspense boundary so tool pages that read useSearchParams() (base64,
    // jwt-decoder, hash-generator, url-encode, json-formatter, qr-code) pass
    // the static export prerender instead of erroring on a CSR bailout.
    <AppContent>
      <Suspense fallback={null}>{children}</Suspense>
    </AppContent>
  );
}
