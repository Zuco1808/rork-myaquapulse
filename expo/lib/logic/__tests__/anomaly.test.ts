import {
  isConsumptionAnomaly, invoiceStatusAfterPayment, InvoiceStatus,
} from '@/lib/logic/anomaly';

describe('isConsumptionAnomaly (detekcija naglog skoka)', () => {
  const normal = [14, 15, 16, 13]; // prosjek ~14.5

  it('normalna potrošnja nije anomalija', () => {
    expect(isConsumptionAnomaly(17, normal)).toBe(false);
  });

  it('nagli skok iznad 3× prosjeka je anomalija', () => {
    // prosjek 14.5 → prag max(10, 43.5) = 43.5; 150 > 43.5
    expect(isConsumptionAnomaly(150, normal)).toBe(true);
  });

  it('tačno na pragu nije anomalija (mora biti strogo veće)', () => {
    const deltas = [10, 10]; // prosjek 10 → prag max(10, 30) = 30
    expect(isConsumptionAnomaly(30, deltas)).toBe(false);
    expect(isConsumptionAnomaly(30.1, deltas)).toBe(true);
  });

  it('mali prosjek koristi apsolutni minimum (10 m³)', () => {
    const deltas = [1, 1, 1]; // prosjek 1 → 3×1=3, ali prag = max(10,3)=10
    expect(isConsumptionAnomaly(9, deltas)).toBe(false);
    expect(isConsumptionAnomaly(11, deltas)).toBe(true);
  });

  it('nedovoljan bazni uzorak (<2 pozitivne delte) → nema anomalije', () => {
    expect(isConsumptionAnomaly(1000, [20])).toBe(false);
    expect(isConsumptionAnomaly(1000, [])).toBe(false);
    expect(isConsumptionAnomaly(1000, [-5, 0, 20])).toBe(false); // samo 1 pozitivna
  });

  it('nulta/negativna potrošnja nije anomalija', () => {
    expect(isConsumptionAnomaly(0, normal)).toBe(false);
    expect(isConsumptionAnomaly(-50, normal)).toBe(false);
  });

  it('ignoriše negativne delte (zamjena brojila) u prosjeku', () => {
    // pozitivne: 20, 20 → prosjek 20 → prag 60
    expect(isConsumptionAnomaly(70, [20, -1000, 20])).toBe(true);
    expect(isConsumptionAnomaly(50, [20, -1000, 20])).toBe(false);
  });
});

describe('invoiceStatusAfterPayment (sinkronizacija statusa)', () => {
  it('potpuna uplata → paid', () => {
    expect(invoiceStatusAfterPayment('sent', 100, 100)).toBe('paid');
    expect(invoiceStatusAfterPayment('overdue', 100, 120)).toBe('paid'); // preplata
  });

  it('djelomična uplata → sent (ako nije draft/cancelled)', () => {
    expect(invoiceStatusAfterPayment('sent', 100, 40)).toBe('sent');
    expect(invoiceStatusAfterPayment('overdue', 100, 40)).toBe('sent');
  });

  it('draft i cancelled ostaju nepromijenjeni pri djelomičnoj uplati', () => {
    expect(invoiceStatusAfterPayment('draft', 100, 40)).toBe('draft');
    expect(invoiceStatusAfterPayment('cancelled', 100, 40)).toBe('cancelled');
  });

  it('puna uplata postavlja paid čak i iz drafta', () => {
    expect(invoiceStatusAfterPayment('draft', 100, 100)).toBe('paid');
  });

  it('iznos 0 ne postaje paid', () => {
    expect(invoiceStatusAfterPayment('sent', 0, 0)).toBe('sent');
  });

  it('uklonjena uplata (totalPaid pao ispod) → vraća na sent', () => {
    expect(invoiceStatusAfterPayment('paid', 100, 50)).toBe('sent');
  });
});
