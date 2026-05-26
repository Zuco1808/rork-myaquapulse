import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Plus,
  Camera,
  Edit3,
  Filter,
  Search,
  ChevronLeft,
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ReadingCard } from '@/components/readings/ReadingCard';
import { OCRCameraView } from '@/components/ocr/CameraView';
import { OCRResult } from '@/components/ocr/OCRResult';
import { useAuthStore } from '@/store/auth-store';
import { getReadings, createReading, verifyReading } from '@/lib/api/readings';
import { getMeters } from '@/lib/api/meters';
import Colors from '@/constants/colors';
import { ReadingDisplay } from '@/types/user';

interface ExtendedReading extends ReadingDisplay {
  meterSerialNumber?: string;
  meterId: string;
}

/* ── Pure filter helper (no stale-closure risk) ─────────────────────────── */
const filterReadings = (
  source: ExtendedReading[],
  query: string,
  status: string,
): ExtendedReading[] => {
  let result = source;
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      (r) =>
        r.meterSerialNumber?.toLowerCase().includes(q) ||
        r.value.toString().includes(q),
    );
  }
  if (status !== 'all') {
    result = result.filter((r) => r.status === status);
  }
  return result;
};

/* ════════════════════════════════════════════════════════════════════════ */
export default function ReadingsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showOCRResult, setShowOCRResult] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string>('');
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [manualReading, setManualReading] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [availableMeters, setAvailableMeters] = useState<any[]>([]);
  const [readings, setReadings] = useState<ExtendedReading[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [readingError, setReadingError] = useState('');

  const isStaff   = user?.role === 'utility_admin' || user?.role === 'finance' || user?.role === 'super_admin';
  const isWorker  = user?.role === 'worker';
  const isEndUser = user?.role === 'end_user';

  /* ── Derived filtered list (never stale) ───────────────────────────────── */
  const filteredReadings = filterReadings(readings, searchQuery, filterStatus);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  const fetchData = async () => {
    if (!user) {
      router.replace('/login' as any);
      return;
    }
    try {
      const [metersData, readingsData] = await Promise.all([
        getMeters(),
        getReadings(),
      ]);
      const userMeters = isEndUser
        ? metersData.filter((m: any) => m.userId === user.id)
        : metersData;
      const userReadings = isEndUser
        ? readingsData.filter((r: any) =>
            userMeters.some((m: any) => m.id === r.meterId),
          )
        : readingsData;
      setAvailableMeters(userMeters);
      setReadings(userReadings);
      if (userMeters.length > 0 && !selectedMeterId) {
        setSelectedMeterId(userMeters[0].id);
      }
    } catch (err) {
      console.error('Greška pri učitavanju:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id, user?.role]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* ── Manual submit ──────────────────────────────────────────────────────── */
  const validateReading = (value: number): boolean => {
    const meter = availableMeters.find((m) => m.id === selectedMeterId);
    if (!meter) {
      setReadingError('Odabrani vodomjer nije pronađen');
      return false;
    }
    const lastReading = readings
      .filter((r) => r.meterId === selectedMeterId)
      .sort((a, b) => b.readingDate - a.readingDate)[0];
    if (lastReading && value < lastReading.value) {
      setReadingError(
        `Nova vrijednost mora biti veća ili jednaka posljednjoj (${lastReading.value} m³)`,
      );
      return false;
    }
    setReadingError('');
    return true;
  };

  const handleManualSubmit = async () => {
    const value = parseFloat(manualReading);
    if (isNaN(value)) {
      setReadingError('Unesite validnu numeričku vrijednost');
      return;
    }
    if (!validateReading(value)) return;

    const meter = availableMeters.find((m) => m.id === selectedMeterId);
    if (!meter) return;

    try {
      await createReading({
        connection_id: selectedMeterId,
        utility_id:    meter.utility_id,
        reading_value: value,
        reading_type:  'manual',
      });
      setShowAddReadingModal(false);
      setManualReading('');
      setReadingError('');
      Alert.alert('Uspjeh', 'Očitanje je uspješno dodano.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri unosu očitanja.');
    }
  };

  /* ── OCR ────────────────────────────────────────────────────────────────── */
  const handleOpenCamera   = () => { setShowAddReadingModal(false); setShowCamera(true); };
  const handleOCRRetry     = () => { setShowOCRResult(false); setShowCamera(true); };
  const handleOCRCancel    = () => { setShowOCRResult(false); setCapturedImage(null); };

  const handleCameraCapture = (imageUri: string, imageBase64: string) => {
    setCapturedImage(imageUri);
    setCapturedImageBase64(imageBase64);
    setShowCamera(false);
    setShowOCRResult(true);
  };

  const handleOCRConfirm = async (value: number) => {
    if (!validateReading(value)) {
      Alert.alert(
        'Greška',
        readingError,
        [
          { text: 'Pokušaj ponovo', onPress: () => { setShowOCRResult(false); setShowCamera(true); } },
          { text: 'Otkaži', style: 'cancel', onPress: () => { setShowOCRResult(false); setCapturedImage(null); setReadingError(''); } },
        ],
      );
      return;
    }
    const meter = availableMeters.find((m) => m.id === selectedMeterId);
    if (!meter) return;
    try {
      await createReading({
        connection_id: selectedMeterId,
        utility_id:    meter.utility_id,
        reading_value: value,
        reading_type:  'ocr',
      });
      setShowOCRResult(false);
      setCapturedImage(null);
      Alert.alert('Uspjeh', 'OCR očitanje je uspješno dodano.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri unosu OCR očitanja.');
    }
  };

  /* ── Edit / Verify / Reject ─────────────────────────────────────────────── */
  const handleEditReading = (_readingId: string) => {
    if (!isStaff) {
      Alert.alert('Nemate dozvolu', 'Samo administratori i finansije mogu uređivati očitanja.');
      return;
    }
    Alert.alert('Uređivanje očitanja', 'Ova funkcionalnost će biti implementirana uskoro.');
  };

  const handleVerifyReading = async (readingId: string) => {
    if (!isStaff) return;
    try {
      await verifyReading(readingId, true);
      setReadings((prev) =>
        prev.map((r) => r.id === readingId ? { ...r, status: 'verified' as const } : r),
      );
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri potvrdi očitanja.');
    }
  };

  const handleRejectReading = async (readingId: string) => {
    if (!isStaff) return;
    try {
      await verifyReading(readingId, false);
      setReadings((prev) =>
        prev.map((r) => r.id === readingId ? { ...r, status: 'rejected' as const } : r),
      );
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri odbijanju očitanja.');
    }
  };

  const canAddReadings = isStaff || isWorker || isEndUser;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Pretraži očitanja..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
          leftIcon={<Search size={20} color={Colors.textLight} />}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Filter size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Status:</Text>
          <View style={styles.filterOptions}>
            {['all', 'pending', 'verified', 'rejected'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterOption, filterStatus === status && styles.filterOptionActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterOptionText, filterStatus === status && styles.filterOptionTextActive]}>
                  {status === 'all' ? 'Svi' : status === 'pending' ? 'Na čekanju' : status === 'verified' ? 'Potvrđeni' : 'Odbijeni'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredReadings.length > 0 ? (
          filteredReadings.map((reading) => (
            <ReadingCard
              key={reading.id}
              reading={reading}
              showMeterInfo={true}
              meterSerialNumber={reading.meterSerialNumber}
              onEdit={() => handleEditReading(reading.id)}
              onVerify={
                isStaff && reading.status === 'pending'
                  ? () => handleVerifyReading(reading.id)
                  : undefined
              }
              onReject={
                isStaff && reading.status === 'pending'
                  ? () => handleRejectReading(reading.id)
                  : undefined
              }
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nema pronađenih očitanja</Text>
          </View>
        )}
      </ScrollView>

      {canAddReadings && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddReadingModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Add reading modal ── */}
      <Modal
        visible={showAddReadingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddReadingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowAddReadingModal(false)}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Novo očitanje</Text>
              <View style={styles.placeholder} />
            </View>

            <Text style={styles.modalSubtitle}>Odaberite vodomjer i unesite očitanje</Text>

            {availableMeters.length > 0 ? (
              <>
                <Text style={styles.inputLabel}>Vodomjer:</Text>
                <View style={styles.meterOptions}>
                  {availableMeters.map((meter) => (
                    <TouchableOpacity
                      key={meter.id}
                      style={[
                        styles.meterOption,
                        selectedMeterId === meter.id && styles.meterOptionActive,
                      ]}
                      onPress={() => setSelectedMeterId(meter.id)}
                    >
                      <Text
                        style={[
                          styles.meterOptionText,
                          selectedMeterId === meter.id && styles.meterOptionTextActive,
                        ]}
                      >
                        {meter.serialNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputContainer}>
                  <Input
                    label="Ručni unos očitanja (m³)"
                    placeholder="Unesite vrijednost očitanja"
                    value={manualReading}
                    onChangeText={setManualReading}
                    keyboardType="numeric"
                    leftIcon={<Edit3 size={20} color={Colors.textLight} />}
                    error={readingError}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    title="Otkaži"
                    onPress={() => { setShowAddReadingModal(false); setReadingError(''); }}
                    variant="outline"
                    style={styles.modalButton}
                  />
                  <Button
                    title="Potvrdi"
                    onPress={handleManualSubmit}
                    style={styles.modalButton}
                    disabled={!manualReading}
                  />
                </View>

                <View style={styles.orContainer}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ILI</Text>
                  <View style={styles.orLine} />
                </View>

                <Button
                  title="Skeniraj vodomjer"
                  onPress={handleOpenCamera}
                  variant="secondary"
                  leftIcon={<Camera size={20} color="#fff" />}
                />
              </>
            ) : (
              <View style={styles.noMetersContainer}>
                <Text style={styles.noMetersText}>
                  Nemate dodijeljenih vodomjera. Kontaktirajte administratora.
                </Text>
                <Button
                  title="Zatvori"
                  onPress={() => setShowAddReadingModal(false)}
                  style={styles.closeButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCamera}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setShowCamera(false)}
      >
        <OCRCameraView
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      </Modal>

      <Modal
        visible={showOCRResult && !!capturedImage}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={handleOCRCancel}
      >
        <OCRResult
          imageUri={capturedImage || ''}
          imageBase64={capturedImageBase64}
          onConfirm={handleOCRConfirm}
          onRetry={handleOCRRetry}
          onCancel={handleOCRCancel}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: { flex: 1, marginBottom: 0 },
  filterButton: { padding: 12, marginLeft: 8 },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: { backgroundColor: Colors.primary },
  filterOptionText: { fontSize: 12, color: Colors.text },
  filterOptionTextActive: { color: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: Colors.textLight, textAlign: 'center' },
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
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: { padding: 4 },
  placeholder: { width: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  modalSubtitle: { fontSize: 16, color: Colors.textLight, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  meterOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  meterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  meterOptionActive: { backgroundColor: Colors.primary },
  meterOptionText: { fontSize: 14, color: Colors.text },
  meterOptionTextActive: { color: '#fff' },
  inputContainer: { marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, marginHorizontal: 8 },
  orContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: 16, color: Colors.textLight, fontSize: 14 },
  noMetersContainer: { alignItems: 'center', padding: 16 },
  noMetersText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeButton: { width: '100%' },
});
