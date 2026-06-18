import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFreshFocus } from '@/lib/use-fresh-focus';
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
import { SerialScanner } from '@/components/meters/SerialScanner';
import { uploadMeterImage } from '@/lib/api/ocr';
import { isOnline, enqueueReading } from '@/lib/offline/reading-queue';
import { useOfflineSync } from '@/lib/offline/use-offline-sync';
import { CloudOff, RefreshCw } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { getReadings, getReadingsByUser, createReading, verifyReading, getLastReadingValue, type ReadingsOpts } from '@/lib/api/readings';
import { getMeters, getMetersByUser } from '@/lib/api/meters';
import Colors from '@/constants/colors';
import { ReadingDisplay } from '@/types/user';
import { captureError } from '@/lib/sentry';

interface ExtendedReading extends ReadingDisplay {
  meterSerialNumber?: string;
  meterId: string;
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function ReadingsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const PAGE_SIZE = 40;
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showOCRResult, setShowOCRResult] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string>('');
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [manualReading, setManualReading] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [availableMeters, setAvailableMeters] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  /* ── QR/barcode sken serijskog broja → odaberi vodomjer ── */
  const handleSerialScanned = (serial: string) => {
    const norm = serial.trim().toLowerCase();
    const meter = availableMeters.find(
      (m) => (m.serialNumber ?? '').trim().toLowerCase() === norm,
    );
    if (meter) {
      setSelectedMeterId(meter.id);
      setReadingError('');
    } else {
      Alert.alert(
        'Vodomjer nije pronađen',
        `Serijski broj "${serial}" ne odgovara nijednom dostupnom vodomjeru.`,
      );
    }
  };
  const [readings, setReadings] = useState<ExtendedReading[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readingError, setReadingError] = useState('');
  const filterInitialized = useRef(false);

  const { canVerifyReadings: isStaff, canManageReadings, isWorker, isEndUser } = usePermissions();
  const offline = useOfflineSync();

  const handleManualSync = async () => {
    const res = await offline.sync();
    if (res.synced > 0) { fetchData(); }
    Alert.alert(
      'Sinkronizacija',
      res.synced === 0 && res.failed === 0
        ? 'Nema očitanja za sinkronizaciju.'
        : `Sinkronizovano: ${res.synced}${res.failed ? `, neuspjelo: ${res.failed}` : ''}.`,
    );
  };

  /* ── Build API opts ────────────────────────────────────────────────────── */
  const buildReadingsOpts = (offset: number): ReadingsOpts => ({
    limit: PAGE_SIZE,
    offset,
    search: searchQuery.trim() || undefined,
    status: filterStatus !== 'all' ? (filterStatus as ReadingsOpts['status']) : undefined,
  });

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  const fetchData = async () => {
    if (!user) { router.replace('/login' as any); return; }
    setLoading(true);
    setPageOffset(0);
    setHasMore(true);
    try {
      const opts = buildReadingsOpts(0);
      let metersData: any[];
      let readingsData: any[];
      if (isEndUser) {
        [metersData, readingsData] = await Promise.all([
          getMetersByUser(user.id, { limit: 50 }),
          getReadingsByUser(user.id, opts),
        ]);
      } else {
        [metersData, readingsData] = await Promise.all([
          getMeters({ limit: 200 }),
          getReadings(opts),
        ]);
      }
      setAvailableMeters(metersData);
      setReadings(readingsData);
      setHasMore(readingsData.length === PAGE_SIZE);
      setPageOffset(PAGE_SIZE);
      if (metersData.length > 0 && !selectedMeterId) setSelectedMeterId(metersData[0].id);
    } catch (err) {
      captureError(err, { screen: 'readings', action: 'fetchData' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !user) return;
    setLoadingMore(true);
    try {
      const opts = buildReadingsOpts(pageOffset);
      const data = isEndUser
        ? await getReadingsByUser(user.id, opts)
        : await getReadings(opts);
      setReadings(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPageOffset(prev => prev + PAGE_SIZE);
    } catch (err) {
      captureError(err, { screen: 'readings', action: 'loadMore' });
    } finally {
      setLoadingMore(false);
    }
  };

  useFreshFocus(fetchData);

  /* ── Debounce search → debouncedSearch ─────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ── Re-fetch on filter / debounced search change ──────────────────────── */
  useEffect(() => {
    if (!filterInitialized.current) { filterInitialized.current = true; return; }
    if (user) fetchData();
  }, [debouncedSearch, filterStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  /* ── Manual submit ──────────────────────────────────────────────────────── */
  // Queries the DB for the true last reading value (not the in-memory, possibly
  // filtered/paginated list) so validation is reliable.
  const validateReading = async (value: number): Promise<boolean> => {
    const meter = availableMeters.find((m) => m.id === selectedMeterId);
    if (!meter) {
      setReadingError('Odabrani vodomjer nije pronađen');
      return false;
    }
    try {
      const lastValue = await getLastReadingValue(selectedMeterId);
      if (lastValue != null && value < lastValue) {
        setReadingError(
          `Nova vrijednost mora biti veća ili jednaka posljednjoj (${lastValue} m³)`,
        );
        return false;
      }
    } catch (err) {
      captureError(err, { screen: 'readings', action: 'validateReading' });
      // Ako provjera padne, ne blokiraj — server-side trigger je posljednja brana
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
    if (!(await validateReading(value))) return;

    const meter = availableMeters.find((m) => m.id === selectedMeterId);
    if (!meter) return;

    const payload = {
      connection_id: selectedMeterId,
      utility_id:    meter.utility_id,
      reading_value: value,
      reading_type:  'manual',
    };

    // Offline → spremi u red (uz serijski za prikaz u listi čekanja)
    if (!(await isOnline())) {
      await enqueueReading({ ...payload, meterSerial: meter.serialNumber });
      await offline.refresh();
      setShowAddReadingModal(false);
      setManualReading('');
      setReadingError('');
      Alert.alert('Spremljeno offline', 'Očitanje će biti sinkronizovano kad se vrati konekcija.');
      return;
    }

    try {
      await createReading(payload);
      setShowAddReadingModal(false);
      setManualReading('');
      setReadingError('');
      Alert.alert('Uspjeh', 'Očitanje je uspješno dodano.');
      fetchData();
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
        await enqueueReading({ ...payload, meterSerial: meter.serialNumber });
        await offline.refresh();
        setShowAddReadingModal(false);
        setManualReading('');
        Alert.alert('Spremljeno offline', 'Mreža nije dostupna — očitanje je u redu za sinkronizaciju.');
      } else {
        Alert.alert('Greška', err.message || 'Greška pri unosu očitanja.');
      }
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
    if (!(await validateReading(value))) {
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
      // Priloži fotografiju brojila uz očitanje (best-effort — ne blokira unos)
      let photoUrl: string | undefined;
      if (capturedImageBase64) {
        photoUrl = (await uploadMeterImage(capturedImageBase64, selectedMeterId)) ?? undefined;
      }
      await createReading({
        connection_id: selectedMeterId,
        utility_id:    meter.utility_id,
        reading_value: value,
        reading_type:  'ocr',
        photo_url:     photoUrl,
      });
      setShowOCRResult(false);
      setCapturedImage(null);
      setCapturedImageBase64('');
      Alert.alert('Uspjeh', 'OCR očitanje je uspješno dodano.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri unosu OCR očitanja.');
    }
  };

  /* ── Verify / Reject ────────────────────────────────────────────────────── */
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

      {offline.pending > 0 && (
        <TouchableOpacity style={styles.offlineBar} onPress={handleManualSync} activeOpacity={0.8} disabled={offline.syncing}>
          <CloudOff size={18} color="#fff" />
          <Text style={styles.offlineText}>
            {offline.pending} očitanje(a) čeka sinkronizaciju
          </Text>
          {offline.syncing
            ? <ActivityIndicator size="small" color="#fff" />
            : <View style={styles.offlineSync}><RefreshCw size={14} color="#fff" /><Text style={styles.offlineSyncText}>Sinkronizuj</Text></View>}
        </TouchableOpacity>
      )}

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

      {loading && readings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore
            ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
            : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nema pronađenih očitanja</Text>
            </View>
          }
          renderItem={({ item: reading }) => (
            <ReadingCard
              reading={reading}
              showMeterInfo={true}
              meterSerialNumber={reading.meterSerialNumber}
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
          )}
        />
      )}

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
                <View style={styles.meterLabelRow}>
                  <Text style={styles.inputLabel}>Vodomjer:</Text>
                  <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)} activeOpacity={0.7}>
                    <Camera size={15} color={Colors.primary} />
                    <Text style={styles.scanBtnText}>Skeniraj</Text>
                  </TouchableOpacity>
                </View>
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

      <SerialScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleSerialScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  offlineBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FF9800', paddingHorizontal: 16, paddingVertical: 10,
  },
  offlineText:     { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  offlineSync:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  offlineSyncText: { color: '#fff', fontSize: 12, fontWeight: '700' },

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
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80, flexGrow: 1 },
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
  meterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '10',
    marginBottom: 8,
  },
  scanBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
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
