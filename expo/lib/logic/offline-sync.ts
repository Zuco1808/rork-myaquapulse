/**
 * Čista logika sinkronizacije offline reda (bez AsyncStorage/NetInfo) —
 * testabilna. Odlučuje koje zapise zadržati (mrežna greška) a koje odbaciti
 * (validaciona/trajna greška).
 */

/** Je li greška mrežne prirode (privremena → vrijedi pokušati kasnije)? */
export function isNetworkError(message: unknown): boolean {
  const m = String(message ?? '').toLowerCase();
  return (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('connection') ||
    m.includes('offline')
  );
}

export interface SyncOutcome<T> {
  synced: number;
  failed: number;
  remaining: T[];
}

/**
 * Pokušava poslati svaki zapis preko injektovane `send` funkcije.
 *  - uspjeh → synced
 *  - mrežna greška → ostaje u `remaining` (pokušaj kasnije)
 *  - ostala greška (npr. validacija) → failed (ne ponavlja se)
 */
export async function processSyncBatch<T>(
  items: T[],
  send: (item: T) => Promise<void>,
): Promise<SyncOutcome<T>> {
  const remaining: T[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await send(item);
      synced++;
    } catch (e: any) {
      if (isNetworkError(e?.message)) remaining.push(item);
      else failed++;
    }
  }

  return { synced, failed, remaining };
}
