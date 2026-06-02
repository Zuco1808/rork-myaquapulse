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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Package, X } from 'lucide-react-native';
import { PricingTierCard, type PricingTier } from '@/components/pricing/PricingTierCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import {
  getPackageById,
  getTiersByPackage,
  getUserGroups,
  createTier,
  updateTier,
  deleteTier,
  type PricingPackageDto,
  type PricingTierDto,
  type UserGroupDto,
} from '@/lib/api/pricing';

export default function PackageDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [tiers, setTiers] = useState<PricingTierDto[]>([]);
  const [packageInfo, setPackageInfo] = useState<PricingPackageDto | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTier, setCurrentTier] = useState<PricingTier | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [minConsumption, setMinConsumption] = useState('');
  const [maxConsumption, setMaxConsumption] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [tierDescription, setTierDescription] = useState('');

  const [minConsumptionError, setMinConsumptionError] = useState('');
  const [maxConsumptionError, setMaxConsumptionError] = useState('');
  const [pricePerUnitError, setPricePerUnitError] = useState('');

  const canManagePricing =
    user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [pkg, tierList, groups] = await Promise.all([
        getPackageById(id),
        getTiersByPackage(id),
        getUserGroups(),
      ]);
      setPackageInfo(pkg);
      setTiers(tierList);
      setUserGroups(groups);
    } catch (error) {
      console.error('Greška pri učitavanju paketa:', error);
      Alert.alert('Greška', 'Nije moguće učitati podatke o paketu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canManagePricing) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canManagePricing, loadData]);

  const handleAddTier = () => {
    setMinConsumption('');
    setMaxConsumption('');
    setPricePerUnit('');
    setTierDescription('');
    setMinConsumptionError('');
    setMaxConsumptionError('');
    setPricePerUnitError('');
    setIsEditing(false);
    setCurrentTier(null);
    setModalVisible(true);
  };

  const handleEditTier = (tier: PricingTier) => {
    setMinConsumption(tier.minConsumption.toString());
    setMaxConsumption(tier.maxConsumption ? tier.maxConsumption.toString() : '');
    setPricePerUnit(tier.pricePerUnit.toString());
    setTierDescription(tier.description || '');
    setMinConsumptionError('');
    setMaxConsumptionError('');
    setPricePerUnitError('');
    setIsEditing(true);
    setCurrentTier(tier);
    setModalVisible(true);
  };

  const handleDeleteTier = (tierId: string) => {
    Alert.alert(
      'Brisanje praga',
      'Da li ste sigurni da želite obrisati ovaj prag potrošnje?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTier(tierId);
              setTiers((prev) => prev.filter((t) => t.id !== tierId));
            } catch (error) {
              console.error('Greška pri brisanju praga:', error);
              Alert.alert('Greška', 'Nije moguće obrisati prag.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const validateForm = () => {
    let isValid = true;

    if (!minConsumption) {
      setMinConsumptionError('Minimalna potrošnja je obavezna');
      isValid = false;
    } else if (isNaN(Number(minConsumption)) || Number(minConsumption) < 0) {
      setMinConsumptionError('Unesite validan broj');
      isValid = false;
    } else {
      setMinConsumptionError('');
    }

    if (
      maxConsumption &&
      (isNaN(Number(maxConsumption)) || Number(maxConsumption) <= Number(minConsumption))
    ) {
      setMaxConsumptionError('Maksimalna potrošnja mora biti veća od minimalne');
      isValid = false;
    } else {
      setMaxConsumptionError('');
    }

    if (!pricePerUnit) {
      setPricePerUnitError('Cijena po jedinici je obavezna');
      isValid = false;
    } else if (isNaN(Number(pricePerUnit)) || Number(pricePerUnit) <= 0) {
      setPricePerUnitError('Unesite validnu cijenu');
      isValid = false;
    } else {
      setPricePerUnitError('');
    }

    return isValid;
  };

  const handleSaveTier = async () => {
    if (!validateForm() || !id) return;

    setIsSaving(true);
    try {
      if (isEditing && currentTier) {
        await updateTier(currentTier.id, {
          minConsumption: Number(minConsumption),
          maxConsumption: maxConsumption ? Number(maxConsumption) : null,
          pricePerUnit: Number(pricePerUnit),
          description: tierDescription,
        });
      } else {
        await createTier({
          packageId: id,
          minConsumption: Number(minConsumption),
          maxConsumption: maxConsumption ? Number(maxConsumption) : null,
          pricePerUnit: Number(pricePerUnit),
          description: tierDescription,
          sortOrder: tiers.length,
        });
      }
      const tierList = await getTiersByPackage(id);
      setTiers(tierList);
      setModalVisible(false);
    } catch (error) {
      console.error('Greška pri spremanju praga:', error);
      Alert.alert('Greška', 'Nije moguće sačuvati prag. Pokušajte ponovo.');
    } finally {
      setIsSaving(false);
    }
  };

  const getUserGroupNames = (groupIds: string[]) => {
    if (!groupIds || groupIds.length === 0) return 'Svi korisnici';
    return (
      groupIds
        .map((gid) => userGroups.find((g) => g.id === gid)?.name)
        .filter(Boolean)
        .join(', ') || 'Svi korisnici'
    );
  };

  if (!canManagePricing) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAccessText}>Nemate pristup ovoj stranici.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </View>
    );
  }

  if (!packageInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Paket nije pronađen.</Text>
      </View>
    );
  }

  return (
    <>
      <Header
        title={packageInfo.name}
        showBack={true}
        showMenu={true}
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.packageIconContainer}>
            <Package size={24} color={Colors.primary} />
          </View>
          <View style={styles.packageInfo}>
            <Text style={styles.packageName}>{packageInfo.name}</Text>
            {!!packageInfo.description && (
              <Text style={styles.packageDescription}>{packageInfo.description}</Text>
            )}
            {packageInfo.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Osnovni paket</Text>
              </View>
            )}
          </View>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Grupe korisnika:</Text>
            <Text style={styles.detailValue}>{getUserGroupNames(packageInfo.userGroupIds)}</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pragovi potrošnje</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddTier} activeOpacity={0.7}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj prag</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.tiersCard}>
          {tiers.map((tier, index) => (
            <PricingTierCard
              key={tier.id}
              tier={tier}
              currency={packageInfo.currency}
              onEdit={handleEditTier}
              onDelete={handleDeleteTier}
              isLast={index === tiers.length - 1}
            />
          ))}

          {tiers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Nema definisanih pragova potrošnje. Dodajte prvi prag.
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu pragovi potrošnje?</Text>
            <Text style={styles.infoText}>
              Pragovi potrošnje omogućavaju definisanje različitih cijena za različite količine
              potrošnje vode. Na primjer, možete definisati nižu cijenu za osnovnu potrošnju i višu
              cijenu za prekomjernu potrošnju.
            </Text>
          </Card>
        </View>

        {/* Add/Edit Tier Modal */}
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
                  {isEditing ? 'Uredi prag potrošnje' : 'Dodaj novi prag potrošnje'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Minimalna potrošnja (m³)"
                  placeholder="Unesite minimalnu potrošnju"
                  value={minConsumption}
                  onChangeText={setMinConsumption}
                  keyboardType="numeric"
                  error={minConsumptionError}
                />

                <Input
                  label="Maksimalna potrošnja (m³)"
                  placeholder="Ostavite prazno za neograničeno"
                  value={maxConsumption}
                  onChangeText={setMaxConsumption}
                  keyboardType="numeric"
                  error={maxConsumptionError}
                />

                <Input
                  label="Cijena po jedinici (KM/m³)"
                  placeholder="Unesite cijenu po jedinici"
                  value={pricePerUnit}
                  onChangeText={setPricePerUnit}
                  keyboardType="numeric"
                  error={pricePerUnitError}
                />

                <Input
                  label="Opis"
                  placeholder="Unesite opis praga potrošnje"
                  value={tierDescription}
                  onChangeText={setTierDescription}
                  multiline
                  numberOfLines={3}
                />

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
                    onPress={handleSaveTier}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  packageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  detailsCard: {
    marginBottom: 24,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
  tiersCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 24,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 8,
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
