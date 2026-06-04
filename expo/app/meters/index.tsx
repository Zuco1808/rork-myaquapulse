import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Droplet,
  MapPin,
  CreditCard,
  BarChart2,
  AlertTriangle,
  Plus,
  User,
  Edit,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { getMeters, getMetersByUser } from '@/lib/api/meters';
import { usePermissions } from '@/lib/use-permissions';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

export default function MetersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const { canManageMeters: canManage, isEndUser } = usePermissions();

  const fetchData = async () => {
    if (!user) return;
    setFetchError(false);
    try {
      const data =
        isEndUser
          ? await getMetersByUser(user.id)
          : await getMeters();
      setMeters(data);
    } catch (err) {
      captureError(err, { screen: 'meters', action: 'fetchMeters' });
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id, user?.role]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getMeterTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':   return 'Standardni';
      case 'smart':      return 'Pametni';
      case 'industrial': return 'Industrijski';
      case 'prepaid':    return 'Prepaid';
      default: return type || 'Nepoznat';
    }
  };

  const getMeterTypeColor = (type: string) => {
    switch (type) {
      case 'smart':      return '#4CAF50';
      case 'industrial': return '#9C27B0';
      case 'prepaid':    return '#FF9800';
      default: return Colors.primary;
    }
  };

  const renderCard = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.serial}>{item.serialNumber}</Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getMeterTypeColor(item.meter_type) + '22' },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: getMeterTypeColor(item.meter_type) },
              ]}
            >
              {getMeterTypeLabel(item.meter_type)}
            </Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.is_active ? Colors.success : Colors.error },
            ]}
          />
          <Text style={styles.statusText}>
            {item.is_active ? 'Aktivan' : 'Neaktivan'}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailRow}>
        <MapPin size={14} color={Colors.textLight} />
        <Text style={styles.detailText} numberOfLines={2}>
          {item.address || '—'}
        </Text>
      </View>
      {!isEndUser && (
        <View style={styles.detailRow}>
          <User size={14} color={Colors.textLight} />
          <Text style={styles.detailText}>{item.userName || '—'}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            router.push((`/bills?connectionId=${item.id}`) as any)
          }
        >
          <CreditCard size={15} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Računi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            router.push((`/consumption?connectionId=${item.id}`) as any)
          }
        >
          <BarChart2 size={15} color={Colors.primary} />
          <Text style={styles.actionBtnText}>Očitanja</Text>
        </TouchableOpacity>

        {isEndUser && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() =>
              router.push(
                (`/support/report-issue?connectionId=${item.id}&utilityId=${item.utility_id}`) as any,
              )
            }
          >
            <AlertTriangle size={15} color={Colors.error} />
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
              Kvar
            </Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 'auto' }]}
            onPress={() => router.push((`/meters/edit/${item.id}`) as any)}
          >
            <Edit size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title={isEndUser ? 'Moji priključci' : 'Vodomjeri'}
          showBack
          onLeftPress={() => router.back()}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEndUser ? 'Moji priključci' : 'Vodomjeri'}
        showBack
        onLeftPress={() => router.back()}
      />

      <FlatList
        data={meters}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          fetchError
            ? <EmptyState
                title="Greška pri učitavanju"
                message="Provjeri vezu i pokušaj ponovo."
                icon={<AlertTriangle size={48} color={Colors.error} />}
                actionLabel="Pokušaj ponovo"
                onAction={fetchData}
              />
            : <EmptyState
                title="Nema priključaka"
                message={isEndUser ? 'Nemate aktivnih priključaka.' : 'Nema registrovanih vodomjera.'}
                icon={<Droplet size={48} color={Colors.textLight} />}
              />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/meters/add' as any)}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  card: { marginBottom: 16 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 10,
  },
  cardHeaderLeft: { flex: 1 },
  serial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: { fontSize: 11, fontWeight: '600' },

  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, color: Colors.textLight },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textLight,
    marginLeft: 6,
    flex: 1,
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    gap: 4,
  },
  actionBtnDanger: {
    backgroundColor: '#FFEBEE',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  iconBtn: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
