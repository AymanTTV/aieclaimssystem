// src/hooks/usePersistentPagination.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PaginationState {
  pageIndex: number; // zero-based
  pageSize: number;
}

const DEFAULT: PaginationState = { pageIndex: 0, pageSize: 10 };

export function usePersistentPagination(
  storageKey: string,
  initial: Partial<PaginationState> = {}
) {
  const key = `pagination:${storageKey}`;
  const loadedOnce = useRef(false);

  const [state, setState] = useState<PaginationState>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT, ...initial };
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as PaginationState;
    } catch {}
    return { ...DEFAULT, ...initial };
  });

  useEffect(() => {
    if (!loadedOnce.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  useEffect(() => {
    loadedOnce.current = true;
  }, []);

  const setPageIndex = useCallback(
    (pageIndex: number) => setState((s) => ({ ...s, pageIndex })),
    []
  );
  const setPageSize = useCallback(
    (pageSize: number) =>
      setState((s) => ({
        pageSize,
        pageIndex: Math.floor((s.pageIndex * s.pageSize) / Math.max(1, pageSize)),
      })),
    []
  );

  return useMemo(
    () => ({
      pagination: state,
      setPagination: setState,
      setPageIndex,
      setPageSize,
    }),
    [state, setPageIndex, setPageSize]
  );
}
