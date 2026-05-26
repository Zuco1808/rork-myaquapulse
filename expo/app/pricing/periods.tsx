import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, X, Calendar, Info } from 'lucide-react-native';
import { PeriodCard, PricingPeriod } from '@/components/pricing/PeriodCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import {
  getPricingPeriods,
  createPricingPeriod,
  updatePricingPeriod,
  deletePricingPeriod,
} from '@/lib/api/pricing';

export default function PeriodsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const utilityId    = user?.utility_id;
  const canCreate    = !isSuperAdmin && !!utilityId;

  const [periods,    setPeriods]   = useState<PricingPeriod[]>([]);
  const [isLoading,  setIsLoading] = useState(true);
  const [isSaving,   setIsSaving]  = useState(false);

  /* ── modal state ────────────────────────────────── */
  const [modalVisible,   setModalVisible]   = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [currentPeriod,  setCurrentPeriod]  = useState<PricingPeriod | null>(null);

  const [periodName,   setPeriodName]   = useState('');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [description,  setDescription]  = useState('');
  const [isActive,     setIsActive]     = useState(false);

  const [nameError,      setNameError]      = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError,   setEndDateError]   = useState('');

  /* ── fetch ──────────────────────────────────────── */
  const fetchPeriods = async () => {
    setIsLoading(true);
    try {
      const data = await getPricingPeriods(utilityId);
      setPeriods(data);
    } catch (e: any) {
      console.error('Greška pri učitavanju perioda:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPeriods(); }, [utilityId]));

  /* ── modal helpers ──────────────────────────────── */
  const openAddModal = () => {
    if (!canCreate) {
      Alert.alert('Super Admin', 'Upravljanje periodima je dostupno na razini vodovoda.');
      return;
    }
    setPeriodName(''); setStartDate(''); setEndDate('');
    setDescription(''); setIsActive(false);
    setNameError(''); setStartDateError(''); setEndDateError('');
    setIsEditing(false); setCurrentPeriod(null);
    setModalVisible(true);
  };

  const openEditModal = (period: PricingPeriod) => {
    setPeriodName(period.name);
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setDescription(period.description || '');
    setIsActive(period.isActive);
    setNameError(''); setStartDateError(''); setEndDateError('');
    setIsEditing(true); setCurrentPeriod(period);
    setModalVisible(true);
  };

  /* ── validation ─────────────────────────────────── */
  const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
  const validate = () => {
    let ok = true;
    if (!periodName.trim()) { setNameError('Naziv perioda je obavezan'); ok = false; } else setNameError('');
    if (!startDate)         { setStartDateError('Datum početka je obavezan'); ok = false; }
    else if (!dateRegex.test(startDate)) { setStartDateError('Format: DD.MM.YYYY'); ok = false; }
    else setStartDateError('');
    if (!endDate)           { setEndDateError('Datum završetka je obavezan'); ok = false; }
    else if (!dateRegex.test(endDate)) { setEndDateError('Format: DD.MM.YYYY'); ok = false; }
    else setEndDateError('');
    return ok;
  };

  /* ── save ───────────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (isEditing && currentPeriod) {
        const updated = await updatePricingPeriod(currentPeriod.id, {
          name: periodName.trim(), startDate, endDate, description, isActive,
        });
        setPeriods((prev) => prev.map((p) => p.id === currentPeriod.id ? updated : p));
      } else {
        const created = await createPricingPeriod({
          utility_id: utilityId!, name: periodName.trim(),
          startDate, endDate, description, isActive,
        });
        setPeriods((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Snimanje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── delete ─────────────────────────────────────── */
  const handleDelete = (periodId: string) => {
    Alert.alert(
      'Brisanje perioda',
      'Da li ste sigurni da želite obrisati ovaj period?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši', style: 'destructive',
          onPress: async () => {
            try {
              await deletePricingPeriod(periodId);
              setPeriods((prev) => prev.filter((p) => p.id !== periodId));
            } catch (e: any) {
              Alert.alert('Greška', e?.message);
            }
          },
        },
      ],
    );
  };

  /* ── access guard ───────────────────────────────── */
  const { canManageBilling: canManagePricing } = usePermissions();
  if (!canManagePricing) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccessText}>Nemate pristup ovoj stranici.</Text>
      </View>
    );
  }

  const activePeriods   = periods.filter((p) => p.isActive);
  const inactivePeriods = periods.filter((p) => !p.isActive);

  /* ── render ─────────────────────────────────────── */
  return (
    <>
      <Header
        title="Periodi cijena"
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {isSuperAdmin && (
          <View style={styles.infoNote}>
            <Info size={14} color={Colors.info} />
            <Text style={styles.infoNoteText}>
              Super admin pregled svih perioda. Za upravljanje koristite račun administratora vodovoda.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upravljanje periodima</Text>
          {canCreate && (
            <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Dodaj period</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description}>
          Periodi omogućavaju definisanje različitih cijena za različite dijelove godine.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aktivni periodi</Text>
            </View>
            {activePeriods.length === 0
              ? <Text style={styles.emptyText}>Nema aktivnih perioda.</Text>
              : activePeriods.map((p) => (
                  <PeriodCard
                    key={p.id} period={p}
                    onEdit={canCreate ? openEditModal : undefined}
                    onDelete={canCreate ? handleDelete : undefined}
                    onPress={() => router.push(`/pricing/periods/${p.id}` as any)}
                  />
                ))
            }

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nadolazeći / neaktivni periodi</Text>
            </View>
            {inactivePeriods.length === 0
              ? <Text style={styles.emptyText}>Nema neaktivnih perioda.</Text>
              : inactivePeriods.map((p) => (
                  <PeriodCard
                    key={p.id} period={p}
                    onEdit={canCreate ? openEditModal : undefined}
                    onDelete={canCreate ? handleDelete : undefined}
                    onPress={() => router.push(`/pricing/periods/${p.id}` as any)}
                  />
                ))
            }
          </>
        )}

        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Napomena</Text>
            <Text style={styles.infoText}>
              Periodi se koriste za definisanje različitih cijena u različitim dijelovima godine.
              Svaki period može imati različite pakete cijena i pragove potrošnje.
            </Text>
          </Card>
        </View>

        {/* Add/Edit Period Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Uredi period' : 'Dodaj novi period'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Naziv perioda"
                  placeholder="Unesite naziv perioda"
                  value={periodName}
                  onChangeText={(t) => { setPeriodName(t); if (nameError) setNameError(''); }}
                  error={nameError}
                  leftIcon={<Calendar size={20} color={Colors.textLight} />}
                />
                <Input
                  label="Datum početka"
                  placeholder="DD.MM.YYYY"
                  value={startDate}
                  onChangeText={(t) => { setStartDate(t); if (startDateError) setStartDateError(''); }}
                  error={startDateError}
                />
                <Input
                  label="Datum završetka"
                  placeholder="DD.MM.YYYY"
                  value={endDate}
                  onChangeText={(t) => { setEndDate(t); if (endDateError) setEndDateError(''); }}
                  error={endDateError}
                />
                <Input
                  label="Opis"
                  placeholder="Unesite opis perioda"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Aktivan period:</Text>
                  <TouchableOpacity
                    style={[styles.switchButton, isActive ? styles.switchBtnOn : styles.switchBtnOff]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Text style={isActive ? styles.switchTextOn : styles.switchTextOff}>
                      {isActive ? 'Da' : 'Ne'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <Button title="Otkaži" variant="outline" onPress={() => setModalVisible(false)} style={styles.modalButton} />
                  <Button title="Sačuvaj" onPress={handleSave} isLoading={isSaving} style={styles.modalButton} />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16, paddingBottom: 32 },
  noAccessText:     { fontSize: 16, color: Colors.text, textAlign: 'center', marginTop: 24 },
  emptyText:        { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginVertical: 12 },

  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.highlight, borderRadius: 8,
    padding: 12, marginBottom: 14,
  },
  infoNoteText: { fontSize: 12, color: Colors.textLight, flex: 1 },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle:   { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  addButton:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 4 },

  description: { fontSize: 14, color: Colors.textLight, marginBottom: 24, lineHeight: 20 },

  sectionHeader: { marginBottom: 16, marginTop: 8 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  infoCard:        { marginTop: 24 },
  infoCardContent: { padding: 16, backgroundColor: Colors.background },
  infoTitle:       { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  infoText:        { fontSize: 14, color: Colors.text, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  closeButton:  { padding: 4 },
  modalBody:    { padding: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  modalButton:  { flex: 1, marginHorizontal: 8 },

  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  switchLabel:     { fontSize: 16, color: Colors.text },
  switchButton:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  switchBtnOn:     { backgroundColor: Colors.primary },
  switchBtnOff:    { backgroundColor: Colors.card },
  switchTextOn:    { color: '#fff', fontWeight: '500' },
  switchTextOff:   { color: Colors.textLight },
});
