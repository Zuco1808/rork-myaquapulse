import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  Droplet,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Camera,
  Wifi,
  ClipboardList,
  BarChart2,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import {
  getReadings,
  getReadingsByConnection,
  getReadingsByUser,
} from '@/lib/api/readings';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

const READ_TYPE_LABEL: Record<string, string> = {
  manual: 'Ručno',
  smart: 'Pametni mjerač',
  estimated: 'Procjena',
  ocr: 'OCR kamera',
};

const READ_TYPE_ICON = (type: string) => {
  switch (type) {
    case 'smart': return <Wifi size={14} color="#4CAF50" />;
    case 'ocr': return <Camera size={14} color="#FF9800" />;
    case 'estimated': return <ClipboardList size={14} color="#9E9E9E" />;
    default: return <Droplet size={14} color={Colors.primary} />;
  }
};

const formatDate = (ts: number | undefined | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (ts: number | undefined | null) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ConsumptionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isEndUser } = usePermissions();
  const { connectionId } = useLocalSearchParams<{ connectionId?: string }>();

  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      let data: any[];
      if (connectionId) {
        data = await getReadingsByConnection(connectionId);
      } else if (isEndUser) {
        data = await getReadingsByUser(user.id);
      } else {
        data = await getReadings();
      }
      setReadings(data);
    } catch (err) {
      captureError(err, { screen: 'consumption', action: 'fetchReadings' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id, connectionId]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  /* ── Stats ─────────────────────────────────────── */
  const lastReading = readings[0];
  const totalReadings = readings.length;

  const totalConsumption = (() => {
    if (readings.length < 2) return null;
    const sorted = [...readings].sort((a, b) => a.readingDate - b.readingDate);
    return sorted[sorted.length - 1].value - sorted[0].value;
  })();

  /* ── Card render ───────────────────────────────── */
  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => {
        setSelected(item);
        setDetailVisible(true);
      }}
      activeOpacity={0.8}
    >
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          {/* Left: icon + date */}
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              {READ_TYPE_ICON(item.readMethod)}
            </View>
            <View>
              <Text style={styles.cardDate}>{formatDate(item.readingDate)}</Text>
              <Text style={styles.cardType}>
                {READ_TYPE_LABEL[item.readMethod] || item.readMethod}
              </Text>
              {item.meterSerialNumber && (
                <Text style={styles.cardSerial}>{item.meterSerialNumber}</Text>
              )}
            </View>
          </View>

          {/* Right: value + status */}
          <View style={styles.cardRight}>
            <Text style={styles.cardValue}>{item.value} m³</Text>
            <View
              style={[
                styles.verifiedBadge,
                {
                  backgroundColor:
                    item.status === 'verified' ? '#E8F5E9' : '#FFF8E1',
                },
              ]}
            >
              {item.status === 'verified' ? (
                <CheckCircle size={11} color="#4CAF50" />
              ) : (
                <Clock size={11} color="#FF9800" />
              )}
              <Text
                style={[
                  styles.verifiedText,
                  {
                    color:
                      item.status === 'verified' ? '#4CAF50' : '#FF9800',
                  },
                ]}
              >
                {item.status === 'verified' ? 'Verifikovano' : 'Na čekanju'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  /* ── Detail modal ──────────────────────────────── */
  const renderDetail = () => {
    if (!selected) return null;
    return (
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalji očitanja</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Row label="Vrijednost" value={`${selected.value} m³`} bold />
              <Row label="Datum" value={formatDateTime(selected.readingDate)} />
              <Row
                label="Metod"
                value={READ_TYPE_LABEL[selected.readMethod] || selected.readMethod}
              />
              {selected.meterSerialNumber && (
                <Row label="Vodomjer" value={selected.meterSerialNumber} />
              )}
              <Row
                label="Status"
                value={selected.status === 'verified' ? 'Verifikovano' : 'Na čekanju'}
              />
              {selected.notes && (
                <Row label="Napomena" value={selected.notes} />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDetailVisible(false)}
              >
                <Text style={styles.closeBtnText}>Zatvori</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ── Loading ───────────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Historija očitanja"
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
        title="Historija očitanja"
        showBack
        onLeftPress={() => router.back()}
      />

      {/* Stats row */}
      {readings.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <BarChart2 size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{totalReadings}</Text>
            <Text style={styles.statLabel}>Očitanja</Text>
          </View>
          {lastReading && (
            <View style={styles.statBox}>
              <Droplet size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{lastReading.value} m³</Text>
              <Text style={styles.statLabel}>Zadnje stanje</Text>
            </View>
          )}
          {totalConsumption != null && totalConsumption > 0 && (
            <View style={styles.statBox}>
              <Droplet size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{totalConsumption.toFixed(1)} m³</Text>
              <Text style={styles.statLabel}>Ukupno (period)</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={readings}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Nema očitanja"
            message="Za ovaj priključak još nema unesenih očitanja."
            icon={<Droplet size={48} color={Colors.textLight} />}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {renderDetail()}
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text
        style={[
          rowStyles.value,
          bold && { fontWeight: 'bold', color: Colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textLight },
  value: {
    fontSize: 14,
    color: Colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.highlight,
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 2,
  },
  statLabel: { fontSize: 11, color: Colors.textLight },

  list: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
  },
  card: { marginBottom: 10 },

  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cardType: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  cardSerial: { fontSize: 11, color: Colors.textLight, marginTop: 1 },

  cardRight: { alignItems: 'flex-end' },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  verifiedText: { fontSize: 10, fontWeight: '600' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  modalBody: { padding: 16 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  closeBtn: {
    backgroundColor: Colors.highlight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
