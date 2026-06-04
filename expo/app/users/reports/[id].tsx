import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Droplet,
  CreditCard,
  ClipboardList,
  TrendingUp,
  Calendar,
  Download,
  Filter,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { getUserById } from '@/lib/api/users';
import { getBills, getInvoicesByUser } from '@/lib/api/bills';
import { getReadings } from '@/lib/api/readings';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/user';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

/* ── role labels ─────────────────────────────────────── */
const ROLE_LABEL: Record<string, string> = {
  super_admin:       'Super Administrator',
  distributor_admin: 'Administrator Distributera',
  utility_admin:     'Administrator Vodovoda',
  finance:           'Finansije',
  worker:            'Radnik',
  end_user:          'Korisnik',
};

/* ── stat shape ─────────────────────────────────────── */
interface Stats {
  totalReadings:    number;
  totalConsumption: number;
  totalBills:       number;
  totalPaid:        number;
  totalUnpaid:      number;
  completedTasks:   number;
  pendingTasks:     number;
}

/* ── mock reports list (PDF generation is a future feature) ── */
const SAMPLE_REPORTS = [
  { id: '1', title: 'Mjesečni izvještaj aktivnosti', description: 'Detaljan pregled aktivnosti korisnika za tekući mjesec.', date: 'Uskoro' },
  { id: '2', title: 'Izvještaj o potrošnji',         description: 'Pregled potrošnje vode po mjesecima.',                   date: 'Uskoro' },
  { id: '3', title: 'Finansijski izvještaj',          description: 'Pregled naplate i dugovanja.',                          date: 'Uskoro' },
];

/* ════════════════════════════════════════════════════
   Component
════════════════════════════════════════════════════ */
export default function UserReportsScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();

  const [isLoading,       setIsLoading]       = useState(true);
  const [refreshing,      setRefreshing]       = useState(false);
  const [reportUser,      setReportUser]       = useState<Profile | null>(null);
  const [selectedPeriod,  setSelectedPeriod]  = useState('month');
  const [stats,           setStats]           = useState<Stats>({
    totalReadings: 0, totalConsumption: 0,
    totalBills: 0, totalPaid: 0, totalUnpaid: 0,
    completedTasks: 0, pendingTasks: 0,
  });

  /* ── data loader ────────────────────────────────── */
  const loadData = async () => {
    if (!id) return;
    try {
      /* 1. user profile */
      const profile = await getUserById(id);
      setReportUser(profile);

      /* 2. stats — role-based */
      const role = profile.role;

      if (role === 'worker') {
        /* readings taken by this worker */
        const { data: readings } = await supabase
          .from('meter_readings')
          .select('id')
          .eq('worker_id', id);

        /* tasks assigned to this worker (all statuses) */
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('assigned_to', id);

        setStats({
          totalReadings:    readings?.length ?? 0,
          totalConsumption: 0,
          totalBills:       0,
          totalPaid:        0,
          totalUnpaid:      0,
          completedTasks:   tasks?.filter((t) => t.status === 'done').length       ?? 0,
          pendingTasks:     tasks?.filter((t) => t.status === 'in_progress' || t.status === 'open').length ?? 0,
        });
      }

      else if (role === 'end_user') {
        /* connections for this user */
        const { data: conns } = await supabase
          .from('connections')
          .select('id')
          .eq('user_id', id);

        const connIds = (conns ?? []).map((c: any) => c.id);

        /* readings via connections */
        let readingCount = 0;
        if (connIds.length > 0) {
          const { count } = await supabase
            .from('meter_readings')
            .select('id', { count: 'exact', head: true })
            .in('connection_id', connIds);
          readingCount = count ?? 0;
        }

        /* bills */
        const bills = await getInvoicesByUser(id);
        setStats({
          totalReadings:    readingCount,
          totalConsumption: 0,
          totalBills:       bills.length,
          totalPaid:        bills.filter((b) => b.status === 'paid').length,
          totalUnpaid:      bills.filter((b) => b.status === 'pending' || b.status === 'overdue').length,
          completedTasks:   0,
          pendingTasks:     0,
        });
      }

      else if (role === 'finance') {
        const bills = await getBills();
        setStats({
          totalReadings:    0,
          totalConsumption: 0,
          totalBills:       bills.length,
          totalPaid:        bills.filter((b) => b.status === 'paid').length,
          totalUnpaid:      bills.filter((b) => b.status === 'pending' || b.status === 'overdue').length,
          completedTasks:   0,
          pendingTasks:     0,
        });
      }

      else {
        /* utility_admin / distributor_admin / super_admin */
        const [bills, readings] = await Promise.all([getBills(), getReadings()]);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status');
        setStats({
          totalReadings:    readings.length,
          totalConsumption: 0,
          totalBills:       bills.length,
          totalPaid:        bills.filter((b) => b.status === 'paid').length,
          totalUnpaid:      bills.filter((b) => b.status === 'pending' || b.status === 'overdue').length,
          completedTasks:   tasks?.filter((t) => t.status === 'done').length      ?? 0,
          pendingTasks:     tasks?.filter((t) => t.status === 'in_progress' || t.status === 'open').length ?? 0,
        });
      }
    } catch (e: any) {
      captureError(e, { screen: 'user-reports', action: 'loadData' });
      router.back();
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [id]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  /* ── sub-renders ────────────────────────────────── */
  const renderUserHeader = () => (
    <Card style={styles.userCard}>
      <View style={styles.userInfo}>
        <Avatar source={reportUser?.avatar_url} name={reportUser?.full_name} size={60} />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{reportUser?.full_name}</Text>
          <Text style={styles.userRole}>{ROLE_LABEL[reportUser?.role ?? ''] ?? reportUser?.role}</Text>
          <Text style={styles.userEmail}>{reportUser?.email}</Text>
        </View>
      </View>
    </Card>
  );

  const renderConsumptionChart = () => {
    if (reportUser?.role === 'finance') return null;
    return (
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Potrošnja vode</Text>
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodButton, selectedPeriod === p && styles.periodButtonActive]}
                onPress={() => setSelectedPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.periodButtonText, selectedPeriod === p && styles.periodButtonTextActive]}>
                  {p === 'week' ? 'Sedmica' : p === 'month' ? 'Mjesec' : 'Godina'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Decorative bar chart placeholder */}
        <View style={styles.mockChart}>
          {[80, 120, 60, 150, 100, 90, 130].map((h, i) => (
            <View key={i} style={[styles.mockBar, { height: h }]} />
          ))}
        </View>

        <View style={styles.chartFooter}>
          <View style={styles.chartStat}>
            <Text style={styles.chartStatValue}>{stats.totalConsumption} m³</Text>
            <Text style={styles.chartStatLabel}>Ukupno</Text>
          </View>
          <View style={styles.chartStat}>
            <Text style={styles.chartStatValue}>
              {stats.totalReadings > 0 ? (stats.totalConsumption / stats.totalReadings).toFixed(1) : '0'} m³
            </Text>
            <Text style={styles.chartStatLabel}>Prosjek</Text>
          </View>
          <View style={styles.chartStat}>
            <View style={styles.trendContainer}>
              <TrendingUp size={16} color={Colors.primary} />
              <Text style={[styles.trendText]}>—</Text>
            </View>
            <Text style={styles.chartStatLabel}>Trend</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderReadingsStats = () => {
    if (reportUser?.role === 'finance') return null;
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <FileText size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Očitanja</Text>
        </View>
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalReadings}</Text>
            <Text style={styles.statLabel}>Ukupno očitanja</Text>
          </View>
          {reportUser?.role === 'worker' && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.completedTasks}</Text>
                <Text style={styles.statLabel}>Završeni zadaci</Text>
              </View>
            </>
          )}
        </View>
        <Button
          title="Pregled svih očitanja"
          variant="outline"
          leftIcon={<FileText size={16} color={Colors.primary} />}
          onPress={() => router.push('/consumption' as any)}
          style={styles.statsButton}
        />
      </Card>
    );
  };

  const renderBillingStats = () => {
    if (reportUser?.role === 'worker') return null;
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <CreditCard size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Računi</Text>
        </View>
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalBills}</Text>
            <Text style={styles.statLabel}>Ukupno računa</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{stats.totalPaid}</Text>
            <Text style={styles.statLabel}>Plaćeno</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.error }]}>{stats.totalUnpaid}</Text>
            <Text style={styles.statLabel}>Neplaćeno</Text>
          </View>
        </View>
        <Button
          title="Pregled svih računa"
          variant="outline"
          leftIcon={<CreditCard size={16} color={Colors.primary} />}
          onPress={() => router.push('/bills' as any)}
          style={styles.statsButton}
        />
      </Card>
    );
  };

  const renderTasksStats = () => {
    const role = reportUser?.role;
    if (role !== 'worker' && role !== 'utility_admin' && role !== 'super_admin') return null;
    return (
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <ClipboardList size={24} color={Colors.primary} />
          <Text style={styles.statsTitle}>Zadaci</Text>
        </View>
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedTasks + stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>Ukupno zadataka</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>Završeno</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>U toku</Text>
          </View>
        </View>
        <Button
          title="Pregled svih zadataka"
          variant="outline"
          leftIcon={<ClipboardList size={16} color={Colors.primary} />}
          onPress={() => router.push('/tasks' as any)}
          style={styles.statsButton}
        />
      </Card>
    );
  };

  const renderReportsList = () => (
    <View style={styles.reportsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Izvještaji</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <Filter size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
      {SAMPLE_REPORTS.map((report) => (
        <Card key={report.id} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <FileText size={24} color={Colors.primary} />
            <View style={styles.reportTitleContainer}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDate}>{report.date}</Text>
            </View>
          </View>
          <Text style={styles.reportDescription}>{report.description}</Text>
          <View style={styles.reportActions}>
            <Button
              title="Preuzmi PDF"
              variant="outline"
              size="small"
              leftIcon={<Download size={16} color={Colors.primary} />}
              style={styles.reportButton}
              onPress={() => {}}
            />
            <Button
              title="Pregled"
              size="small"
              style={styles.reportButton}
              onPress={() => {}}
            />
          </View>
        </Card>
      ))}
    </View>
  );

  /* ── full loading screen ────────────────────────── */
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje izvještaja...</Text>
      </View>
    );
  }

  /* ── render ─────────────────────────────────────── */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Izvještaji korisnika</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reportUser && renderUserHeader()}
        {renderConsumptionChart()}
        {renderReadingsStats()}
        {renderBillingStats()}
        {renderTasksStats()}
        {renderReportsList()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f4f6f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText:      { marginTop: 16, fontSize: 16, color: Colors.textLight },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton:  { padding: 6 },
  title:       { flex: 1, fontSize: 18, fontWeight: 'bold', color: Colors.text, marginLeft: 8 },
  placeholder: { width: 36 },

  scrollView:    { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  /* user card */
  userCard: { marginBottom: 16, padding: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userDetails: { marginLeft: 16, flex: 1 },
  userName:  { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  userRole:  { fontSize: 14, color: Colors.primary, marginBottom: 4 },
  userEmail: { fontSize: 13, color: Colors.textLight },

  /* chart */
  chartCard:   { marginBottom: 16, padding: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle:  { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  periodSelector: { flexDirection: 'row', backgroundColor: Colors.highlight, borderRadius: 8, padding: 4 },
  periodButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  periodButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 2 },
  periodButtonText: { fontSize: 12, color: Colors.textLight },
  periodButtonTextActive: { color: Colors.text, fontWeight: '600' },

  mockChart: { flexDirection: 'row', height: 160, alignItems: 'flex-end', justifyContent: 'space-around', marginBottom: 16 },
  mockBar:   { width: 32, backgroundColor: Colors.primary, borderRadius: 4, opacity: 0.8 },

  chartFooter:     { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  chartStat:       { alignItems: 'center' },
  chartStatValue:  { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  chartStatLabel:  { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  trendContainer:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText:       { fontSize: 14, fontWeight: '500', color: Colors.primary },

  /* stat cards */
  statsCard: { marginBottom: 16, padding: 16 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statsTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginLeft: 12 },
  statsContent: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem:  { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textLight, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  statsButton: { marginTop: 4 },

  /* reports list */
  reportsContainer: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  filterButton:  { padding: 8, backgroundColor: Colors.highlight, borderRadius: 8 },

  reportCard:       { marginBottom: 16, padding: 16 },
  reportHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reportTitleContainer: { flex: 1, marginLeft: 12 },
  reportTitle:      { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  reportDate:       { fontSize: 12, color: Colors.textLight },
  reportDescription: { fontSize: 14, color: Colors.textLight, marginBottom: 12, lineHeight: 18 },
  reportActions:    { flexDirection: 'row', gap: 8 },
  reportButton:     { flex: 1 },
});
