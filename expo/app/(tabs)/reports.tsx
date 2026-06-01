import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Download,
  Calendar,
  ChevronDown,
  Droplet,
  DollarSign,
  Users,
  AlertTriangle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import {
  getConsumptionReport,
  getFinancialReport,
  getUsersReport,
  getAlertsReport,
  type ReportPeriod,
  type ChartReport,
  type UsersReport,
  type AlertsReport,
} from '@/lib/api/reports';
import Colors from '@/constants/colors';

type ReportType = 'consumption' | 'financial' | 'users' | 'alerts';

const reportTypes: { id: ReportType; label: string; icon: React.ReactNode }[] = [
  { id: 'consumption', label: 'Potrošnja vode', icon: <Droplet size={20} color={Colors.primary} /> },
  { id: 'financial', label: 'Finansijski izvještaji', icon: <DollarSign size={20} color={Colors.primary} /> },
  { id: 'users', label: 'Korisnici', icon: <Users size={20} color={Colors.primary} /> },
  { id: 'alerts', label: 'Alarmi i anomalije', icon: <AlertTriangle size={20} color={Colors.primary} /> },
];

const timePeriods: { id: ReportPeriod; label: string }[] = [
  { id: 'day', label: 'Dan' },
  { id: 'week', label: 'Sedmica' },
  { id: 'month', label: 'Mjesec' },
  { id: 'quarter', label: 'Kvartal' },
  { id: 'year', label: 'Godina' },
];

const formatNumber = (n: number): string =>
  n.toLocaleString('bs-BA', { maximumFractionDigits: 2 });

const formatTrend = (pct: number | null): string => {
  if (pct === null) return '—';
  return `${pct > 0 ? '+' : ''}${pct}%`;
};

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('bs-BA');
};

export default function ReportsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedReportType, setSelectedReportType] = useState<ReportType>('consumption');
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');
  const [showReportTypes, setShowReportTypes] = useState(false);
  const [showPeriods, setShowPeriods] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [consumption, setConsumption] = useState<ChartReport | null>(null);
  const [financial, setFinancial] = useState<ChartReport | null>(null);
  const [usersReport, setUsersReport] = useState<UsersReport | null>(null);
  const [alertsReport, setAlertsReport] = useState<AlertsReport | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    let active = true;
    setIsLoading(true);
    (async () => {
      try {
        if (selectedReportType === 'consumption') {
          const r = await getConsumptionReport(selectedPeriod);
          if (active) setConsumption(r);
        } else if (selectedReportType === 'financial') {
          const r = await getFinancialReport(selectedPeriod);
          if (active) setFinancial(r);
        } else if (selectedReportType === 'users') {
          const r = await getUsersReport();
          if (active) setUsersReport(r);
        } else if (selectedReportType === 'alerts') {
          const r = await getAlertsReport();
          if (active) setAlertsReport(r);
        }
      } catch (error) {
        console.error('Greška pri učitavanju izvještaja:', error);
        if (active) Alert.alert('Greška', 'Nije moguće učitati izvještaj. Pokušajte ponovo.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, router, selectedReportType, selectedPeriod]);

  const handleReportTypeChange = (type: ReportType) => {
    setSelectedReportType(type);
    setShowReportTypes(false);
  };

  const handlePeriodChange = (period: ReportPeriod) => {
    setSelectedPeriod(period);
    setShowPeriods(false);
  };

  const handleExport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    } else {
      Alert.alert(
        'Izvoz izvještaja',
        'Izvoz u PDF/štampanje je dostupno u web verziji aplikacije.',
        [{ text: 'OK' }],
      );
    }
  };

  const getReportTitle = () => {
    const reportType = reportTypes.find((r) => r.id === selectedReportType);
    const period = timePeriods.find((p) => p.id === selectedPeriod);
    return `${reportType?.label} - ${period?.label}`;
  };

  const renderActions = () => (
    <View style={styles.reportActions}>
      <Button
        title="Preuzmi PDF"
        variant="outline"
        size="small"
        leftIcon={<Download size={16} color={Colors.primary} />}
        onPress={handleExport}
      />
      <Button
        title="Štampaj"
        size="small"
        style={{ marginLeft: 8 }}
        onPress={handleExport}
      />
    </View>
  );

  const renderChartReport = (
    report: ChartReport,
    unit: string,
    barColor: string,
  ) => {
    const maxValue = Math.max(1, ...report.buckets.map((d) => d.value));

    return (
      <View style={styles.reportContent}>
        <Text style={styles.reportTitle}>{getReportTitle()}</Text>

        <View style={styles.chartContainer}>
          <View style={styles.yAxis}>
            <Text style={styles.axisLabel}>{formatNumber(maxValue)} {unit}</Text>
            <Text style={styles.axisLabel}>{formatNumber(Math.round(maxValue / 2))} {unit}</Text>
            <Text style={styles.axisLabel}>0 {unit}</Text>
          </View>

          <View style={styles.chart}>
            {report.buckets.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(report.total)} {unit}</Text>
            <Text style={styles.statLabel}>Ukupno</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(report.average)} {unit}</Text>
            <Text style={styles.statLabel}>Prosjek po periodu</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTrend(report.trendPct)}</Text>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>

        {renderActions()}
      </View>
    );
  };

  const renderUsersReport = (report: UsersReport) => (
    <View style={styles.reportContent}>
      <Text style={styles.reportTitle}>{getReportTitle()}</Text>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Korisnik</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Uloga</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Potrošnja</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Računi</Text>
        </View>

        {report.rows.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>Nema podataka o korisnicima.</Text>
          </View>
        ) : (
          report.rows.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{row.name}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{row.roleLabel}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatNumber(row.consumption)} m³</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{row.billsPaid}/{row.billsTotal}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.totalUsers}</Text>
          <Text style={styles.statLabel}>Ukupno korisnika</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.newThisMonth}</Text>
          <Text style={styles.statLabel}>Novih ovaj mjesec</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.collectionRate}%</Text>
          <Text style={styles.statLabel}>Stopa naplate</Text>
        </View>
      </View>

      {renderActions()}
    </View>
  );

  const renderAlertsReport = (report: AlertsReport) => (
    <View style={styles.reportContent}>
      <Text style={styles.reportTitle}>{getReportTitle()}</Text>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Alarm</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Tip</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Datum</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
        </View>

        {report.rows.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>Nema alarma.</Text>
          </View>
        ) : (
          report.rows.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{row.title}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{row.typeLabel}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(row.date)}</Text>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1, color: row.resolved ? Colors.success : Colors.warning },
                ]}
              >
                {row.resolved ? 'Riješen' : 'Aktivan'}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.total}</Text>
          <Text style={styles.statLabel}>Ukupno alarma</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.active}</Text>
          <Text style={styles.statLabel}>Aktivnih</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{report.resolved}</Text>
          <Text style={styles.statLabel}>Riješenih</Text>
        </View>
      </View>

      {renderActions()}
    </View>
  );

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Učitavanje izvještaja...</Text>
        </View>
      );
    }

    switch (selectedReportType) {
      case 'consumption':
        return consumption ? renderChartReport(consumption, 'm³', Colors.primary) : null;
      case 'financial':
        return financial ? renderChartReport(financial, 'KM', Colors.secondary) : null;
      case 'users':
        return usersReport ? renderUsersReport(usersReport) : null;
      case 'alerts':
        return alertsReport ? renderAlertsReport(alertsReport) : null;
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Izvještaji</Text>
        <BarChart3 size={24} color={Colors.primary} />
      </View>

      <View style={styles.filters}>
        <View style={[styles.filterGroup, showReportTypes && styles.filterGroupElevated]}>
          <Text style={styles.filterLabel}>Tip izvještaja:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowReportTypes(!showReportTypes)}
          >
            <View style={styles.dropdownContent}>
              {reportTypes.find((r) => r.id === selectedReportType)?.icon}
              <Text style={styles.dropdownText}>
                {reportTypes.find((r) => r.id === selectedReportType)?.label}
              </Text>
            </View>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>

          {showReportTypes && (
            <View style={styles.dropdownMenu}>
              {reportTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.dropdownMenuItem,
                    selectedReportType === type.id && styles.dropdownMenuItemActive,
                  ]}
                  onPress={() => handleReportTypeChange(type.id)}
                >
                  {type.icon}
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      selectedReportType === type.id && styles.dropdownMenuItemTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.filterGroup, showPeriods && styles.filterGroupElevated]}>
          <Text style={styles.filterLabel}>Period:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowPeriods(!showPeriods)}
          >
            <View style={styles.dropdownContent}>
              <Calendar size={20} color={Colors.primary} />
              <Text style={styles.dropdownText}>
                {timePeriods.find((p) => p.id === selectedPeriod)?.label}
              </Text>
            </View>
            <ChevronDown size={20} color={Colors.textLight} />
          </TouchableOpacity>

          {showPeriods && (
            <View style={styles.dropdownMenu}>
              {timePeriods.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.dropdownMenuItem,
                    selectedPeriod === period.id && styles.dropdownMenuItemActive,
                  ]}
                  onPress={() => handlePeriodChange(period.id)}
                >
                  <Text
                    style={[
                      styles.dropdownMenuItemText,
                      selectedPeriod === period.id && styles.dropdownMenuItemTextActive,
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <Card style={styles.reportCard}>{renderReportContent()}</Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filters: {
    marginBottom: 16,
    zIndex: 10,
  },
  filterGroup: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  filterGroupElevated: {
    zIndex: 20,
    elevation: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownMenuItemActive: {
    backgroundColor: Colors.highlight,
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  dropdownMenuItemTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  reportCard: {
    marginBottom: 16,
  },
  reportContent: {
    padding: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 24,
  },
  yAxis: {
    width: 60,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  chart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingTop: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    width: '60%',
    minHeight: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 12,
    color: Colors.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tableContainer: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.highlight,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.text,
  },
});
