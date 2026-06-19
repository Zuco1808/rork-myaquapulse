/**
 * Čista logika detekcije anomalija potrošnje i statusa naplate.
 * Mora ostati usklađena s DB trigerima (anomaly trigger, payment sync) — služi
 * kao izvor istine i za klijentski preview/testove.
 */

/**
 * Detekcija naglog skoka potrošnje (spec §8.3).
 * Anomalija kad potrošnja > GREATEST(MIN_ABS, prosjek × FACTOR).
 *  FACTOR  = 3   (300% prosjeka)
 *  MIN_ABS = 10  (m³ — prag protiv lažnih pozitiva na maloj bazi)
 * Potreban bazni uzorak od bar 2 istorijske delte.
 */
export const ANOMALY_FACTOR = 3;
export const ANOMALY_MIN_ABS = 10;

export function isConsumptionAnomaly(
  consumption: number,
  historicalDeltas: number[],
): boolean {
  if (consumption <= 0) return false;
  const positive = historicalDeltas.filter((d) => d > 0);
  if (positive.length < 2) return false; // nedovoljno baze
  const avg = positive.reduce((s, d) => s + d, 0) / positive.length;
  if (avg <= 0) return false;
  return consumption > Math.max(ANOMALY_MIN_ABS, avg * ANOMALY_FACTOR);
}

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Status fakture nakon evidentirane uplate (usklađeno s DB trigerom
 * sync_invoice_payment_status):
 *  - suma uplata ≥ iznos (>0) → 'paid'
 *  - inače, ako nije draft/cancelled → 'sent'
 *  - draft/cancelled ostaju nepromijenjeni
 */
export function invoiceStatusAfterPayment(
  currentStatus: InvoiceStatus,
  amountDue: number,
  totalPaid: number,
): InvoiceStatus {
  if (amountDue > 0 && totalPaid >= amountDue) return 'paid';
  if (currentStatus === 'draft' || currentStatus === 'cancelled') return currentStatus;
  return 'sent';
}
