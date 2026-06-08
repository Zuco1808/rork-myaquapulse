import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ChevronDown,
  Droplet,
  DollarSign,
  Users,
  ClipboardList,
  Download,
} from 'lucide-react-native';
import { useFreshFocus } from '@/lib/use-fresh-focus';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

/* ── Types ─────────────────────────────────────── */
interface BarItem {
  label: string;
  value: number;
}

/* ── Helpers ───────────────────────────────────── */
const BOSNIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec',
];

/** Build last-N-months skeleton [{ key: 'YYYY-MM', label: 'Mon' }] */
const lastNMonths = (n: number) => {
  const result: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ key, label: BOSNIAN_MONTHS[d.getMonth()] });
  }
  return result;
};

/* ── Report types ───────────────────────────────── */
type ReportType = 'consumption' | 'financial' | 'users' | 'tasks';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'consumption', label: 'Potrošnja vode', icon: <Droplet size={18} color={Colors.primary} /> },
  { id: 'financial', label: 'Finansije', icon: <DollarSign size={18} color={Colors.primary} /> },
  { id: 'users', label: 'Korisnici', icon: <Users size={18} color={Colors.primary} /> },
  { id: 'tasks', label: 'Zadaci / kvarovi', icon: <ClipboardList size={18} color={Colors.primary} /> },
];

/* ════════════════════════════════════════════════ */
export default function ReportsScreen() {
  const { user } = useAuthStore();

  const [reportType, setReportType] = useState<ReportType>('consumption');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  /* ── Consumption data ──────────────────────────── */
  const [consumptionData, setConsumptionData] = useState<BarItem[]>([]);
  const [totalConsumption, setTotalConsumption] = useState(0);
  const [avgConsumption, setAvgConsumption] = useState(0);

  /* ── Financial data ────────────────────────────── */
  const [financialData, setFinancialData] = useState<BarItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);

  /* ── Users data ────────────────────────────────── */
  const [usersStats, setUsersStats] = useState({
    total: 0,
    active: 0,
    workers: 0,
    endUsers: 0,
    connections: 0,
  });

  /* ── Tasks data ────────────────────────────────── */
  const [tasksStats, setTasksStats] = useState({
    open: 0,
    inProgress: 0,
    done: 0,
    cancelled: 0,
    urgent: 0,
    materialCost: 0,
    laborCost: 0,
    maintenanceCost: 0,
  });

  /* ── Fetch ─────────────────────────────────────── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchConsumption(),
        fetchFinancial(),
        fetchUsers(),
        fetchTasks(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumption = async () => {
    const months = lastNMonths(6);

    // Fetch from one extra month back so we have a base reading for the first
    // month of the 6-month window (needed to compute the delta for month[0]).
    const sinceBase = (() => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 6);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();

    const { data } = await supabase
      .from('meter_readings')
      .select('connection_id, reading_value, reading_date')
      .gte('reading_date', sinceBase)
      .order('reading_date', { ascending: true });

    // Group readings per connection so we can compute per-connection deltas
    const byConnection: Record<string, { date: string; value: number }[]> = {};
    (data || []).forEach((r: any) => {
      const cid = r.connection_id as string;
      if (!byConnection[cid]) byConnection[cid] = [];
      byConnection[cid].push({
        date: String(r.reading_date),
        value: Number(r.reading_value) || 0,
      });
    });

    // Delta between consecutive readings → assign to month of the later reading
    const grouped: Record<string, number> = {};
    Object.values(byConnection).forEach((readings) => {
      for (let i = 1; i < readings.length; i++) {
        const delta = readings[i].value - readings[i - 1].value;
        // Ignore negative deltas (meter replacement / data error)
        if (delta > 0) {
          const key = readings[i].date.slice(0, 7);
          grouped[key] = (grouped[key] || 0) + delta;
        }
      }
    });

    const items = months.map((m) => ({
      label: m.label,
      value: Math.round(grouped[m.key] || 0),
    }));
    setConsumptionData(items);
    const total = items.reduce((s, i) => s + i.value, 0);
    setTotalConsumption(total);
    setAvgConsumption(items.length ? Math.round(total / items.length) : 0);
  };

  const fetchFinancial = async () => {
    const months = lastNMonths(6);
    const since = months[0].key + '-01';

    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('amount_bam, status, period_from')
      .gte('period_from', since);

    const grouped: Record<string, number> = {};
    let pending = 0;
    let paid = 0;

    (allInvoices || []).forEach((inv: any) => {
      const amount = Number(inv.amount_bam) || 0;
      if (inv.status === 'paid') {
        const key = String(inv.period_from).slice(0, 7);
        grouped[key] = (grouped[key] || 0) + amount;
        paid += amount;
      }
      if (inv.status === 'pending' || inv.status === 'sent' || inv.status === 'overdue') {
        pending += amount;
      }
    });

    const items = months.map((m) => ({
      label: m.label,
      value: Math.round(grouped[m.key] || 0),
    }));
    setFinancialData(items);
    setTotalRevenue(Math.round(paid));
    setPendingRevenue(Math.round(pending));
  };

  const fetchUsers = async () => {
    const [profilesRes, connectionsRes] = await Promise.all([
      supabase.from('profiles').select('role, is_active'),
      supabase.from('connections').select('id', { count: 'exact', head: true }),
    ]);
    const profiles = profilesRes.data || [];
    const connCount = connectionsRes.count || 0;

    setUsersStats({
      total: profiles.length,
      active: profiles.filter((p: any) => p.is_active).length,
      workers: profiles.filter((p: any) => p.role === 'worker').length,
      endUsers: profiles.filter((p: any) => p.role === 'end_user').length,
      connections: connCount,
    });
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('status, priority, material_cost, labor_cost');

    const tasks = data || [];
    // Troškovi održavanja se broje samo za završene naloge
    const doneTasks = tasks.filter((t: any) => t.status === 'done');
    const materialCost = doneTasks.reduce((s: number, t: any) => s + (Number(t.material_cost) || 0), 0);
    const laborCost    = doneTasks.reduce((s: number, t: any) => s + (Number(t.labor_cost)    || 0), 0);
    const round2 = (n: number) => Math.round(n * 100) / 100;

    setTasksStats({
      open: tasks.filter((t: any) => t.status === 'open').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      done: doneTasks.length,
      cancelled: tasks.filter((t: any) => t.status === 'cancelled').length,
      urgent: tasks.filter((t: any) => t.priority === 'urgent').length,
      materialCost: round2(materialCost),
      laborCost: round2(laborCost),
      maintenanceCost: round2(materialCost + laborCost),
    });
  };

  useFreshFocus(fetchAll);

  /* ── CSV export ────────────────────────────────── */
  const buildCSV = (): string => {
    switch (reportType) {
      case 'consumption': return [
        'Mjesec,Potrošnja (m³)',
        ...consumptionData.map((d) => `${d.label},${d.value}`),
        `Ukupno,${totalConsumption}`,
        `Prosjek/mj.,${avgConsumption}`,
      ].join('\n');
      case 'financial': return [
        'Mjesec,Naplaćeno (KM)',
        ...financialData.map((d) => `${d.label},${d.value}`),
        `Ukupno naplaćeno,${totalRevenue}`,
        `Na naplati,${pendingRevenue}`,
      ].join('\n');
      case 'users': return [
        'Metrika,Vrijednost',
        `Ukupno korisnika,${usersStats.total}`,
        `Aktivnih,${usersStats.active}`,
        `Radnika,${usersStats.workers}`,
        `Krajnjih korisnika,${usersStats.endUsers}`,
        `Priključaka,${usersStats.connections}`,
      ].join('\n');
      case 'tasks': {
        const tot = tasksStats.open + tasksStats.inProgress + tasksStats.done + tasksStats.cancelled;
        return [
          'Status,Broj',
          `Otvoreni,${tasksStats.open}`,
          `U toku,${tasksStats.inProgress}`,
          `Završeni,${tasksStats.done}`,
          `Otkazani,${tasksStats.cancelled}`,
          `Hitni (prioritet),${tasksStats.urgent}`,
          `Ukupno,${tot}`,
          '',
          'Troškovi održavanja (završeni nalozi),BAM',
          `Materijal,${tasksStats.materialCost.toFixed(2)}`,
          `Rad,${tasksStats.laborCost.toFixed(2)}`,
          `Ukupno troškovi,${tasksStats.maintenanceCost.toFixed(2)}`,
        ].join('\n');
      }
      default: return '';
    }
  };

  const handleExport = async () => {
    if (exporting || loading) return;
    setExporting(true);
    try {
      const csv = buildCSV();
      const label = REPORT_TYPES.find((r) => r.id === reportType)?.label ?? reportType;
      const fileName = `aquapulse_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: `Izvezi — ${label}`,
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert('Greška', 'Izvoz nije uspio.');
    } finally {
      setExporting(false);
    }
  };

  /* ── Bar chart ─────────────────────────────────── */
  const renderBarChart = (data: BarItem[], unit: string, color: string) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <View style={styles.chartContainer}>
        {/* Y axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{max} {unit}</Text>
          <Text style={styles.axisLabel}>{Math.round(max / 2)} {unit}</Text>
          <Text style={styles.axisLabel}>0</Text>
        </View>
        {/* Bars */}
        <View style={styles.chart}>
          {data.map((item, idx) => (
            <View key={idx} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  /* ── Stat box ───────────────────────────────────── */
  const renderStatBox = (value: string | number, label: string) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  /* ── Report sections ───────────────────────────── */
  const renderConsumption = () => (
    <>
      {renderBarChart(consumptionData, 'm³', Colors.primary)}
      <View style={styles.statsRow}>
        {renderStatBox(`${totalConsumption} m³`, 'Ukupno (6 mj.)')}
        {renderStatBox(`${avgConsumption} m³`, 'Prosjek / mj.')}
        {renderStatBox(
          consumptionData.length
            ? `${consumptionData[consumptionData.length - 1].value} m³`
            : '—',
          'Prošli mj.',
        )}
      </View>
    </>
  );

  const renderFinancial = () => (
    <>
      {renderBarChart(financialData, 'KM', '#4CAF50')}
      <View style={styles.statsRow}>
        {renderStatBox(`${totalRevenue} KM`, 'Naplaćeno (6 mj.)')}
        {renderStatBox(`${pendingRevenue} KM`, 'Na naplati')}
        {renderStatBox(
          financialData.length
            ? `${financialData[financialData.length - 1].value} KM`
            : '—',
          'Prošli mj.',
        )}
      </View>
    </>
  );

  const renderUsers = () => (
    <View>
      {/* Stat cards grid */}
      <View style={styles.usersGrid}>
        {[
          { v: usersStats.total, l: 'Ukupno korisnika' },
          { v: usersStats.active, l: 'Aktivnih' },
          { v: usersStats.workers, l: 'Radnika' },
          { v: usersStats.endUsers, l: 'Krajnjih korisnika' },
          { v: usersStats.connections, l: 'Priključaka' },
        ].map(({ v, l }) => (
          <View key={l} style={styles.usersCard}>
            <Text style={styles.usersCardValue}>{v}</Text>
            <Text style={styles.usersCardLabel}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTasks = () => {
    const total = tasksStats.open + tasksStats.inProgress + tasksStats.done + tasksStats.cancelled;
    return (
      <View>
        {[
          { label: 'Otvoreni', value: tasksStats.open, color: Colors.primary },
          { label: 'U toku', value: tasksStats.inProgress, color: '#FF9800' },
          { label: 'Završeni', value: tasksStats.done, color: '#4CAF50' },
          { label: 'Otkazani', value: tasksStats.cancelled, color: '#9E9E9E' },
          { label: 'Hitni', value: tasksStats.urgent, color: Colors.error },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.taskRow}>
            <Text style={styles.taskLabel}>{label}</Text>
            <View style={styles.taskBarWrapper}>
              <View
                style={[
                  styles.taskBar,
                  {
                    width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%',
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.taskCount, { color }]}>{value}</Text>
          </View>
        ))}
        <View style={styles.statsRow}>
          {renderStatBox(total, 'Ukupno zadataka')}
          {renderStatBox(tasksStats.open + tasksStats.inProgress, 'Aktivnih')}
          {renderStatBox(tasksStats.urgent, 'Hitnih')}
        </View>

        {/* Troškovi održavanja (završeni nalozi) */}
        <View style={styles.maintBox}>
          <Text style={styles.maintTitle}>Troškovi održavanja</Text>
          <Text style={styles.maintSub}>na osnovu {tasksStats.done} završenih naloga</Text>
          <View style={styles.maintRow}>
            <Text style={styles.maintLabel}>Materijal</Text>
            <Text style={styles.maintValue}>{tasksStats.materialCost.toFixed(2)} BAM</Text>
          </View>
          <View style={styles.maintRow}>
            <Text style={styles.maintLabel}>Rad</Text>
            <Text style={styles.maintValue}>{tasksStats.laborCost.toFixed(2)} BAM</Text>
          </View>
          <View style={[styles.maintRow, styles.maintTotalRow]}>
            <Text style={styles.maintTotalLabel}>Ukupno</Text>
            <Text style={styles.maintTotalValue}>{tasksStats.maintenanceCost.toFixed(2)} BAM</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (reportType) {
      case 'consumption': return renderConsumption();
      case 'financial':   return renderFinancial();
      case 'users':       return renderUsers();
      case 'tasks':       return renderTasks();
      default:            return renderConsumption();
    }
  };

  /* ── Main render ───────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Type picker */}
        <View style={styles.typePickerWrapper}>
          <TouchableOpacity
            style={styles.typePicker}
            onPress={() => setShowTypePicker(!showTypePicker)}
          >
            <View style={styles.typePickerLeft}>
              {REPORT_TYPES.find((r) => r.id === reportType)?.icon}
              <Text style={styles.typePickerText}>
                {REPORT_TYPES.find((r) => r.id === reportType)?.label}
              </Text>
            </View>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>

          {showTypePicker && (
            <View style={styles.typeDropdown}>
              {REPORT_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.id}
                  style={[
                    styles.typeDropdownItem,
                    reportType === rt.id && styles.typeDropdownItemActive,
                  ]}
                  onPress={() => {
                    setReportType(rt.id);
                    setShowTypePicker(false);
                  }}
                >
                  {rt.icon}
                  <Text
                    style={[
                      styles.typeDropdownItemText,
                      reportType === rt.id && { color: Colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {rt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Report card */}
        <Card style={styles.reportCard}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.reportTitleRow}>
                <Text style={styles.reportTitle}>
                  {REPORT_TYPES.find((r) => r.id === reportType)?.label}
                </Text>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={handleExport}
                  disabled={loading || exporting}
                >
                  {exporting
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Download size={18} color={Colors.primary} />}
                </TouchableOpacity>
              </View>
              {renderContent()}
            </>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 60 },

  /* Type picker */
  typePickerWrapper: { marginBottom: 12, zIndex: 10 },
  typePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
  },
  typePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typePickerText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  typeDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  typeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  typeDropdownItemActive: { backgroundColor: Colors.highlight },
  typeDropdownItemText: { fontSize: 14, color: Colors.text },

  /* Report card */
  reportCard: { padding: 16 },
  loadingBox: { height: 200, alignItems: 'center', justifyContent: 'center' },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
  },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bar chart */
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 20,
  },
  yAxis: {
    width: 52,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 20,
  },
  axisLabel: { fontSize: 11, color: Colors.textLight },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingTop: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    width: '55%',
    minHeight: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 11,
    color: Colors.textLight,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 3,
  },
  statLabel: { fontSize: 11, color: Colors.textLight, textAlign: 'center' },

  /* Users grid */
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  usersCard: {
    width: '47%',
    backgroundColor: Colors.highlight,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  usersCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  usersCardLabel: { fontSize: 12, color: Colors.textLight, textAlign: 'center' },

  /* Tasks */
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskLabel: { width: 90, fontSize: 13, color: Colors.text },
  taskBarWrapper: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  taskBar: { height: '100%', borderRadius: 5, minWidth: 4 },
  taskCount: { width: 30, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },

  maintBox: {
    marginTop: 16, padding: 14, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border,
  },
  maintTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  maintSub:   { fontSize: 11, color: Colors.textLight, marginBottom: 10 },
  maintRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  maintLabel: { fontSize: 13, color: Colors.textLight },
  maintValue: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  maintTotalRow:   { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 10 },
  maintTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  maintTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },
});
