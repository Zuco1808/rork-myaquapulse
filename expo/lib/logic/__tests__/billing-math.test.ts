import {
  applyTiers, vatBreakdown, commissionRate, consumptionMismatch, PricingTier,
} from '@/lib/logic/billing-math';

describe('applyTiers (tiered/blokovski obračun)', () => {
  const tiers: PricingTier[] = [
    { min_consumption: 0,  max_consumption: 5,    price_per_unit: 0.80, sort_order: 0 },
    { min_consumption: 5,  max_consumption: 10,   price_per_unit: 1.20, sort_order: 1 },
    { min_consumption: 10, max_consumption: null, price_per_unit: 1.60, sort_order: 2 },
  ];

  it('vraća 0 za nultu ili negativnu potrošnju', () => {
    expect(applyTiers(tiers, 0)).toBe(0);
    expect(applyTiers(tiers, -3)).toBe(0);
  });

  it('vraća 0 kad nema tarifa', () => {
    expect(applyTiers([], 12)).toBe(0);
  });

  it('obračunava unutar prvog razreda', () => {
    expect(applyTiers(tiers, 3)).toBe(2.40); // 3 × 0.80
  });

  it('obračunava preko više razreda', () => {
    // 5×0.80 + 5×1.20 + 2×1.60 = 4.00 + 6.00 + 3.20 = 13.20
    expect(applyTiers(tiers, 12)).toBe(13.20);
  });

  it('koristi neograničeni zadnji razred', () => {
    // 5×0.80 + 5×1.20 + 90×1.60 = 4 + 6 + 144 = 154
    expect(applyTiers(tiers, 100)).toBe(154);
  });

  it('tačno na granici razreda', () => {
    expect(applyTiers(tiers, 5)).toBe(4.00);   // 5×0.80
    expect(applyTiers(tiers, 10)).toBe(10.00); // 4 + 6
  });

  it('sortira tarife po sort_order bez obzira na ulazni redoslijed', () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(applyTiers(shuffled, 12)).toBe(13.20);
  });

  it('zaokružuje na 2 decimale', () => {
    const t: PricingTier[] = [{ min_consumption: 0, max_consumption: null, price_per_unit: 0.333, sort_order: 0 }];
    expect(applyTiers(t, 10)).toBe(3.33);
  });
});

describe('vatBreakdown (izvlačenje PDV-a iz bruta)', () => {
  it('17% iz 117 → osnovica 100, PDV 17', () => {
    const b = vatBreakdown(117, 17);
    expect(b.net).toBeCloseTo(100, 2);
    expect(b.vat).toBeCloseTo(17, 2);
    expect(b.rate).toBe(17);
  });

  it('osnovica + PDV uvijek daje bruto', () => {
    const b = vatBreakdown(56.44, 17);
    expect(b.net + b.vat).toBeCloseTo(56.44, 6);
  });

  it('stopa 0 → cijeli iznos je osnovica, PDV 0', () => {
    const b = vatBreakdown(80, 0);
    expect(b.net).toBe(80);
    expect(b.vat).toBe(0);
  });

  it('robustan na nevalidan ulaz', () => {
    const b = vatBreakdown(NaN as any, NaN as any);
    expect(b.net).toBe(0);
    expect(b.vat).toBe(0);
  });
});

describe('commissionRate (distributerska provizija §5.3)', () => {
  it('Premium = 15%', () => expect(commissionRate('premium')).toBe(0.15));
  it('Standard = 20%', () => expect(commissionRate('standard')).toBe(0.20));
  it('Basic = 20%', () => expect(commissionRate('basic')).toBe(0.20));
  it('nepoznat paket → default 20%', () => expect(commissionRate('xyz')).toBe(0.20));
});

describe('consumptionMismatch (zajedničko vs individualna)', () => {
  it('usklađeno unutar tolerancije (5%)', () => {
    // shared 100, individual 97 → diff 3, tolerancija 5 → ok
    const r = consumptionMismatch(100, 97);
    expect(r.mismatch).toBe(false);
    expect(r.diff).toBe(3);
  });

  it('neusklađeno iznad tolerancije', () => {
    // shared 100, individual 80 → diff 20 > 5 → mismatch
    const r = consumptionMismatch(100, 80);
    expect(r.mismatch).toBe(true);
  });

  it('minimalna tolerancija 1 m³ na malim iznosima', () => {
    // shared 5, 5% = 0.25 → tolerancija max(1, 0.25) = 1
    expect(consumptionMismatch(5, 4.5).mismatch).toBe(false); // diff 0.5 < 1
    expect(consumptionMismatch(5, 3).mismatch).toBe(true);    // diff 2 > 1
  });

  it('individualno veće od zajedničkog (negativna razlika) je takođe anomalija', () => {
    const r = consumptionMismatch(80, 100);
    expect(r.diff).toBe(-20);
    expect(r.mismatch).toBe(true);
  });
});
