import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueueCount, syncQueue } from './reading-queue';

/**
 * Prati offline red očitanja: broj na čekanju, auto-sinkronizacija pri
 * povratku konekcije, i ručni sync. Vrati i refresh() za osvježenje brojača
 * nakon dodavanja u red.
 */
export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ synced: number; failed: number } | null>(null);
  const wasOffline = useRef(false);

  const refresh = useCallback(async () => {
    setPending(await getQueueCount());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await syncQueue();
      if (res.synced > 0 || res.failed > 0) setLastResult(res);
      await refresh();
      return res;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const unsub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      // Pri prelasku offline → online, automatski sinkronizuj
      if (wasOffline.current && !offline) {
        sync();
      }
      wasOffline.current = offline;
    });
    return unsub;
  }, [refresh, sync]);

  return { pending, syncing, lastResult, sync, refresh };
}
