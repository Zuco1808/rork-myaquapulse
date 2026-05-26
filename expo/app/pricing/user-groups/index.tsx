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
import { Plus, Users, X, Edit2, Trash2, Info } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { UserGroup, UserGroupType } from '@/types/user';
import {
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
} from '@/lib/api/pricing';

const GROUP_TYPES: { type: UserGroupType; label: string }[] = [
  { type: 'household',   label: 'Domaćinstva' },
  { type: 'business',    label: 'Poslovni korisnici' },
  { type: 'agriculture', label: 'Poljoprivrednici' },
  { type: 'livestock',   label: 'Stočari' },
  { type: 'industrial',  label: 'Industrija' },
  { type: 'other',       label: 'Ostalo' },
];

const getGroupTypeLabel = (type: UserGroupType): string =>
  GROUP_TYPES.find((t) => t.type === type)?.label ?? type;

export default function UserGroupsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const utilityId    = user?.utility_id;
  const canCreate    = !isSuperAdmin && !!utilityId;

  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);

  /* ── modal state ────────────────────────────────── */
  const [modalVisible,  setModalVisible]  = useState(false);
  const [isEditing,     setIsEditing]     = useState(false);
  const [currentGroup,  setCurrentGroup]  = useState<UserGroup | null>(null);

  const [groupName,        setGroupName]        = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isDefault,        setIsDefault]        = useState(false);
  const [groupType,        setGroupType]        = useState<UserGroupType>('household');
  const [nameError,        setNameError]        = useState('');

  /* ── fetch ──────────────────────────────────────── */
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const data = await getUserGroups(utilityId);
      setUserGroups(data);
    } catch (e: any) {
      console.error('Greška pri učitavanju grupa:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchGroups(); }, [utilityId]));

  /* ── modal helpers ──────────────────────────────── */
  const openAddModal = () => {
    if (!canCreate) {
      Alert.alert('Super Admin', 'Upravljanje grupama je dostupno na razini vodovoda.');
      return;
    }
    setGroupName(''); setGroupDescription(''); setIsDefault(false); setGroupType('household');
    setNameError('');
    setIsEditing(false); setCurrentGroup(null);
    setModalVisible(true);
  };

  const openEditModal = (group: UserGroup) => {
    setGroupName(group.name);
    setGroupDescription(group.description ?? '');
    setIsDefault(group.isDefault ?? false);
    setGroupType(group.type);
    setNameError('');
    setIsEditing(true); setCurrentGroup(group);
    setModalVisible(true);
  };

  /* ── save ───────────────────────────────────────── */
  const handleSave = async () => {
    if (!groupName.trim()) { setNameError('Naziv grupe je obavezan'); return; }
    setNameError('');
    setIsSaving(true);
    try {
      if (isEditing && currentGroup) {
        const updated = await updateUserGroup(currentGroup.id, {
          name: groupName.trim(), type: groupType,
          description: groupDescription, is_default: isDefault,
        });
        setUserGroups((prev) => prev.map((g) => g.id === currentGroup.id ? updated : g));
      } else {
        const created = await createUserGroup({
          utility_id: utilityId!, name: groupName.trim(), type: groupType,
          description: groupDescription || undefined, is_default: isDefault,
        });
        setUserGroups((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Snimanje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── delete ─────────────────────────────────────── */
  const handleDelete = (groupId: string) => {
    const group = userGroups.find((g) => g.id === groupId);
    if (group?.isDefault) {
      Alert.alert('Greška', 'Ne možete obrisati osnovnu grupu korisnika.');
      return;
    }
    Alert.alert(
      'Brisanje grupe',
      'Da li ste sigurni da želite obrisati ovu grupu korisnika?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši', style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserGroup(groupId);
              setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
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
        title="Grupe korisnika"
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {isSuperAdmin && (
          <View style={styles.infoNote}>
            <Info size={14} color={Colors.info} />
            <Text style={styles.infoNoteText}>
              Super admin pregled svih grupa. Za upravljanje koristite račun administratora vodovoda.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upravljanje grupama korisnika</Text>
          {canCreate && (
            <TouchableOpacity style={styles.addButton} onPress={openAddModal} activeOpacity={0.7}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Dodaj grupu</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description}>
          Grupe korisnika omogućavaju definisanje različitih cijena za različite tipove korisnika.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : userGroups.length === 0 ? (
          <Text style={styles.emptyText}>Nema definisanih grupa korisnika.</Text>
        ) : (
          userGroups.map((group) => (
            <Card key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupType}>{getGroupTypeLabel(group.type)}</Text>
                  {group.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Osnovna grupa</Text>
                    </View>
                  )}
                </View>
                {canCreate && (
                  <View style={styles.groupActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(group)}>
                      <Edit2 size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    {!group.isDefault && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(group.id)}>
                        <Trash2 size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              {group.description ? (
                <Text style={styles.groupDescription}>{group.description}</Text>
              ) : null}
            </Card>
          ))
        )}

        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu grupe korisnika?</Text>
            <Text style={styles.infoText}>
              Svaki korisnik pripada određenoj grupi, a svaka grupa može imati različite pakete cijena.
            </Text>
          </Card>
        </View>

        {/* Add/Edit Group Modal */}
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
                  {isEditing ? 'Uredi grupu korisnika' : 'Dodaj novu grupu korisnika'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Naziv grupe"
                  placeholder="Unesite naziv grupe"
                  value={groupName}
                  onChangeText={(t) => { setGroupName(t); if (nameError) setNameError(''); }}
                  error={nameError}
                  leftIcon={<Users size={20} color={Colors.textLight} />}
                />
                <Input
                  label="Opis"
                  placeholder="Unesite opis grupe"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.selectorLabel}>Tip grupe:</Text>
                <View style={styles.typeButtons}>
                  {GROUP_TYPES.map(({ type, label }) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeButton, groupType === type && styles.typeButtonActive]}
                      onPress={() => setGroupType(type)}
                    >
                      <Text style={[styles.typeButtonText, groupType === type && styles.typeButtonTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Osnovna grupa:</Text>
                  <TouchableOpacity
                    style={[styles.switchButton, isDefault ? styles.switchBtnOn : styles.switchBtnOff]}
                    onPress={() => setIsDefault(!isDefault)}
                  >
                    <Text style={isDefault ? styles.switchTextOn : styles.switchTextOff}>
                      {isDefault ? 'Da' : 'Ne'}
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
  emptyText:        { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginVertical: 16 },

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

  groupCard:        { marginBottom: 16, padding: 16 },
  groupHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  groupInfo:        { flex: 1 },
  groupName:        { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  groupType:        { fontSize: 14, color: Colors.textLight, marginBottom: 4 },
  defaultBadge:     { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  defaultBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  groupDescription: { fontSize: 14, color: Colors.text, marginTop: 8 },
  groupActions:     { flexDirection: 'row' },
  actionButton:     { padding: 4, marginLeft: 8 },

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

  selectorLabel: { fontSize: 16, color: Colors.text, marginBottom: 8 },
  typeButtons:   { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  typeButton:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card },
  typeButtonActive:   { backgroundColor: Colors.primary },
  typeButtonText:     { fontSize: 14, color: Colors.textLight },
  typeButtonTextActive: { color: '#fff', fontWeight: '500' },

  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  switchLabel:     { fontSize: 16, color: Colors.text },
  switchButton:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  switchBtnOn:     { backgroundColor: Colors.primary },
  switchBtnOff:    { backgroundColor: Colors.card },
  switchTextOn:    { color: '#fff', fontWeight: '500' },
  switchTextOff:   { color: Colors.textLight },
});
