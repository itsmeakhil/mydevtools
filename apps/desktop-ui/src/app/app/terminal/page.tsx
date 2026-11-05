"use client";
import { useTranslations } from "next-intl";
import { TerminalLayout } from "@/components/terminal/terminal-layout";
import { isDesktop } from "@/lib/desktop/is-desktop";

export default function TerminalPage() {
  const t = useTranslations("Terminal");
  if (!isDesktop()) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{t("desktopOnly")}</p>;
  }
  return <TerminalLayout />;
}
