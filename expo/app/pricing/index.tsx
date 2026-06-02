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
import { Package, Calendar, X, Users } from 'lucide-react-native';
import { PackageCard, type PricingPackage } from '@/components/pricing/PackageCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import {
  getPackages,
  getPeriods,
  getUserGroups,
  createPackage,
  updatePackage,
  deletePackage,
  type PricingPackageDto,
  type PricingPeriodDto,
  type UserGroupDto,
} from '@/lib/api/pricing';

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [packages, setPackages] = useState<PricingPackageDto[]>([]);
  const [periods, setPeriods] = useState<PricingPeriodDto[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Add/edit package modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<PricingPackage | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [packageName, setPackageName] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [selectedUserGroupIds, setSelectedUserGroupIds] = useState<string[]>([]);

  // Form errors
  const [nameError, setNameError] = useState('');
  const [periodsError, setPeriodsError] = useState('');
  const [userGroupsError, setUserGroupsError] = useState('');

  const canManagePricing =
    user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';

  const loadData = useCallback(async () => {
    try {
      const [pkgs, prds, groups] = await Promise.all([
        getPackages(),
        getPeriods(),
        getUserGroups(),
      ]);
      setPackages(pkgs);
      setPeriods(prds);
      setUserGroups(groups);
    } catch (error) {
      console.error('Greška pri učitavanju cjenovnika:', error);
      Alert.alert('Greška', 'Nije moguće učitati podatke o cijenama.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManagePricing) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canManagePricing, loadData]);

  const handleAddPackage = () => {
    setPackageName('');
    setPackageDescription('');
    setIsDefault(false);
    setSelectedPeriodIds([]);
    setSelectedUserGroupIds([]);
    setNameError('');
    setPeriodsError('');
    setUserGroupsError('');
    setIsEditing(false);
    setCurrentPackage(null);
    setModalVisible(true);
  };

  const handleEditPackage = (pkg: PricingPackage) => {
    setPackageName(pkg.name);
    setPackageDescription(pkg.description);
    setIsDefault(pkg.isDefault);
    setSelectedPeriodIds(pkg.periodIds || []);
    setSelectedUserGroupIds(pkg.userGroupIds || []);
    setNameError('');
    setPeriodsError('');
    setUserGroupsError('');
    setIsEditing(true);
    setCurrentPackage(pkg);
    setModalVisible(true);
  };

  const handleDeletePackage = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg && pkg.isDefault) {
      Alert.alert('Greška', 'Ne možete obrisati osnovni paket.', [{ text: 'OK' }]);
      return;
    }

    Alert.alert(
      'Brisanje paketa',
      'Da li ste sigurni da želite obrisati ovaj paket?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePackage(packageId);
              setPackages((prev) => prev.filter((p) => p.id !== packageId));
              Alert.alert('Uspjeh', 'Paket je obrisan.');
            } catch (error) {
              console.error('Greška pri brisanju paketa:', error);
              Alert.alert('Greška', 'Nije moguće obrisati paket.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handlePackagePress = (pkg: PricingPackage) => {
    router.push(`/pricing/packages/${pkg.id}`);
  };

  const togglePeriodSelection = (periodId: string) => {
    setSelectedPeriodIds((prev) =>
      prev.includes(periodId) ? prev.filter((id) => id !== periodId) : [...prev, periodId],
    );
    setPeriodsError('');
  };

  const toggleUserGroupSelection = (groupId: string) => {
    setSelectedUserGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
    setUserGroupsError('');
  };

  const validateForm = () => {
    let isValid = true;
    if (!packageName.trim()) {
      setNameError('Naziv paketa je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }
    if (selectedPeriodIds.length === 0) {
      setPeriodsError('Odaberite barem jedan period');
      isValid = false;
    } else {
      setPeriodsError('');
    }
    if (selectedUserGroupIds.length === 0) {
      setUserGroupsError('Odaberite barem jednu grupu korisnika');
      isValid = false;
    } else {
      setUserGroupsError('');
    }
    return isValid;
  };

  const handleSavePackage = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (isEditing && currentPackage) {
        await updatePackage(currentPackage.id, {
          name: packageName,
          description: packageDescription,
          isDefault,
          periodIds: selectedPeriodIds,
          userGroupIds: selectedUserGroupIds,
        });
      } else {
        await createPackage({
          name: packageName,
          description: packageDescription,
          isDefault,
          companyId: user?.companyId ?? null,
          periodIds: selectedPeriodIds,
          userGroupIds: selectedUserGroupIds,
        });
      }
      await loadData();
      setModalVisible(false);
    } catch (error) {
      console.error('Greška pri spremanju paketa:', error);
      Alert.alert('Greška', 'Nije moguće sačuvati paket. Pokušajte ponovo.');
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

  return (
    <>
      <Header
        title="Upravljanje cijenama"
        showBack={true}
        showMenu={true}
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={handleAddPackage} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <Package size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Dodaj novi paket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/pricing/periods')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
              <Calendar size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Upravljaj periodima</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/pricing/user-groups' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.info }]}>
              <Users size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Grupe korisnika</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Paketi cijena</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje paketa...</Text>
          </View>
        ) : packages.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nema definisanih paketa. Dodajte prvi paket cijena.
            </Text>
          </Card>
        ) : (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onEdit={handleEditPackage}
              onDelete={handleDeletePackage}
              onPress={handlePackagePress}
            />
          ))
        )}

        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu paketi cijena?</Text>
            <Text style={styles.infoText}>
              Paketi cijena omogućavaju definisanje različitih cijena za različite količine
              potrošnje vode. Možete kreirati posebne pakete za različite periode godine, kao što
              je ljetni period kada su moguće redukcije vode.
            </Text>
          </Card>
        </View>

        {/* Add/Edit Package Modal */}
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
                  {isEditing ? 'Uredi paket' : 'Dodaj novi paket'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Naziv paketa"
                  placeholder="Unesite naziv paketa"
                  value={packageName}
                  onChangeText={setPackageName}
                  error={nameError}
                  leftIcon={<Package size={20} color={Colors.textLight} />}
                />

                <Input
                  label="Opis"
                  placeholder="Unesite opis paketa"
                  value={packageDescription}
                  onChangeText={setPackageDescription}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Osnovni paket:</Text>
                  <TouchableOpacity
                    style={[
                      styles.switchButton,
                      isDefault ? styles.switchButtonActive : styles.switchButtonInactive,
                    ]}
                    onPress={() => setIsDefault(!isDefault)}
                  >
                    <Text style={isDefault ? styles.switchTextActive : styles.switchTextInactive}>
                      {isDefault ? 'Da' : 'Ne'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.selectorLabel}>Odaberite periode:</Text>
                {periodsError ? <Text style={styles.errorText}>{periodsError}</Text> : null}
                <View style={styles.selectorContainer}>
                  {periods.length === 0 ? (
                    <Text style={styles.selectorEmpty}>
                      Nema definisanih perioda. Dodajte ih u &quot;Upravljaj periodima&quot;.
                    </Text>
                  ) : (
                    periods.map((period) => (
                      <TouchableOpacity
                        key={period.id}
                        style={[
                          styles.selectorItem,
                          selectedPeriodIds.includes(period.id) && styles.selectorItemActive,
                        ]}
                        onPress={() => togglePeriodSelection(period.id)}
                      >
                        <Text
                          style={[
                            styles.selectorItemText,
                            selectedPeriodIds.includes(period.id) && styles.selectorItemTextActive,
                          ]}
                        >
                          {period.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <Text style={styles.selectorLabel}>Odaberite grupe korisnika:</Text>
                {userGroupsError ? <Text style={styles.errorText}>{userGroupsError}</Text> : null}
                <View style={styles.selectorContainer}>
                  {userGroups.length === 0 ? (
                    <Text style={styles.selectorEmpty}>
                      Nema definisanih grupa korisnika. Dodajte ih u &quot;Grupe korisnika&quot;.
                    </Text>
                  ) : (
                    userGroups.map((group) => (
                      <TouchableOpacity
                        key={group.id}
                        style={[
                          styles.selectorItem,
                          selectedUserGroupIds.includes(group.id) && styles.selectorItemActive,
                        ]}
                        onPress={() => toggleUserGroupSelection(group.id)}
                      >
                        <Text
                          style={[
                            styles.selectorItemText,
                            selectedUserGroupIds.includes(group.id) &&
                              styles.selectorItemTextActive,
                          ]}
                        >
                          {group.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
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
                    onPress={handleSavePackage}
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
  quickActions: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
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
  emptyCard: {
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
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
  selectorLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 8,
  },
  selectorContainer: {
    marginBottom: 24,
  },
  selectorEmpty: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  selectorItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectorItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  selectorItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectorItemTextActive: {
    color: Colors.primary,
    fontWeight: '500',
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
