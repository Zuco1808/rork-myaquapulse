import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { DollarSign, Building } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCommissions, DistributorCommission, TIER_LABELS } from '@/lib/api/commissions';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

const TIER_COLORS: Record<string, string> = {
  basic: '#9E9E9E', standard: '#2196F3', premium: '#9C27B0',
};

export default function CommissionsScreen() {
  const router = useRouter();
  const [rows, setRows]       = useState<DistributorCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRows(await getCommissions());
    } catch (e) {
      captureError(e, { screen: 'commissions', action: 'fetch' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const grandTotal = rows.reduce((s, d) => s + d.totalCommission, 0);

  const renderItem = ({ item }: { item: DistributorCommission }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.distName}>{item.distributorName}</Text>
        <Text style={styles.distTotal}>{item.totalCommission.toFixed(2)} €</Text>
      </View>
      <Text style={styles.distSub}>
        {item.utilities.length} vodovod(a)  ·  pretplata {item.totalSubscription.toFixed(2)} €/mj.
      </Text>

      {item.utilities.map((u) => (
        <View key={u.utilityId} style={styles.uRow}>
          <View style={styles.uLeft}>
            <Building size={14} color={Colors.textLight} />
            <Text style={styles.uName} numberOfLines={1}>{u.utilityName}</Text>
            <Badge label={TIER_LABELS[u.tier] ?? u.tier} color={TIER_COLORS[u.tier] ?? Colors.primary} size="small" />
          </View>
          <Text style={styles.uComm}>
            {u.subscriptionFee.toFixed(2)} × {Math.round(u.rate * 100)}% = <Text style={styles.uCommVal}>{u.commission.toFixed(2)} €</Text>
          </Text>
        </View>
      ))}
    </Card>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Provizije" showBack onLeftPress={() => router.back()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(d) => d.distributorId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListHeaderComponent={
            rows.length > 0 ? (
              <View style={styles.summary}>
                <DollarSign size={20} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Ukupno mjesečno (procjena)</Text>
                <Text style={styles.summaryValue}>{grandTotal.toFixed(2)} €</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={<DollarSign size={48} color={Colors.textLight} />}
              title="Nema podataka o provizijama"
              message="Postavite paket i mjesečnu pretplatu na vodovodima da bi se obračunala provizija."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16, paddingBottom: 40, flexGrow: 1 },

  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryLabel: { flex: 1, fontSize: 13, color: Colors.textLight },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },

  card:       { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distName:   { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  distTotal:  { fontSize: 16, fontWeight: '800', color: Colors.primary },
  distSub:    { fontSize: 12, color: Colors.textLight, marginTop: 2, marginBottom: 8 },

  uRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  uLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  uName: { fontSize: 13, color: Colors.text, flexShrink: 1 },
  uComm: { fontSize: 11, color: Colors.textLight },
  uCommVal: { fontSize: 12, color: Colors.text, fontWeight: '700' },
});
