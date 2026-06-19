import { isNetworkError, processSyncBatch } from '@/lib/logic/offline-sync';

describe('isNetworkError (klasifikacija greške)', () => {
  it('prepoznaje mrežne greške', () => {
    expect(isNetworkError('Network request failed')).toBe(true);
    expect(isNetworkError('TypeError: Failed to fetch')).toBe(true);
    expect(isNetworkError('Request timeout')).toBe(true);
    expect(isNetworkError('connection reset')).toBe(true);
    expect(isNetworkError('Device is offline')).toBe(true);
  });

  it('validacione/ostale greške nisu mrežne', () => {
    expect(isNetworkError('Novo očitanje ne smije biti manje od prethodnog')).toBe(false);
    expect(isNetworkError('duplicate key value')).toBe(false);
    expect(isNetworkError('permission denied')).toBe(false);
  });

  it('robustan na null/undefined/prazno', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError('')).toBe(false);
  });

  it('case-insensitive', () => {
    expect(isNetworkError('NETWORK ERROR')).toBe(true);
  });
});

describe('processSyncBatch (sinkronizacija reda)', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('svi uspješni → synced, prazan remaining', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const r = await processSyncBatch(items, send);
    expect(r.synced).toBe(3);
    expect(r.failed).toBe(0);
    expect(r.remaining).toHaveLength(0);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('mrežna greška → zapis ostaje u remaining (pokušaj kasnije)', async () => {
    const send = jest.fn().mockRejectedValue(new Error('Network request failed'));
    const r = await processSyncBatch(items, send);
    expect(r.synced).toBe(0);
    expect(r.failed).toBe(0);
    expect(r.remaining).toEqual(items);
  });

  it('validaciona greška → failed, NE ostaje u remaining (ne ponavlja se)', async () => {
    const send = jest.fn().mockRejectedValue(new Error('očitanje manje od prethodnog'));
    const r = await processSyncBatch(items, send);
    expect(r.synced).toBe(0);
    expect(r.failed).toBe(3);
    expect(r.remaining).toHaveLength(0);
  });

  it('miješan ishod: uspjeh + mreža + validacija', async () => {
    const send = jest.fn()
      .mockResolvedValueOnce(undefined)                              // a → synced
      .mockRejectedValueOnce(new Error('fetch failed'))             // b → remaining
      .mockRejectedValueOnce(new Error('invalid value'));          // c → failed
    const r = await processSyncBatch(items, send);
    expect(r.synced).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.remaining).toEqual([{ id: 'b' }]);
  });

  it('prazan red → ništa', async () => {
    const send = jest.fn();
    const r = await processSyncBatch([], send);
    expect(r).toEqual({ synced: 0, failed: 0, remaining: [] });
    expect(send).not.toHaveBeenCalled();
  });
});
