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
import { Plus, Package, Calendar, X, Users, Info } from 'lucide-react-native';
import { PackageCard, PricingPackage } from '@/components/pricing/PackageCard';
import { PricingPeriod } from '@/components/pricing/PeriodCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { UserGroup } from '@/types/user';
import {
  getPricingPackages, createPricingPackage, updatePricingPackage, deletePricingPackage,
  getPricingPeriods,
  getUserGroups,
} from '@/lib/api/pricing';

export default function PricingScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { canAccessAllTenants } = usePermissions();

  const utilityId = user?.utility_id;
  const canCreate = !canAccessAllTenants && !!utilityId;

  const [packages,   setPackages]   = useState<PricingPackage[]>([]);
  const [periods,    setPeriods]    = useState<PricingPeriod[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);

  /* ── modal state ────────────────────────────────── */
  const [modalVisible,   setModalVisible]   = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [currentPackage, setCurrentPackage] = useState<PricingPackage | null>(null);

  const [packageName,          setPackageName]          = useState('');
  const [packageDescription,   setPackageDescription]   = useState('');
  const [isDefault,            setIsDefault]            = useState(false);
  const [selectedPeriodIds,    setSelectedPeriodIds]    = useState<string[]>([]);
  const [selectedUserGroupIds, setSelectedUserGroupIds] = useState<string[]>([]);

  const [nameError,       setNameError]       = useState('');
  const [periodsError,    setPeriodsError]    = useState('');
  const [userGroupsError, setUserGroupsError] = useState('');

  /* ── fetch ──────────────────────────────────────── */
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [pkgs, pds, ugs] = await Promise.all([
        getPricingPackages(utilityId),
        getPricingPeriods(utilityId),
        getUserGroups(utilityId),
      ]);
      setPackages(pkgs);
      setPeriods(pds);
      setUserGroups(ugs);
    } catch (e: any) {
      console.error('Greška pri učitavanju cijena:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, [utilityId]));

  /* ── modal helpers ──────────────────────────────── */
  const openAddModal = () => {
    if (!canCreate) {
      Alert.alert(
        'Super Admin',
        'Upravljanje cijenama je dostupno na razini vodovoda. Koristite račun administratora vodovoda.',
      );
      return;
    }
    setPackageName(''); setPackageDescription(''); setIsDefault(false);
    setSelectedPeriodIds([]); setSelectedUserGroupIds([]);
    setNameError(''); setPeriodsError(''); setUserGroupsError('');
    setIsEditing(false); setCurrentPackage(null);
    setModalVisible(true);
  };

  const openEditModal = (pkg: PricingPackage) => {
    setPackageName(pkg.name);
    setPackageDescription(pkg.description);
    setIsDefault(pkg.isDefault);
    setSelectedPeriodIds(pkg.periodIds || []);
    setSelectedUserGroupIds(pkg.userGroupIds || []);
    setNameError(''); setPeriodsError(''); setUserGroupsError('');
    setIsEditing(true); setCurrentPackage(pkg);
    setModalVisible(true);
  };

  const togglePeriod    = (id: string) =>
    setSelectedPeriodIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleUserGroup = (id: string) =>
    setSelectedUserGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  /* ── validation ─────────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!packageName.trim()) { setNameError('Naziv paketa je obavezan'); ok = false; } else setNameError('');
    if (selectedPeriodIds.length === 0)    { setPeriodsError('Odaberite barem jedan period'); ok = false; } else setPeriodsError('');
    if (selectedUserGroupIds.length === 0) { setUserGroupsError('Odaberite barem jednu grupu korisnika'); ok = false; } else setUserGroupsError('');
    return ok;
  };

  /* ── save ───────────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (isEditing && currentPackage) {
        const updated = await updatePricingPackage(currentPackage.id, {
          name:           packageName.trim(),
          description:    packageDescription.trim(),
          is_default:     isDefault,
          period_ids:     selectedPeriodIds,
          user_group_ids: selectedUserGroupIds,
        });
        setPackages((prev) => prev.map((p) => p.id === currentPackage.id ? updated : p));
      } else {
        const created = await createPricingPackage({
          utility_id:     utilityId!,
          name:           packageName.trim(),
          description:    packageDescription.trim(),
          is_default:     isDefault,
          period_ids:     selectedPeriodIds,
          user_group_ids: selectedUserGroupIds,
        });
        setPackages((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Snimanje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── delete ─────────────────────────────────────── */
  const handleDeletePackage = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg?.isDefault) {
      Alert.alert('Greška', 'Ne možete obrisati osnovni paket.');
      return;
    }
    Alert.alert(
      'Brisanje paketa',
      'Da li ste sigurni da želite obrisati ovaj paket?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši', style: 'destructive',
          onPress: async () => {
            try {
              await deletePricingPackage(packageId);
              setPackages((prev) => prev.filter((p) => p.id !== packageId));
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

  /* ── render ─────────────────────────────────────── */
  return (
    <>
      <Header
        title="Upravljanje cijenama"
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Super admin note */}
        {canAccessAllTenants && (
          <View style={styles.infoNote}>
            <Info size={14} color={Colors.info} />
            <Text style={styles.infoNoteText}>
              Super admin pregled: prikazani su paketi svih vodovoda. Za upravljanje koristite račun administratora vodovoda.
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={openAddModal} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <Package size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Dodaj novi paket</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/pricing/periods' as any)} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
              <Calendar size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Upravljaj periodima</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/pricing/user-groups' as any)} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.info }]}>
              <Users size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Grupe korisnika</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Paketi cijena</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : packages.length === 0 ? (
          <Text style={styles.emptyText}>Nema definisanih paketa cijena.</Text>
        ) : (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onEdit={canCreate ? openEditModal : undefined}
              onDelete={canCreate ? handleDeletePackage : undefined}
              onPress={(p) => router.push(`/pricing/packages/${p.id}` as any)}
            />
          ))
        )}

        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu paketi cijena?</Text>
            <Text style={styles.infoText}>
              Paketi cijena omogućavaju definisanje različitih cijena za različite količine potrošnje vode.
              Možete kreirati posebne pakete za različite periode godine i grupe korisnika.
            </Text>
          </Card>
        </View>

        {/* Add/Edit Package Modal */}
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
                  onChangeText={(t) => { setPackageName(t); if (nameError) setNameError(''); }}
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
                    style={[styles.switchButton, isDefault ? styles.switchBtnOn : styles.switchBtnOff]}
                    onPress={() => setIsDefault(!isDefault)}
                  >
                    <Text style={isDefault ? styles.switchTextOn : styles.switchTextOff}>
                      {isDefault ? 'Da' : 'Ne'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.selectorLabel}>Odaberite periode:</Text>
                {periodsError ? <Text style={styles.errorText}>{periodsError}</Text> : null}
                {periods.length === 0 ? (
                  <Text style={styles.emptyText}>Nema perioda. Dodajte period u "Upravljaj periodima".</Text>
                ) : (
                  <View style={styles.selectorContainer}>
                    {periods.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.selectorItem, selectedPeriodIds.includes(p.id) && styles.selectorItemActive]}
                        onPress={() => togglePeriod(p.id)}
                      >
                        <Text style={[styles.selectorItemText, selectedPeriodIds.includes(p.id) && styles.selectorItemTextActive]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.selectorLabel}>Odaberite grupe korisnika:</Text>
                {userGroupsError ? <Text style={styles.errorText}>{userGroupsError}</Text> : null}
                {userGroups.length === 0 ? (
                  <Text style={styles.emptyText}>Nema grupa. Dodajte grupu u "Grupe korisnika".</Text>
                ) : (
                  <View style={styles.selectorContainer}>
                    {userGroups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.selectorItem, selectedUserGroupIds.includes(g.id) && styles.selectorItemActive]}
                        onPress={() => toggleUserGroup(g.id)}
                      >
                        <Text style={[styles.selectorItemText, selectedUserGroupIds.includes(g.id) && styles.selectorItemTextActive]}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

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
  container:      { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16, paddingBottom: 32 },

  noAccessText: { fontSize: 16, color: Colors.text, textAlign: 'center', marginTop: 24 },
  emptyText:    { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginVertical: 16 },

  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.highlight, borderRadius: 8,
    padding: 12, marginBottom: 14,
  },
  infoNoteText: { fontSize: 12, color: Colors.textLight, flex: 1 },

  quickActions: { flexDirection: 'row', marginBottom: 24 },
  actionCard:   { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  actionIcon:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionText:   { fontSize: 12, color: Colors.text, textAlign: 'center' },

  sectionHeader: { marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  infoCard:        { marginTop: 24 },
  infoCardContent: { padding: 16, backgroundColor: Colors.background },
  infoTitle:       { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  infoText:        { fontSize: 14, color: Colors.text, lineHeight: 20 },

  /* modal */
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

  selectorLabel:         { fontSize: 16, color: Colors.text, marginBottom: 8 },
  selectorContainer:     { marginBottom: 24 },
  selectorItem:          { padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: 8 },
  selectorItemActive:    { borderColor: Colors.primary, backgroundColor: Colors.highlight },
  selectorItemText:      { fontSize: 14, color: Colors.text },
  selectorItemTextActive: { color: Colors.primary, fontWeight: '500' },
  errorText:             { fontSize: 14, color: Colors.error, marginBottom: 8 },
});
