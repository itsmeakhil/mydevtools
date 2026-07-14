import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SNIPPET_LANGUAGE_AUTO } from "@/lib/snippet-language";

/** In-memory fallback so `persist` always attaches `api.persist` during SSR (no `window`). */
function noopStorage(): Storage {
  const s = new Map<string, string>();
  return {
    get length() {
      return s.size;
    },
    clear: () => s.clear(),
    getItem: (key) => s.get(key) ?? null,
    key: (i) => [...s.keys()][i] ?? null,
    removeItem: (key) => {
      s.delete(key);
    },
    setItem: (key, value) => {
      s.set(key, value);
    },
  };
}

const snippetPersistStorage = createJSONStorage(() => {
  if (typeof window === "undefined") return noopStorage();
  try {
    return window.localStorage;
  } catch {
    return noopStorage();
  }
});

export interface CodeSnippet {
  id: string;
  title: string;
  /** Monaco id or "auto" */
  language: string;
  code: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface SnippetManagerState {
  snippets: CodeSnippet[];
  addSnippet: (overrides?: Partial<CodeSnippet>) => string;
  updateSnippet: (id: string, patch: Partial<Omit<CodeSnippet, "id">>) => void;
  removeSnippet: (id: string) => void;
  importSnippets: (snippets: CodeSnippet[]) => void;
  mergeSnippetFromRemote: (snippet: CodeSnippet) => void;
}

export const useSnippetManagerStore = create<SnippetManagerState>()(
  persist(
    (set) => ({
      snippets: [],
      addSnippet: (overrides) => {
        const now = Date.now();
        const id = overrides?.id ?? newId();
        const snippet: CodeSnippet = {
          id,
          title: overrides?.title ?? "Untitled snippet",
          language: overrides?.language ?? SNIPPET_LANGUAGE_AUTO,
          code: overrides?.code ?? "",
          tags: overrides?.tags ?? [],
          pinned: overrides?.pinned ?? false,
          createdAt: overrides?.createdAt ?? now,
          updatedAt: overrides?.updatedAt ?? now,
        };
        set((s) => ({ snippets: [snippet, ...s.snippets] }));
        return id;
      },
      updateSnippet: (id, patch) => {
        set((s) => ({
          snippets: s.snippets.map((sn) =>
            sn.id === id
              ? {
                  ...sn,
                  ...patch,
                  updatedAt: Date.now(),
                }
              : sn
          ),
        }));
      },
      removeSnippet: (id) => {
        set((s) => ({ snippets: s.snippets.filter((sn) => sn.id !== id) }));
      },
      importSnippets: (snippets) => {
        set({ snippets });
      },
      mergeSnippetFromRemote: (snippet) => {
        set((s) => {
          const i = s.snippets.findIndex((x) => x.id === snippet.id);
          if (i === -1) {
            return { snippets: [snippet, ...s.snippets] };
          }
          const next = [...s.snippets];
          next[i] = snippet;
          return { snippets: next };
        });
      },
    }),
    {
      name: "snippet-manager-storage-v1",
      storage: snippetPersistStorage,
      // Zero-knowledge: never persist plaintext `code` to webview localStorage
      // (that store lives outside the SQLCipher DB). Metadata stays for instant
      // list render; code re-hydrates decrypted from the encrypted store on load.
      partialize: (s) => ({
        snippets: s.snippets.map((sn) => ({ ...sn, code: "" })),
      }),
      // Bump: v1 blobs persisted plaintext code. Strip it on rehydrate so any
      // pre-encryption cache is wiped immediately, not just on the next write.
      version: 2,
      migrate: (persisted) => {
        const p = persisted as { snippets?: CodeSnippet[] } | undefined;
        return { snippets: (p?.snippets ?? []).map((sn) => ({ ...sn, code: "" })) };
      },
    }
  )
);

export function selectSnippetById(
  snippets: CodeSnippet[],
  id: string | null
): CodeSnippet | undefined {
  if (!id) return undefined;
  return snippets.find((s) => s.id === id);
}
