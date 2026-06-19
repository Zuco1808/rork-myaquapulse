import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createReading } from '@/lib/api/readings';
import { processSyncBatch } from '@/lib/logic/offline-sync';

const KEY = 'offline_reading_queue_v1';

export interface QueuedReading {
  localId: string;
  connection_id: string;
  utility_id: string;
  reading_value: number;
  reading_type: string;
  note?: string;
  meterSerial?: string;   // za prikaz u listi čekanja
  createdAt: number;
}

const read = async (): Promise<QueuedReading[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const write = async (items: QueuedReading[]): Promise<void> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
};

export const isOnline = async (): Promise<boolean> => {
  const s = await NetInfo.fetch();
  return s.isConnected !== false;
};

/** Dodaje očitanje u offline red. */
export const enqueueReading = async (
  r: Omit<QueuedReading, 'localId' | 'createdAt'>,
): Promise<void> => {
  const items = await read();
  items.push({ ...r, localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() });
  await write(items);
};

export const getQueue = async (): Promise<QueuedReading[]> => read();

export const getQueueCount = async (): Promise<number> => (await read()).length;

export const clearQueue = async (): Promise<void> => { await AsyncStorage.removeItem(KEY); };

/**
 * Šalje sve zapise iz reda na server. Uspješne uklanja; neuspješne zbog mreže
 * zadržava. Zapise koji padnu zbog validacije (npr. očitanje manje od prethodnog)
 * uklanja i prijavljuje kao neuspjele.
 * Vraća { synced, failed }.
 */
export const syncQueue = async (): Promise<{ synced: number; failed: number }> => {
  if (!(await isOnline())) return { synced: 0, failed: 0 };

  const items = await read();
  if (items.length === 0) return { synced: 0, failed: 0 };

  const outcome = await processSyncBatch(items, (item) =>
    createReading({
      connection_id: item.connection_id,
      utility_id:    item.utility_id,
      reading_value: item.reading_value,
      reading_type:  item.reading_type,
      note:          item.note,
    }).then(() => undefined),
  );

  await write(outcome.remaining);
  return { synced: outcome.synced, failed: outcome.failed };
};
