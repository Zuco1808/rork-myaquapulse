import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFreshFocus } from '@/lib/use-fresh-focus';
import {
  AlertTriangle,
  Search,
  PlayCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getTasks, getMyTasks, updateTaskStatus } from '@/lib/api/tasks';
import { Task } from '@/types/user';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

/* ── helpers ─────────────────────────────────────────── */
type TaskStatus = Task['status'];

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Hitno', high: 'Visok',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#F44336', high: '#FF9800',
};
const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Otvoreno', in_progress: 'U toku', done: 'Završeno', cancelled: 'Otkazano',
};
const STATUS_COLORS: Record<TaskStatus, string> = {
  open: '#FFC107', in_progress: '#2196F3', done: '#4CAF50', cancelled: '#9E9E9E',
};

/* ── component ───────────────────────────────────────── */
export default function AlertsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { isWorker } = usePermissions();

  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ── fetch only high/urgent tasks ────────────────── */
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const all = isWorker
        ? await getMyTasks(user!.id, user!.utility_id ?? '')
        : await getTasks();

      // Only keep high + urgent, active (open/in_progress)
      const alerts = all.filter(
        (t) =>
          (t.priority === 'high' || t.priority === 'urgent') &&
          (t.status === 'open' || t.status === 'in_progress'),
      );
      setTasks(alerts);
    } catch (e: any) {
      captureError(e, { screen: 'alerts', action: 'fetchAlerts' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFreshFocus(fetchAlerts);
  const onRefresh = () => { setRefreshing(true); fetchAlerts(); };

  /* ── quick actions ───────────────────────────────── */
  const handleStart = async (t: Task) => {
    setActionLoading(t.id);
    try {
      const assignTo = isWorker && !t.assigned_to ? user?.id : undefined;
      await updateTaskStatus(t.id, 'in_progress', undefined, assignTo);
      fetchAlerts();
    } catch (e: any) {
      Alert.alert('Greška', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDone = (t: Task) => {
    Alert.alert(
      'Zatvori alarm',
      `Označiti alarm "${t.title}" kao završen?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Završi',
          onPress: async () => {
            setActionLoading(t.id);
            try {
              await updateTaskStatus(t.id, 'done');
              setTasks((prev) => prev.filter((x) => x.id !== t.id));
            } catch (e: any) {
              Alert.alert('Greška', e.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  /* ── filter ──────────────────────────────────────── */
  const filtered = tasks.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.connection_address ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  /* ── card ────────────────────────────────────────── */
  const renderCard = ({ item: t }: { item: Task }) => (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => router.push('/tasks' as any)}
        activeOpacity={0.7}
      >
        {/* Priority flame + title */}
        <View style={styles.titleRow}>
          <Flame size={16} color={PRIORITY_COLORS[t.priority] ?? '#FF9800'} />
          <Text style={styles.cardTitle} numberOfLines={1}>{t.title}</Text>
          <ChevronRight size={16} color={Colors.textLight} />
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <Badge
            label={PRIORITY_LABELS[t.priority] ?? t.priority}
            color={PRIORITY_COLORS[t.priority] ?? '#FF9800'}
            size="small"
          />
          <Badge
            label={STATUS_LABELS[t.status]}
            color={STATUS_COLORS[t.status]}
            size="small"
            style={{ marginLeft: 6 }}
          />
        </View>

        {/* Meta info */}
        {t.description ? (
          <Text style={styles.desc} numberOfLines={2}>{t.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          {t.connection_address ? (
            <View style={styles.metaItem}>
              <MapPin size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{t.connection_address}</Text>
            </View>
          ) : null}
          {t.due_date ? (
            <View style={styles.metaItem}>
              <Calendar size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{t.due_date}</Text>
            </View>
          ) : null}
          {t.assigned_to_name ? (
            <View style={styles.metaItem}>
              <User size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{t.assigned_to_name}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={styles.cardActions}>
        {t.status === 'open' && (
          <Button
            title="Počni"
            size="small"
            variant="outline"
            leftIcon={<PlayCircle size={14} color={Colors.primary} />}
            onPress={() => handleStart(t)}
            isLoading={actionLoading === t.id}
            style={styles.actBtn}
          />
        )}
        {t.status === 'in_progress' && (
          <Button
            title="Završi"
            size="small"
            variant="outline"
            leftIcon={<CheckCircle size={14} color={Colors.success} />}
            onPress={() => handleDone(t)}
            isLoading={actionLoading === t.id}
            style={[styles.actBtn, { borderColor: Colors.success }]}
          />
        )}
        <Button
          title="Detalji"
          size="small"
          variant="outline"
          onPress={() => router.push('/tasks' as any)}
          style={styles.actBtn}
        />
      </View>
    </Card>
  );

  /* ── render ──────────────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Alarmi" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Alarmi" showBack onLeftPress={() => router.back()} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={16} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pretraži alarme..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <AlertTriangle size={14} color={Colors.error} />
        <Text style={styles.summaryText}>
          {' '}{filtered.length} aktivnih alarma (visok/hitan prioritet)
        </Text>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderCard}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="Nema alarma"
            message="Trenutno nema aktivnih zadataka visokog ili hitnog prioriteta."
            icon={<AlertTriangle size={48} color={Colors.textLight} />}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.highlight, borderRadius: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  summary: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6,
  },
  summaryText: { fontSize: 12, color: Colors.textLight },

  list: { padding: 16, paddingBottom: Platform.OS === 'android' ? 80 : 40 },
  card: { marginBottom: 12 },

  cardBody: { padding: 14 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  badgeRow:  { flexDirection: 'row', marginBottom: 8 },
  desc:      { fontSize: 13, color: Colors.textLight, marginBottom: 8, lineHeight: 18 },
  metaRow:   { gap: 4 },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:  { fontSize: 12, color: Colors.textLight },

  cardActions: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 10,
  },
  actBtn: { flex: 1 },
});
