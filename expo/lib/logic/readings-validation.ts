/**
 * Čista logika validacije i obračuna očitanja (kumulativna brojila).
 * Usklađeno s DB trigerom validate_reading_not_lower i getReadingById.
 */

export interface ReadingPoint {
  id: string;
  reading_value: number;
  reading_date: string;  // 'YYYY-MM-DD'
  created_at: string;    // ISO
}

/** Validno ako nema prethodnog ILI novo >= prethodno (brojilo ne ide unazad). */
export function isReadingNotLower(newValue: number, previousValue: number | null): boolean {
  if (previousValue == null) return true;
  return newValue >= previousValue;
}

/** Potrošnja = novo − prethodno (nikad negativna; null ako nema prethodnog). */
export function computeConsumption(newValue: number, previousValue: number | null): number | null {
  if (previousValue == null) return null;
  return Math.max(0, newValue - previousValue);
}

/**
 * Hronološki poredak očitanja: novije prvo (reading_date desc, pa created_at desc).
 * Vraća negativno ako a ide prije b u "novije-prvo" poretku.
 */
function compareNewestFirst(a: ReadingPoint, b: ReadingPoint): number {
  if (a.reading_date !== b.reading_date) return a.reading_date < b.reading_date ? 1 : -1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return 0;
}

/**
 * Vrijednost prethodnog (hronološki) očitanja za isti priključak prije zadanog.
 * Mirror logike getReadingById/getLastReadingValue. Vraća null ako nema.
 */
export function previousReadingValue(
  readings: ReadingPoint[],
  target: ReadingPoint,
): number | null {
  const earlier = readings.filter(
    (r) =>
      r.id !== target.id &&
      (r.reading_date < target.reading_date ||
        (r.reading_date === target.reading_date && r.created_at < target.created_at)),
  );
  if (earlier.length === 0) return null;
  earlier.sort(compareNewestFirst); // novije prvo → [0] je neposredno prethodno
  return earlier[0].reading_value;
}
