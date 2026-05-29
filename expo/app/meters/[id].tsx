import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User, MapPin, Calendar, TrendingUp, Droplet, Hash,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { Card } from '@/components/ui/Card';
import { ReadingCard } from '@/components/readings/ReadingCard';
import { useAuthStore } from '@/store/auth-store';
import { getMeterById } from '@/lib/api/meters';
import { getReadingsByMeter, updateReadingStatus } from '@/lib/api/readings';
import Colors from '@/constants/colors';

const FILTER_LABELS: Record<string, string> = {
  all: 'Svi',
  pending: 'Na čekanju',
  verified: 'Potvrđeni',
  rejected: 'Odbijeni',
};

export default function MeterDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [meter, setMeter] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);
  const [stats, setStats] = useState({
    totalReadings: 0,
    totalConsumption: 0,
    avgMonthly: 0,
    lastReadingDate: null as number | null,
  });

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const applyFilter = useCallback((data: any[], status: string) => {
    setFilteredReadings(status === 'all' ? data : data.filter(r => r.status === status));
  }, []);

  const loadData = async (meterId: string) => {
    setIsLoading(true);
    try {
      const [meterData, readingsData] = await Promise.all([
        getMeterById(meterId),
        getReadingsByMeter(meterId),
      ]);
      setMeter(meterData);
      setReadings(readingsData);
      applyFilter(readingsData, filterStatus);
      updateStats(readingsData);
      updateChart(readingsData);
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati podatke vodomjera.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStats = (data: any[]) => {
    const verified = data.filter(r => r.status === 'verified' && r.consumption);
    const totalConsumption = verified.reduce((s, r) => s + r.consumption, 0);
    const monthSpan = getMonthSpan(verified);
    const sorted = [...data].sort((a, b) => b.readingDate - a.readingDate);
    setStats({
      totalReadings: data.length,
      totalConsumption: Math.round(totalConsumption),
      avgMonthly: verified.length > 0 ? Math.round(totalConsumption / monthSpan) : 0,
      lastReadingDate: sorted[0]?.readingDate ?? null,
    });
  };

  const getMonthSpan = (data: any[]) => {
    if (data.length < 2) return 1;
    const sorted = [...data].sort((a, b) => a.readingDate - b.readingDate);
    const first = new Date(sorted[0].readingDate);
    const last = new Date(sorted[sorted.length - 1].readingDate);
    return Math.max(1, (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1);
  };

  const updateChart = (data: any[]) => {
    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const total = data
        .filter(r => r.status === 'verified' && r.consumption)
        .filter(r => {
          const rd = new Date(r.readingDate);
          return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
        })
        .reduce((s, r) => s + r.consumption, 0);
      return {
        label: d.toLocaleDateString('bs-BA', { month: 'short' }),
        value: Math.round(total),
      };
    });
    setMonthlyData(monthly);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    applyFilter(readings, status);
  };

  const handleVerify = async (readingId: string) => {
    try {
      await updateReadingStatus(readingId, 'verified');
      const updated = readings.map(r => r.id === readingId ? { ...r, status: 'verified' } : r);
      setReadings(updated);
      applyFilter(updated, filterStatus);
      updateStats(updated);
      updateChart(updated);
    } catch {
      Alert.alert('Greška', 'Nije moguće potvrditi očitanje.');
    }
  };

  const handleReject = async (readingId: string) => {
    try {
      await updateReadingStatus(readingId, 'rejected');
      const updated = readings.map(r => r.id === readingId ? { ...r, status: 'rejected' } : r);
      setReadings(updated);
      applyFilter(updated, filterStatus);
      updateStats(updated);
    } catch {
      Alert.alert('Greška', 'Nije moguće odbiti očitanje.');
    }
  };

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getMeterTypeLabel = (type?: string) => {
    switch (type) {
      case 'standard': return 'Standardni';
      case 'smart': return 'Pametni';
      case 'industrial': return 'Industrijski';
      default: return type || '';
    }
  };

  const canVerify =
    user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'finance';

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!meter) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Vodomjer nije pronađen.</Text>
      </View>
    );
  }

  const maxConsumption = Math.max(...monthlyData.map(d => d.value), 1);
  const chartEmpty = monthlyData.every(d => d.value === 0);

  return (
    <>
      <Header
        title={meter.serialNumber}
        showBack
        showMenu
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Meter info card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <View style={styles.infoStatusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: meter.status === 'active' ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>
                {meter.status === 'active' ? 'Aktivan' : 'Neaktivan'}
              </Text>
            </View>
            <Text style={styles.typeText}>{getMeterTypeLabel(meter.type)}</Text>
          </View>

          {meter.userName ? (
            <View style={styles.infoRow}>
              <User size={14} color={Colors.textLight} />
              <Text style={styles.infoText}>{meter.userName}</Text>
            </View>
          ) : null}

          {(meter.locationName || meter.address) ? (
            <View style={styles.infoRow}>
              <MapPin size={14} color={Colors.textLight} />
              <Text style={styles.infoText}>
                {[meter.locationName, meter.address].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          {meter.installDate ? (
            <View style={styles.infoRow}>
              <Calendar size={14} color={Colors.textLight} />
              <Text style={styles.infoText}>Instaliran: {fmt(meter.installDate)}</Text>
            </View>
          ) : null}
        </Card>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalReadings}</Text>
              <Text style={styles.statLabel}>Očitanja</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalConsumption}</Text>
              <Text style={styles.statLabel}>Ukupno (m³)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.avgMonthly}</Text>
              <Text style={styles.statLabel}>Prosjek/mj</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue} numberOfLines={1}>
                {stats.lastReadingDate ? fmt(stats.lastReadingDate).slice(0, 5) : '—'}
              </Text>
              <Text style={styles.statLabel}>Zadnje</Text>
            </View>
          </View>
        </Card>

        {/* Bar chart */}
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <TrendingUp size={15} color={Colors.primary} />
            <Text style={styles.chartTitle}>Potrošnja — zadnjih 6 mjeseci (m³)</Text>
          </View>
          {chartEmpty ? (
            <Text style={styles.chartEmpty}>Nema verificiranih očitanja</Text>
          ) : (
            <View style={styles.chart}>
              {monthlyData.map((item, i) => (
                <View key={i} style={styles.barWrapper}>
                  {item.value > 0 && (
                    <Text style={styles.barValueLabel}>{item.value}</Text>
                  )}
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.bar,
                      { height: Math.max((item.value / maxConsumption) * 100, item.value > 0 ? 4 : 2) }
                    ]} />
                  </View>
                  <Text style={styles.barMonthLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Readings header + filter */}
        <View style={styles.readingsHeaderRow}>
          <Text style={styles.readingsTitle}>Historija očitanja</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{readings.length}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {Object.keys(FILTER_LABELS).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
              onPress={() => handleFilterChange(s)}
            >
              <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
                {FILTER_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Readings list */}
        {filteredReadings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Droplet size={32} color={Colors.disabled} />
            <Text style={styles.emptyText}>Nema očitanja za odabrani filter</Text>
          </Card>
        ) : (
          filteredReadings.map(r => (
            <ReadingCard
              key={r.id}
              reading={r}
              showMeterInfo={false}
              onVerify={canVerify && r.status === 'pending' ? () => handleVerify(r.id) : undefined}
              onReject={canVerify && r.status === 'pending' ? () => handleReject(r.id) : undefined}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    padding: 14,
    marginBottom: 12,
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  typeText: {
    fontSize: 12,
    color: Colors.textLight,
    backgroundColor: Colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textLight,
    flex: 1,
  },
  statsCard: {
    padding: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 130,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: 130,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 2,
  },
  barValueLabel: {
    fontSize: 9,
    color: Colors.textLight,
    marginBottom: 2,
  },
  barMonthLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  chartEmpty: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 16,
  },
  readingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  readingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
