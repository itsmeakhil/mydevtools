"use client";
import { useTranslations } from "next-intl";
import { SecureFilesTool } from "@/components/secure-files/secure-files-tool";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton";
import { isDesktop } from "@/lib/desktop/is-desktop";

export default function SecureFilesPage() {
  const t = useTranslations("SecureFiles");
  // Files are encrypted with a key derived from the master password; the
  // Rust side only holds that key while the vault is unlocked.
  const { isUnlocked, isRestoring } = useVaultGuard();
  if (!isDesktop()) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{t("desktopOnly")}</p>;
  }
  if (isRestoring) return <VaultRestoringSkeleton />;
  if (!isUnlocked) return <VaultLockedPlaceholder appName={t("title")} />;
  return <SecureFilesTool />;
}
