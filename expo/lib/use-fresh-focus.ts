import { useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Wraps useFocusEffect with a TTL so the callback only runs when the screen
 * gains focus AND the cached data is older than `ttlMs` milliseconds.
 *
 * Pull-to-refresh and post-mutation fetches bypass the TTL (they call
 * fetchData directly, not through this hook).
 *
 * Default TTL: 30 seconds — enough to survive tab-switching without
 * triggering unnecessary API calls.
 *
 * Usage:
 *   useFreshFocus(fetchData, { ttlMs: 30_000 });
 */
export function useFreshFocus(
  callback: () => void | Promise<void>,
  { ttlMs = 30_000 }: { ttlMs?: number } = {},
) {
  const lastFetchAt  = useRef<number>(0);
  const callbackRef  = useRef(callback);
  callbackRef.current = callback; // always points to latest closure

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchAt.current >= ttlMs) {
        lastFetchAt.current = now;
        callbackRef.current();
      }
    }, [ttlMs]),
  );
}
