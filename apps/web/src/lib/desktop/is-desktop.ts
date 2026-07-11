/**
 * Desktop (Tauri) detection.
 *
 * `process.env.NEXT_PUBLIC_TAURI` is inlined at build time, so in web builds
 * this whole function is `false` and every desktop branch behind it is
 * dead-code-eliminated — the web bundle stays byte-identical.
 */
export function isDesktop(): boolean {
  return (
    process.env.NEXT_PUBLIC_TAURI === "1" &&
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}
