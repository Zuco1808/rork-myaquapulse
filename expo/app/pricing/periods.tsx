import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { Plus, X, Calendar } from 'lucide-react-native';
import { PeriodCard, type PricingPeriod } from '@/components/pricing/PeriodCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import {
  getPeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
  type PricingPeriodDto,
} from '@/lib/api/pricing';

export default function PeriodsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [periods, setPeriods] = useState<PricingPeriodDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<PricingPeriod | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);

  const [nameError, setNameError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');

  const canManagePricing =
    user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';

  const loadPeriods = useCallback(async () => {
    try {
      const data = await getPeriods();
      setPeriods(data);
    } catch (error) {
      console.error('Greška pri učitavanju perioda:', error);
      Alert.alert('Greška', 'Nije moguće učitati periode.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManagePricing) {
      setLoading(false);
      return;
    }
    loadPeriods();
  }, [canManagePricing, loadPeriods]);

  const handleAddPeriod = () => {
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setIsActive(false);
    setNameError('');
    setStartDateError('');
    setEndDateError('');
    setIsEditing(false);
    setCurrentPeriod(null);
    setModalVisible(true);
  };

  const handleEditPeriod = (period: PricingPeriod) => {
    setPeriodName(period.name);
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setDescription(period.description || '');
    setIsActive(period.isActive);
    setNameError('');
    setStartDateError('');
    setEndDateError('');
    setIsEditing(true);
    setCurrentPeriod(period);
    setModalVisible(true);
  };

  const handleDeletePeriod = (periodId: string) => {
    Alert.alert(
      'Brisanje perioda',
      'Da li ste sigurni da želite obrisati ovaj period?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePeriod(periodId);
              setPeriods((prev) => prev.filter((p) => p.id !== periodId));
            } catch (error) {
              console.error('Greška pri brisanju perioda:', error);
              Alert.alert('Greška', 'Nije moguće obrisati period.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const validateForm = () => {
    let isValid = true;
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;

    if (!periodName.trim()) {
      setNameError('Naziv perioda je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!startDate) {
      setStartDateError('Datum početka je obavezan');
      isValid = false;
    } else if (!dateRegex.test(startDate)) {
      setStartDateError('Format datuma mora biti DD.MM.YYYY');
      isValid = false;
    } else {
      setStartDateError('');
    }

    if (!endDate) {
      setEndDateError('Datum završetka je obavezan');
      isValid = false;
    } else if (!dateRegex.test(endDate)) {
      setEndDateError('Format datuma mora biti DD.MM.YYYY');
      isValid = false;
    } else {
      setEndDateError('');
    }

    return isValid;
  };

  const handleSavePeriod = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (isEditing && currentPeriod) {
        await updatePeriod(currentPeriod.id, {
          name: periodName,
          startDate,
          endDate,
          description,
          isActive,
        });
      } else {
        await createPeriod({
          name: periodName,
          startDate,
          endDate,
          description,
          isActive,
          companyId: user?.companyId ?? null,
        });
      }
      await loadPeriods();
      setModalVisible(false);
    } catch (error) {
      console.error('Greška pri spremanju perioda:', error);
      Alert.alert('Greška', 'Nije moguće sačuvati period. Pokušajte ponovo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManagePricing) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccessText}>Nemate pristup ovoj stranici.</Text>
      </View>
    );
  }

  const activePeriods = periods.filter((p) => p.isActive);
  const upcomingPeriods = periods.filter((p) => !p.isActive);

  return (
    <>
      <Header
        title="Periodi cijena"
        showBack={true}
        showMenu={true}
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upravljanje periodima</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPeriod} activeOpacity={0.7}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj period</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Periodi omogućavaju definisanje različitih cijena za različite dijelove godine. Na
          primjer, možete definisati ljetni period sa višim cijenama za prekomjernu potrošnju.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje perioda...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aktivni periodi</Text>
            </View>
            {activePeriods.length === 0 ? (
              <Text style={styles.emptyText}>Nema aktivnih perioda.</Text>
            ) : (
              activePeriods.map((period) => (
                <PeriodCard
                  key={period.id}
                  period={period}
                  onEdit={handleEditPeriod}
                  onDelete={handleDeletePeriod}
                />
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nadolazeći periodi</Text>
            </View>
            {upcomingPeriods.length === 0 ? (
              <Text style={styles.emptyText}>Nema nadolazećih perioda.</Text>
            ) : (
              upcomingPeriods.map((period) => (
                <PeriodCard
                  key={period.id}
                  period={period}
                  onEdit={handleEditPeriod}
                  onDelete={handleDeletePeriod}
                />
              ))
            )}
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
          transparent={true}
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
                  onChangeText={setPeriodName}
                  error={nameError}
                  leftIcon={<Calendar size={20} color={Colors.textLight} />}
                />

                <Input
                  label="Datum početka"
                  placeholder="DD.MM.YYYY"
                  value={startDate}
                  onChangeText={setStartDate}
                  error={startDateError}
                />

                <Input
                  label="Datum završetka"
                  placeholder="DD.MM.YYYY"
                  value={endDate}
                  onChangeText={setEndDate}
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
                    style={[
                      styles.switchButton,
                      isActive ? styles.switchButtonActive : styles.switchButtonInactive,
                    ]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Text style={isActive ? styles.switchTextActive : styles.switchTextInactive}>
                      {isActive ? 'Da' : 'Ne'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="Otkaži"
                    variant="outline"
                    onPress={() => setModalVisible(false)}
                    style={styles.modalButton}
                    disabled={isSaving}
                  />

                  <Button
                    title="Sačuvaj"
                    onPress={handleSavePeriod}
                    style={styles.modalButton}
                    isLoading={isSaving}
                    disabled={isSaving}
                  />
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  noAccessText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textLight,
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  infoCard: {
    marginTop: 24,
  },
  infoCardContent: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  switchButtonActive: {
    backgroundColor: Colors.primary,
  },
  switchButtonInactive: {
    backgroundColor: Colors.card,
  },
  switchTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  switchTextInactive: {
    color: Colors.textLight,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
