'use client';

import { useCallback, useState } from 'react';

/** Id-keyed copy-feedback flash (1.6s). Use for grids of copyable cells. */
export function useCopyFeedback() {
  const [key, setKey] = useState<string | null>(null);
  const flash = useCallback((id: string) => {
    setKey(id);
    setTimeout(() => setKey(null), 1600);
  }, []);
  return { key, flash };
}
