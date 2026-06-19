import {
  isReadingNotLower, computeConsumption, previousReadingValue, ReadingPoint,
} from '@/lib/logic/readings-validation';

describe('isReadingNotLower (brojilo ne ide unazad)', () => {
  it('nema prethodnog → uvijek validno', () => {
    expect(isReadingNotLower(0, null)).toBe(true);
    expect(isReadingNotLower(1000, null)).toBe(true);
  });
  it('jednako ili veće → validno', () => {
    expect(isReadingNotLower(100, 100)).toBe(true);
    expect(isReadingNotLower(101, 100)).toBe(true);
  });
  it('manje od prethodnog → nevalidno', () => {
    expect(isReadingNotLower(99, 100)).toBe(false);
  });
});

describe('computeConsumption (potrošnja)', () => {
  it('razlika novo − prethodno', () => {
    expect(computeConsumption(1050, 1029.8)).toBeCloseTo(20.2, 5);
  });
  it('nema prethodnog → null', () => {
    expect(computeConsumption(1050, null)).toBeNull();
  });
  it('negativna razlika se kresa na 0', () => {
    expect(computeConsumption(90, 100)).toBe(0);
  });
});

describe('previousReadingValue (hronološki prethodno)', () => {
  const mk = (id: string, val: number, date: string, created: string): ReadingPoint =>
    ({ id, reading_value: val, reading_date: date, created_at: created });

  const series = [
    mk('a', 1000, '2026-03-01', '2026-03-01T08:00:00Z'),
    mk('b', 1014.25, '2026-04-01', '2026-04-01T08:00:00Z'),
    mk('c', 1029.8, '2026-05-01', '2026-05-01T08:00:00Z'),
    mk('d', 1050, '2026-06-08', '2026-06-08T08:00:00Z'),
  ];

  it('vraća neposredno prethodno po datumu', () => {
    expect(previousReadingValue(series, series[3])).toBe(1029.8); // prije d je c
    expect(previousReadingValue(series, series[1])).toBe(1000);   // prije b je a
  });

  it('prvo očitanje nema prethodno → null', () => {
    expect(previousReadingValue(series, series[0])).toBeNull();
  });

  it('isti datum razlučuje po created_at', () => {
    const sameDay = [
      mk('x', 1050, '2026-06-08', '2026-06-08T08:00:00Z'),
      mk('y', 1059, '2026-06-08', '2026-06-08T10:00:00Z'),
    ];
    expect(previousReadingValue(sameDay, sameDay[1])).toBe(1050); // y nakon x istog dana
    expect(previousReadingValue(sameDay, sameDay[0])).toBeNull();
  });

  it('ignoriše sam target i kasnija očitanja', () => {
    // za c (maj) prethodno je b (april), ne d (jun)
    expect(previousReadingValue(series, series[2])).toBe(1014.25);
  });

  it('neuredjen ulaz → ispravno sortira', () => {
    const shuffled = [series[3], series[0], series[2], series[1]];
    expect(previousReadingValue(shuffled, series[3])).toBe(1029.8);
  });
});
