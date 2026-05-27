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
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Plus, Package, X } from 'lucide-react-native';
import { PricingTierCard, PricingTier } from '@/components/pricing/PricingTierCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { UserGroup } from '@/types/user';
import { PricingPackage } from '@/components/pricing/PackageCard';
import {
  getPricingPackages,
  getPricingTiers,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  getUserGroups,
} from '@/lib/api/pricing';

export default function PackageDetailsScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const utilityId    = user?.utility_id;
  const canCreate    = !isSuperAdmin && !!utilityId;

  const [packageInfo,  setPackageInfo]  = useState<PricingPackage | null>(null);
  const [tiers,        setTiers]        = useState<PricingTier[]>([]);
  const [userGroups,   setUserGroups]   = useState<UserGroup[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);

  /* ── modal state ────────────────────────────────── */
  const [modalVisible,  setModalVisible]  = useState(false);
  const [isEditing,     setIsEditing]     = useState(false);
  const [currentTier,   setCurrentTier]   = useState<PricingTier | null>(null);

  const [minConsumption,      setMinConsumption]      = useState('');
  const [maxConsumption,      setMaxConsumption]      = useState('');
  const [pricePerUnit,        setPricePerUnit]        = useState('');
  const [tierDescription,     setTierDescription]     = useState('');
  const [minConsumptionError, setMinConsumptionError] = useState('');
  const [maxConsumptionError, setMaxConsumptionError] = useState('');
  const [pricePerUnitError,   setPricePerUnitError]   = useState('');

  /* ── fetch ──────────────────────────────────────── */
  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [pkgs, tierData, ugs] = await Promise.all([
        getPricingPackages(utilityId),
        getPricingTiers(id),
        getUserGroups(utilityId),
      ]);
      const pkg = pkgs.find((p) => p.id === id) ?? null;
      setPackageInfo(pkg);
      setTiers(tierData);
      setUserGroups(ugs);
    } catch (e: any) {
      console.error('Greška pri učitavanju paketa:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id, utilityId]));

  /* ── modal helpers ──────────────────────────────── */
  const openAddModal = () => {
    setMinConsumption(''); setMaxConsumption(''); setPricePerUnit(''); setTierDescription('');
    setMinConsumptionError(''); setMaxConsumptionError(''); setPricePerUnitError('');
    setIsEditing(false); setCurrentTier(null);
    setModalVisible(true);
  };

  const openEditModal = (tier: PricingTier) => {
    setMinConsumption(tier.minConsumption.toString());
    setMaxConsumption(tier.maxConsumption != null ? tier.maxConsumption.toString() : '');
    setPricePerUnit(tier.pricePerUnit.toString());
    setTierDescription(tier.description || '');
    setMinConsumptionError(''); setMaxConsumptionError(''); setPricePerUnitError('');
    setIsEditing(true); setCurrentTier(tier);
    setModalVisible(true);
  };

  /* ── validation ─────────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!minConsumption || isNaN(Number(minConsumption)) || Number(minConsumption) < 0) {
      setMinConsumptionError('Unesite validnu minimalnu potrošnju'); ok = false;
    } else setMinConsumptionError('');
    if (maxConsumption && (isNaN(Number(maxConsumption)) || Number(maxConsumption) <= Number(minConsumption))) {
      setMaxConsumptionError('Maksimalna potrošnja mora biti veća od minimalne'); ok = false;
    } else setMaxConsumptionError('');
    if (!pricePerUnit || isNaN(Number(pricePerUnit)) || Number(pricePerUnit) <= 0) {
      setPricePerUnitError('Unesite validnu cijenu'); ok = false;
    } else setPricePerUnitError('');
    return ok;
  };

  /* ── save ───────────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const maxVal = maxConsumption ? Number(maxConsumption) : null;
      if (isEditing && currentTier) {
        const updated = await updatePricingTier(currentTier.id, {
          min_consumption: Number(minConsumption),
          max_consumption: maxVal,
          price_per_unit:  Number(pricePerUnit),
          description:     tierDescription,
        });
        setTiers((prev) => prev.map((t) => t.id === currentTier.id ? updated : t));
      } else {
        const created = await createPricingTier({
          package_id:      id!,
          min_consumption: Number(minConsumption),
          max_consumption: maxVal,
          price_per_unit:  Number(pricePerUnit),
          description:     tierDescription,
          sort_order:      tiers.length,
        });
        setTiers((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Snimanje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── delete ─────────────────────────────────────── */
  const handleDeleteTier = (tierId: string) => {
    Alert.alert(
      'Brisanje praga',
      'Da li ste sigurni da želite obrisati ovaj prag potrošnje?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši', style: 'destructive',
          onPress: async () => {
            try {
              await deletePricingTier(tierId);
              setTiers((prev) => prev.filter((t) => t.id !== tierId));
            } catch (e: any) {
              Alert.alert('Greška', e?.message);
            }
          },
        },
      ],
    );
  };

  /* ── helpers ────────────────────────────────────── */
  const getUserGroupNames = (groupIds: string[]) => {
    if (!groupIds?.length) return 'Svi korisnici';
    return groupIds
      .map((gid) => userGroups.find((g) => g.id === gid)?.name)
      .filter(Boolean)
      .join(', ') || 'Svi korisnici';
  };

  /* ── access guard ───────────────────────────────── */
  const { canManageBilling: canManagePricing } = usePermissions();
  if (!canManagePricing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.noAccessText}>Nemate pristup ovoj stranici.</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── render ─────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={packageInfo?.name ?? 'Detalji paketa'}
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : !packageInfo ? (
          <Text style={styles.noAccessText}>Paket nije pronađen.</Text>
        ) : (
          <>
            {/* Package header */}
            <View style={styles.header}>
              <View style={styles.packageIconContainer}>
                <Package size={24} color={Colors.primary} />
              </View>
              <View style={styles.packageInfo}>
                <Text style={styles.packageName}>{packageInfo.name}</Text>
                {packageInfo.description ? (
                  <Text style={styles.packageDescription}>{packageInfo.description}</Text>
                ) : null}
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
                <Text style={styles.detailValue}>
                  {getUserGroupNames(packageInfo.userGroupIds)}
                </Text>
              </View>
            </Card>

            {/* Tiers section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pragovi potrošnje</Text>
              {canCreate && (
                <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Dodaj prag</Text>
                </TouchableOpacity>
              )}
            </View>

            <Card style={styles.tiersCard}>
              {tiers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Nema definisanih pragova potrošnje. {canCreate ? 'Dodajte prvi prag.' : ''}
                  </Text>
                </View>
              ) : (
                tiers.map((tier, index) => (
                  <PricingTierCard
                    key={tier.id}
                    tier={tier}
                    onEdit={canCreate ? openEditModal : undefined}
                    onDelete={canCreate ? handleDeleteTier : undefined}
                    isLast={index === tiers.length - 1}
                  />
                ))
              )}
            </Card>

            <View style={styles.infoCard}>
              <Card style={styles.infoCardContent}>
                <Text style={styles.infoTitle}>Kako funkcionišu pragovi potrošnje?</Text>
                <Text style={styles.infoText}>
                  Pragovi potrošnje omogućavaju definisanje različitih cijena za različite količine potrošnje vode.
                  Npr. niža cijena za osnovnu potrošnju i viša za prekomjernu.
                </Text>
              </Card>
            </View>
          </>
        )}

        {/* Add/Edit Tier Modal */}
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
                  onChangeText={(t) => { setMinConsumption(t); if (minConsumptionError) setMinConsumptionError(''); }}
                  keyboardType="numeric"
                  error={minConsumptionError}
                />
                <Input
                  label="Maksimalna potrošnja (m³)"
                  placeholder="Ostavite prazno za neograničeno"
                  value={maxConsumption}
                  onChangeText={(t) => { setMaxConsumption(t); if (maxConsumptionError) setMaxConsumptionError(''); }}
                  keyboardType="numeric"
                  error={maxConsumptionError}
                />
                <Input
                  label="Cijena po jedinici (KM/m³)"
                  placeholder="Unesite cijenu po jedinici"
                  value={pricePerUnit}
                  onChangeText={(t) => { setPricePerUnit(t); if (pricePerUnitError) setPricePerUnitError(''); }}
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
                  <Button title="Otkaži" variant="outline" onPress={() => setModalVisible(false)} style={styles.modalButton} />
                  <Button title="Sačuvaj" onPress={handleSave} isLoading={isSaving} style={styles.modalButton} />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: '#fff' },
  container:        { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16, paddingBottom: 32 },
  noAccessText:     { fontSize: 16, color: Colors.text, textAlign: 'center', marginTop: 24 },

  header:               { flexDirection: 'row', marginBottom: 24 },
  packageIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  packageInfo:          { flex: 1 },
  packageName:          { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  packageDescription:   { fontSize: 14, color: Colors.textLight, marginBottom: 8 },
  defaultBadge:         { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  defaultBadgeText:     { color: '#fff', fontSize: 12, fontWeight: '500' },

  detailsCard: { marginBottom: 24, padding: 16 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: Colors.textLight },
  detailValue: { fontSize: 14, color: Colors.text, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 8 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  addButton:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 4 },

  tiersCard:     { padding: 0, overflow: 'hidden', marginBottom: 24 },
  emptyState:    { padding: 24, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  infoCard:        { marginTop: 8 },
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
});
