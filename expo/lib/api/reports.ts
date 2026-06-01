import { getReadingsForBilling, getBills } from '@/lib/api/bills';
import { getUsers } from '@/lib/api/users';
import { getAlerts } from '@/lib/api/alerts';
import type { WaterAlert } from '@/types/location';

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface ChartBucket {
  label: string;
  value: number;
}

export interface ChartReport {
  buckets: ChartBucket[];
  total: number;
  average: number;
  trendPct: number | null;
}

export interface UsersReportRow {
  id: string;
  name: string;
  roleLabel: string;
  consumption: number;
  billsPaid: number;
  billsTotal: number;
}

export interface UsersReport {
  rows: UsersReportRow[];
  totalUsers: number;
  newThisMonth: number;
  collectionRate: number;
}

export interface AlertsReportRow {
  id: string;
  title: string;
  typeLabel: string;
  date: number;
  resolved: boolean;
}

export interface AlertsReport {
  rows: AlertsReportRow[];
  total: number;
  active: number;
  resolved: number;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec',
];

const pad = (n: number) => String(n).padStart(2, '0');
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface BucketDef {
  label: string;
  start: number;
  end: number;
}

// Builds a series of time buckets ending at the current period.
const buildBucketDefs = (period: ReportPeriod): BucketDef[] => {
  const now = new Date();
  const defs: BucketDef[] = [];

  if (period === 'day') {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      defs.push({
        label: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`,
        start: start.getTime(),
        end: end.getTime(),
      });
    }
  } else if (period === 'week') {
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now);
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - i * 7 + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      defs.push({
        label: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`,
        start: start.getTime(),
        end: end.getTime(),
      });
    }
  } else if (period === 'month') {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      defs.push({
        label: MONTHS_SHORT[start.getMonth()],
        start: start.getTime(),
        end: end.getTime(),
      });
    }
  } else if (period === 'quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    for (let i = 3; i >= 0; i--) {
      const qIndex = currentQuarter - i;
      const year = now.getFullYear() + Math.floor(qIndex / 4);
      const q = ((qIndex % 4) + 4) % 4;
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, q * 3 + 3, 1);
      defs.push({
        label: `Q${q + 1} ${String(year).slice(2)}`,
        start: start.getTime(),
        end: end.getTime(),
      });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      defs.push({
        label: String(year),
        start: new Date(year, 0, 1).getTime(),
        end: new Date(year + 1, 0, 1).getTime(),
      });
    }
  }

  return defs;
};

const aggregate = (
  items: { ts: number; value: number }[],
  period: ReportPeriod,
): ChartReport => {
  const defs = buildBucketDefs(period);
  const buckets: ChartBucket[] = defs.map((def) => ({
    label: def.label,
    value: round2(
      items
        .filter((it) => it.ts >= def.start && it.ts < def.end)
        .reduce((sum, it) => sum + it.value, 0),
    ),
  }));

  const total = buckets.reduce((sum, b) => sum + b.value, 0);
  const withData = buckets.filter((b) => b.value > 0);
  const average = withData.length ? total / withData.length : 0;

  const first = buckets.find((b) => b.value > 0);
  const last = [...buckets].reverse().find((b) => b.value > 0);
  let trendPct: number | null = null;
  if (first && last && first !== last && first.value > 0) {
    trendPct = round1(((last.value - first.value) / first.value) * 100);
  }

  return { buckets, total: round2(total), average: round2(average), trendPct };
};

export const getConsumptionReport = async (
  period: ReportPeriod,
): Promise<ChartReport> => {
  const readings = await getReadingsForBilling();
  return aggregate(
    readings.map((r) => ({ ts: r.readingDate, value: r.consumption })),
    period,
  );
};

export const getFinancialReport = async (
  period: ReportPeriod,
): Promise<ChartReport> => {
  const bills = await getBills();
  return aggregate(
    bills.map((b) => ({ ts: b.issueDate ?? b.createdAt, value: b.amount ?? 0 })),
    period,
  );
};

const roleLabel = (role: string): string => {
  switch (role) {
    case 'citizen':
      return 'Građanin';
    case 'worker':
      return 'Radnik';
    case 'admin':
      return 'Administrator';
    case 'finance':
      return 'Finansije';
    case 'superadmin':
      return 'Super admin';
    default:
      return role;
  }
};

export const getUsersReport = async (): Promise<UsersReport> => {
  const [users, readings, bills] = await Promise.all([
    getUsers(),
    getReadingsForBilling(),
    getBills(),
  ]);

  const consumptionByUser = new Map<string, number>();
  readings.forEach((r) => {
    if (!r.userId) return;
    consumptionByUser.set(r.userId, (consumptionByUser.get(r.userId) || 0) + r.consumption);
  });

  const billsByUser = new Map<string, { paid: number; total: number }>();
  bills.forEach((b) => {
    if (!b.userId) return;
    const cur = billsByUser.get(b.userId) || { paid: 0, total: 0 };
    cur.total += 1;
    if (b.status === 'paid') cur.paid += 1;
    billsByUser.set(b.userId, cur);
  });

  const allUsers = (users || []) as any[];
  const citizens = allUsers.filter((u) => u.role === 'citizen');
  const rows: UsersReportRow[] = citizens.map((u) => {
    const bc = billsByUser.get(u.id) || { paid: 0, total: 0 };
    return {
      id: u.id,
      name: u.name,
      roleLabel: roleLabel(u.role),
      consumption: round2(consumptionByUser.get(u.id) || 0),
      billsPaid: bc.paid,
      billsTotal: bc.total,
    };
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const newThisMonth = allUsers.filter(
    (u) => u.created_at && new Date(u.created_at).getTime() >= monthStart,
  ).length;

  const totalBills = bills.length;
  const paidBills = bills.filter((b) => b.status === 'paid').length;
  const collectionRate = totalBills ? Math.round((paidBills / totalBills) * 100) : 0;

  return {
    rows,
    totalUsers: allUsers.length,
    newThisMonth,
    collectionRate,
  };
};

const alertTypeLabel = (type: WaterAlert['type']): string => {
  switch (type) {
    case 'high_consumption':
      return 'Visoka potrošnja';
    case 'low_consumption':
      return 'Niska potrošnja';
    case 'leak':
      return 'Curenje';
    case 'no_reading':
      return 'Prekid očitanja';
    case 'meter_fault':
      return 'Kvar vodomjera';
    default:
      return type;
  }
};

export const getAlertsReport = async (): Promise<AlertsReport> => {
  const alerts = await getAlerts();
  const rows: AlertsReportRow[] = alerts.map((a) => ({
    id: a.id,
    title: a.title || '',
    typeLabel: alertTypeLabel(a.type),
    date: a.createdAt,
    resolved: a.isResolved,
  }));

  const total = alerts.length;
  const resolved = alerts.filter((a) => a.isResolved).length;

  return { rows, total, active: total - resolved, resolved };
};
