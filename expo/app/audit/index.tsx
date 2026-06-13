import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { History } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAuditLog, AuditEntry, AUDIT_ENTITY_LABELS } from '@/lib/api/audit';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Kreirano', UPDATE: 'Izmijenjeno', DELETE: 'Obrisano',
};
const ACTION_COLORS: Record<string, string> = {
  INSERT: '#4CAF50', UPDATE: '#FF9800', DELETE: '#F44336',
};

const FILTERS: { value: string; label: string }[] = [
  { value: 'all',            label: 'Sve' },
  { value: 'invoices',       label: 'Računi' },
  { value: 'payments',       label: 'Uplate' },
  { value: 'meter_readings', label: 'Očitanja' },
  { value: 'tasks',          label: 'Zadaci' },
  { value: 'materials',      label: 'Artikli' },
  { value: 'connections',    label: 'Priključci' },
];

const fmtValue = (v: any): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'da' : 'ne';
  const s = String(v);
  return s.length > 28 ? s.slice(0, 28) + '…' : s;
};

const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.toLocaleDateString('bs-BA')} ${d.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function AuditLogScreen() {
  const router = useRouter();
  const [entries, setEntries]   = useState<AuditEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const [offset, setOffset]     = useState(0);
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async (entity = filter) => {
    try {
      const data = await getAuditLog({ limit: PAGE_SIZE, offset: 0, entity });
      setEntries(data);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(PAGE_SIZE);
    } catch (e) {
      captureError(e, { screen: 'audit', action: 'fetch' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const changeFilter = (v: string) => {
    setFilter(v);
    setLoading(true);
    fetchData(v);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getAuditLog({ limit: PAGE_SIZE, offset, entity: filter });
      setEntries(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setOffset(prev => prev + PAGE_SIZE);
    } catch (e) {
      captureError(e, { screen: 'audit', action: 'loadMore' });
    } finally {
      setLoadingMore(false);
    }
  };

  const renderItem = ({ item }: { item: AuditEntry }) => {
    const isOpen = expanded === item.id;
    const entityLabel = AUDIT_ENTITY_LABELS[item.entity] ?? item.entity;
    return (
      <Card style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(isOpen ? null : item.id)}
        >
          <View style={styles.topRow}>
            <Badge label={ACTION_LABELS[item.action] ?? item.action}
              color={ACTION_COLORS[item.action] ?? Colors.primary} size="small" />
            <Text style={styles.entity}>{entityLabel}</Text>
            <Text style={styles.time}>{fmtTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.user}>
            {item.userName ?? 'Sistem'}{item.entity_id ? `  ·  #${String(item.entity_id).slice(0, 8)}` : ''}
          </Text>

          {item.action === 'UPDATE' && item.changes.length > 0 && (
            <View style={styles.changes}>
              {(isOpen ? item.changes : item.changes.slice(0, 2)).map((c) => (
                <Text key={c.field} style={styles.changeLine}>
                  <Text style={styles.changeField}>{c.field}</Text>
                  {': '}{fmtValue(c.from)} → {fmtValue(c.to)}
                </Text>
              ))}
              {!isOpen && item.changes.length > 2 && (
                <Text style={styles.moreHint}>+ još {item.changes.length - 2} izmjena…</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Evidencija izmjena" showBack onLeftPress={() => router.back()} />

      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, filter === f.value && styles.chipActive]}
              onPress={() => changeFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={<History size={48} color={Colors.textLight} />}
              title="Nema zapisa"
              message="Izmjene poslovnih podataka će se pojaviti ovdje."
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

  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow:  { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:   { fontSize: 12, color: Colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  row:     { padding: 14, marginBottom: 10 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entity:  { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  time:    { fontSize: 11, color: Colors.textLight },
  user:    { fontSize: 12, color: Colors.textLight, marginTop: 4 },

  changes:     { marginTop: 8, backgroundColor: '#fafafa', borderRadius: 8, padding: 10, gap: 3 },
  changeLine:  { fontSize: 12, color: Colors.text },
  changeField: { fontWeight: '700', color: Colors.primary },
  moreHint:    { fontSize: 11, color: Colors.textLight, fontStyle: 'italic', marginTop: 2 },
});
