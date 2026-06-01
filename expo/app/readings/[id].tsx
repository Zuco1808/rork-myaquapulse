import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Droplet,
  Calendar,
  User,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Edit3,
  AlertTriangle,
  Hash,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useAuthStore } from '@/store/auth-store';
import {
  getReadingById,
  updateReading,
  updateReadingStatus,
} from '@/lib/api/readings';
import Colors from '@/constants/colors';

interface DetailReading {
  id: string;
  meterId: string;
  value: number;
  previousValue?: number | null;
  consumption?: number | null;
  readingDate: number;
  readMethod?: string;
  status: 'pending' | 'verified' | 'rejected';
  imageUrl?: string | null;
  notes?: string | null;
  meterSerialNumber?: string;
  meterLocationName?: string;
  meterLocationAddress?: string;
  readByName?: string;
}

function methodLabel(m?: string): string {
  switch (m) {
    case 'manual': return 'Ručno';
    case 'ocr': return 'OCR (foto)';
    case 'citizen': return 'Građanin';
    default: return m || 'Nepoznato';
  }
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
}

export default function ReadingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [reading, setReading] = useState<DetailReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  // Reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const canManage =
    user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'finance';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getReadingById(String(id));
        if (!cancelled) setReading(data as DetailReading);
      } catch {
        if (!cancelled) {
          Alert.alert('Greška', 'Očitanje nije pronađeno.');
          router.back();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const openEdit = () => {
    if (!reading) return;
    setEditValue(String(reading.value));
    setEditNotes(reading.notes ?? '');
    setEditError('');
    setShowEditModal(true);
  };

  const confirmEdit = async () => {
    if (!reading) return;
    const v = parseFloat(editValue);
    if (isNaN(v) || v < 0) {
      setEditError('Unesite validnu numeričku vrijednost (>= 0)');
      return;
    }
    if (
      reading.previousValue !== undefined &&
      reading.previousValue !== null &&
      v < reading.previousValue
    ) {
      setEditError(`Vrijednost mora biti >= prethodne (${reading.previousValue} m³)`);
      return;
    }
    try {
      await updateReading(reading.id, { value: v, notes: editNotes });
      const newCons =
        reading.previousValue !== undefined && reading.previousValue !== null
          ? v - reading.previousValue
          : reading.consumption;
      setReading({ ...reading, value: v, notes: editNotes, consumption: newCons });
      setShowEditModal(false);
      Alert.alert('Uspjeh', 'Očitanje je ažurirano.');
    } catch {
      Alert.alert('Greška', 'Nije moguće sačuvati izmjene.');
    }
  };

  const verify = async () => {
    if (!reading) return;
    try {
      await updateReadingStatus(reading.id, 'verified');
      setReading({ ...reading, status: 'verified' });
      Alert.alert('Uspjeh', 'Očitanje je potvrđeno.');
    } catch {
      Alert.alert('Greška', 'Nije moguće potvrditi.');
    }
  };

  const openReject = () => {
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!reading) return;
    try {
      await updateReadingStatus(reading.id, 'rejected', rejectReason || undefined);
      setReading({ ...reading, status: 'rejected', notes: rejectReason });
      setShowRejectModal(false);
      Alert.alert('Uspjeh', 'Očitanje je odbijeno.');
    } catch {
      Alert.alert('Greška', 'Nije moguće odbiti.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!reading) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Očitanje nije pronađeno.</Text>
      </View>
    );
  }

  const hasAnomaly =
    reading.consumption && reading.previousValue
      ? reading.consumption > reading.previousValue * 1.3
      : false;

  return (
    <>
      <Header
        title="Detalji očitanja"
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header card with date & status */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIconBox}>
              <FileText size={22} color={Colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.date}>{formatDateTime(reading.readingDate)}</Text>
              <Text style={styles.method}>Metoda: {methodLabel(reading.readMethod)}</Text>
            </View>
            <StatusIndicator status={reading.status as any} />
          </View>
        </Card>

        {/* Meter info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Vodomjer</Text>
          {reading.meterSerialNumber ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/meters/${reading.meterId}` as any)}
              activeOpacity={0.7}
            >
              <Hash size={14} color={Colors.textLight} />
              <Text style={[styles.rowText, styles.link]}>{reading.meterSerialNumber}</Text>
            </TouchableOpacity>
          ) : null}
          {(reading.meterLocationName || reading.meterLocationAddress) ? (
            <View style={styles.row}>
              <MapPin size={14} color={Colors.textLight} />
              <Text style={styles.rowText}>
                {[reading.meterLocationName, reading.meterLocationAddress].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
          {reading.readByName ? (
            <View style={styles.row}>
              <User size={14} color={Colors.textLight} />
              <Text style={styles.rowText}>Očitao: {reading.readByName}</Text>
            </View>
          ) : null}
        </Card>

        {/* Values */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Vrijednosti</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>Stanje</Text>
            <Text style={styles.valueBig}>{reading.value} m³</Text>
          </View>
          {reading.previousValue !== undefined && reading.previousValue !== null ? (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Prethodno stanje</Text>
              <Text style={styles.value}>{reading.previousValue} m³</Text>
            </View>
          ) : null}
          {reading.consumption !== undefined && reading.consumption !== null ? (
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Potrošnja</Text>
              <View style={styles.consumptionRow}>
                <Text style={[styles.value, hasAnomaly && { color: Colors.warning }]}>
                  {reading.consumption} m³
                </Text>
                {hasAnomaly ? (
                  <AlertTriangle size={14} color={Colors.warning} style={{ marginLeft: 6 }} />
                ) : null}
              </View>
            </View>
          ) : null}
        </Card>

        {hasAnomaly ? (
          <View style={styles.anomalyBanner}>
            <AlertTriangle size={16} color={Colors.warning} />
            <Text style={styles.anomalyText}>
              Neuobičajena potrošnja (+30% od prosjeka)
            </Text>
          </View>
        ) : null}

        {/* Image */}
        {reading.imageUrl ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Fotografija vodomjera</Text>
            <Image
              source={{ uri: reading.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </Card>
        ) : null}

        {/* Notes */}
        {reading.notes ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Napomena</Text>
            <Text style={styles.notesText}>{reading.notes}</Text>
          </Card>
        ) : null}

        {/* Actions */}
        {canManage ? (
          <View style={styles.actions}>
            {reading.status === 'pending' ? (
              <>
                <Button
                  title="Potvrdi"
                  onPress={verify}
                  leftIcon={<CheckCircle size={18} color="#fff" />}
                  style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                />
                <Button
                  title="Odbij"
                  onPress={openReject}
                  leftIcon={<XCircle size={18} color="#fff" />}
                  style={[styles.actionBtn, { backgroundColor: Colors.error }]}
                />
              </>
            ) : null}
            <Button
              title="Uredi"
              variant="outline"
              onPress={openEdit}
              leftIcon={<Edit3 size={18} color={Colors.primary} />}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Uredi očitanje</Text>
            {reading.meterSerialNumber ? (
              <Text style={styles.modalSub}>Vodomjer: {reading.meterSerialNumber}</Text>
            ) : null}
            <Input
              label="Stanje vodomjera (m³)"
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              error={editError}
            />
            <Input
              label="Napomena"
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Opcionalno"
              containerStyle={{ marginBottom: 16 }}
            />
            <View style={styles.modalBtnRow}>
              <Button title="Otkaži" variant="outline" onPress={() => setShowEditModal(false)} style={styles.modalBtn} />
              <Button title="Sačuvaj" onPress={confirmEdit} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Odbij očitanje</Text>
            <Text style={styles.modalSub}>Unesite razlog odbijanja (opcionalno)</Text>
            <Input
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Razlog..."
              containerStyle={{ marginBottom: 16 }}
            />
            <View style={styles.modalBtnRow}>
              <Button title="Otkaži" variant="outline" onPress={() => setShowRejectModal(false)} style={styles.modalBtn} />
              <Button title="Odbij" onPress={confirmReject} style={[styles.modalBtn, { backgroundColor: Colors.error }]} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textLight,
  },
  headerCard: {
    padding: 14,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  date: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  method: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  card: {
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  rowText: {
    fontSize: 13,
    color: Colors.text,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.highlight,
  },
  valueLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  valueBig: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  consumptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anomalyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  anomalyText: {
    fontSize: 13,
    color: Colors.warning,
    flex: 1,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
  },
});
