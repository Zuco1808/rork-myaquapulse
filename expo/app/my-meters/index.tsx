import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Droplet,
  CreditCard,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Wallet,
  Calendar,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { getMetersByUser } from '@/lib/api/meters';
import { getInvoicesByUser } from '@/lib/api/bills';
import Colors from '@/constants/colors';

// Bill statuses that count as outstanding debt for a citizen.
const UNPAID_STATUSES = ['pending', 'issued', 'overdue', 'draft'];

const BILL_STATUS_LABELS: Record<string, string> = {
  draft: 'Nacrt',
  issued: 'Izdat',
  pending: 'Na čekanju',
  overdue: 'Prekoračen',
  paid: 'Plaćeno',
  cancelled: 'Otkazan',
};

interface PortalStats {
  metersCount: number;
  totalDebt: number;
  overdueCount: number;
}

export default function CitizenPortalScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [meters, setMeters] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [stats, setStats] = useState<PortalStats>({ metersCount: 0, totalDebt: 0, overdueCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [metersData, billsData] = await Promise.all([
        getMetersByUser(user.id).catch(() => []),
        getInvoicesByUser(user.id).catch(() => []),
      ]);

      const unpaid = (billsData as any[]).filter((b) => UNPAID_STATUSES.includes(b.status));
      const totalDebt = unpaid.reduce((sum, b) => sum + (b.amount || 0), 0);
      const overdueCount = unpaid.filter((b) => b.status === 'overdue').length;

      setMeters(metersData as any[]);
      setUnpaidBills(unpaid);
      setStats({
        metersCount: (metersData as any[]).length,
        totalDebt: Math.round(totalDebt * 100) / 100,
        overdueCount,
      });
    } catch {
      setMeters([]);
      setUnpaidBills([]);
      setStats({ metersCount: 0, totalDebt: 0, overdueCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getMeterTypeLabel = (type?: string) => {
    switch (type) {
      case 'standard': return 'Standardni';
      case 'smart': return 'Pametni';
      case 'industrial': return 'Industrijski';
      default: return type || '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Moj pregled"
        showBack
        showNotifications
        onLeftPress={() => router.back()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#e8f4ff' }]}>
              <Droplet size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.metersCount}</Text>
            <Text style={styles.statLabel}>Moji vodomjeri</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stats.totalDebt > 0 ? '#fff3f3' : '#eafaf0' }]}>
              <Wallet size={20} color={stats.totalDebt > 0 ? Colors.error : Colors.success} />
            </View>
            <Text style={[styles.statValue, { fontSize: 18 }, stats.totalDebt > 0 && { color: Colors.error }]}>
              {stats.totalDebt.toFixed(2)} KM
            </Text>
            <Text style={styles.statLabel}>Ukupan dug</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fff8e1' }]}>
              <AlertTriangle size={20} color={stats.overdueCount > 0 ? Colors.error : Colors.warning} />
            </View>
            <Text style={[styles.statValue, stats.overdueCount > 0 && { color: Colors.error }]}>
              {stats.overdueCount}
            </Text>
            <Text style={styles.statLabel}>Prekoračeni</Text>
          </View>
        </View>

        {/* My meters */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Moji vodomjeri</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{meters.length}</Text>
          </View>
        </View>

        {meters.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="Nema vodomjera"
              message="Trenutno nemate registrovanih vodomjera."
              icon={<Droplet size={40} color={Colors.disabled} />}
            />
          </Card>
        ) : (
          meters.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/meters/${m.id}` as any)}
            >
              <Card style={styles.itemCard}>
                <View style={styles.itemIconWrap}>
                  <Droplet size={20} color={Colors.primary} />
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{m.serialNumber}</Text>
                    <View style={styles.statusRow}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: m.status === 'active' ? Colors.success : Colors.error },
                      ]} />
                      <Text style={styles.statusText}>
                        {m.status === 'active' ? 'Aktivan' : 'Neaktivan'}
                      </Text>
                    </View>
                  </View>
                  {(m.locationName || m.address) ? (
                    <View style={styles.itemMetaRow}>
                      <MapPin size={13} color={Colors.textLight} />
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {[m.locationName, m.address].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  ) : null}
                  {m.type ? (
                    <Text style={styles.itemSubMeta}>{getMeterTypeLabel(m.type)}</Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color={Colors.disabled} />
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* My debts / unpaid bills */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Moji dugovi</Text>
          {unpaidBills.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/bills' as any)}>
              <Text style={styles.sectionLink}>Svi računi</Text>
            </TouchableOpacity>
          )}
        </View>

        {unpaidBills.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="Nema dugovanja"
              message="Svi vaši računi su izmireni. Hvala!"
              icon={<CreditCard size={40} color={Colors.success} />}
            />
          </Card>
        ) : (
          unpaidBills.map((b) => {
            const isOverdue = b.status === 'overdue';
            return (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/bills/${b.id}` as any)}
              >
                <Card style={styles.itemCard}>
                  <View style={[styles.itemIconWrap, isOverdue && { backgroundColor: '#fff3f3' }]}>
                    <CreditCard size={20} color={isOverdue ? Colors.error : Colors.primary} />
                  </View>
                  <View style={styles.itemBody}>
                    <View style={styles.itemTopRow}>
                      <Text style={[styles.itemTitle, isOverdue && { color: Colors.error }]}>
                        {b.amount?.toFixed(2)} KM
                      </Text>
                      <View style={[styles.billBadge, isOverdue && styles.billBadgeOverdue]}>
                        <Text style={[styles.billBadgeText, isOverdue && styles.billBadgeTextOverdue]}>
                          {BILL_STATUS_LABELS[b.status] || b.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemMetaRow}>
                      <Calendar size={13} color={isOverdue ? Colors.error : Colors.textLight} />
                      <Text style={[styles.itemMeta, isOverdue && { color: Colors.error }]}>
                        Rok plaćanja: {formatDate(b.dueDate)}
                      </Text>
                    </View>
                    {b.meterSerial ? (
                      <Text style={styles.itemSubMeta}>Vodomjer: {b.meterSerial}</Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={Colors.disabled} />
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 'auto',
    marginLeft: 8,
  },
  countText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e8f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.textLight,
    flexShrink: 1,
  },
  itemSubMeta: {
    fontSize: 12,
    color: Colors.textLight,
  },
  billBadge: {
    backgroundColor: '#e8f4ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  billBadgeOverdue: {
    backgroundColor: '#fff3f3',
  },
  billBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
  billBadgeTextOverdue: {
    color: Colors.error,
  },
  emptyCard: {
    padding: 8,
    marginBottom: 8,
  },
});
