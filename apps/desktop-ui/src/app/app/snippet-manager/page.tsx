"use client";
import { SnippetManagerTool } from "@/components/snippet-manager/snippet-manager-tool";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton";

export default function SnippetManagerPage() {
  // Zero-knowledge: snippet code is encrypted with the master password. Gate the
  // tool until the vault is unlocked (mirrors password-manager / env-manager).
  const { isUnlocked, isRestoring } = useVaultGuard();
  if (isRestoring) return <VaultRestoringSkeleton />;
  if (!isUnlocked) return <VaultLockedPlaceholder appName="Snippet Manager" />;
  return <SnippetManagerTool />;
}
