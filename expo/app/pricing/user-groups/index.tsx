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
import { Plus, X, Users, Edit2, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import {
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  type UserGroupDto,
} from '@/lib/api/pricing';

const GROUP_TYPES: { id: string; label: string }[] = [
  { id: 'household', label: 'Domaćinstvo' },
  { id: 'business', label: 'Poslovni' },
  { id: 'agriculture', label: 'Poljoprivreda' },
  { id: 'livestock', label: 'Stočarstvo' },
];

const typeLabel = (type: string) =>
  GROUP_TYPES.find((t) => t.id === type)?.label || type;

export default function UserGroupsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<UserGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<UserGroupDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('household');
  const [isDefault, setIsDefault] = useState(false);
  const [nameError, setNameError] = useState('');

  const canManagePricing =
    user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';

  const loadGroups = useCallback(async () => {
    try {
      const data = await getUserGroups();
      setGroups(data);
    } catch (error) {
      console.error('Greška pri učitavanju grupa korisnika:', error);
      Alert.alert('Greška', 'Nije moguće učitati grupe korisnika.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManagePricing) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [canManagePricing, loadGroups]);

  const handleAddGroup = () => {
    setName('');
    setDescription('');
    setType('household');
    setIsDefault(false);
    setNameError('');
    setIsEditing(false);
    setCurrentGroup(null);
    setModalVisible(true);
  };

  const handleEditGroup = (group: UserGroupDto) => {
    setName(group.name);
    setDescription(group.description);
    setType(group.type);
    setIsDefault(group.isDefault);
    setNameError('');
    setIsEditing(true);
    setCurrentGroup(group);
    setModalVisible(true);
  };

  const handleDeleteGroup = (group: UserGroupDto) => {
    if (group.isDefault) {
      Alert.alert('Greška', 'Ne možete obrisati osnovnu grupu korisnika.', [{ text: 'OK' }]);
      return;
    }
    Alert.alert(
      'Brisanje grupe',
      'Da li ste sigurni da želite obrisati ovu grupu korisnika?',
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserGroup(group.id);
              setGroups((prev) => prev.filter((g) => g.id !== group.id));
            } catch (error) {
              console.error('Greška pri brisanju grupe:', error);
              Alert.alert('Greška', 'Nije moguće obrisati grupu.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleSaveGroup = async () => {
    if (!name.trim()) {
      setNameError('Naziv grupe je obavezan');
      return;
    }
    setNameError('');

    setIsSaving(true);
    try {
      if (isEditing && currentGroup) {
        await updateUserGroup(currentGroup.id, { name, description, type, isDefault });
      } else {
        await createUserGroup({
          name,
          description,
          type,
          isDefault,
          companyId: user?.companyId ?? null,
        });
      }
      await loadGroups();
      setModalVisible(false);
    } catch (error) {
      console.error('Greška pri spremanju grupe:', error);
      Alert.alert('Greška', 'Nije moguće sačuvati grupu. Pokušajte ponovo.');
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
        title="Grupe korisnika"
        showBack={true}
        showMenu={true}
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upravljanje grupama</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddGroup} activeOpacity={0.7}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj grupu</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Grupe korisnika omogućavaju primjenu različitih paketa cijena na različite kategorije
          korisnika (domaćinstva, poslovni korisnici, poljoprivrednici i sl.).
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje grupa...</Text>
          </View>
        ) : groups.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nema definisanih grupa korisnika.</Text>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupTitleRow}>
                  <Users size={20} color={Colors.primary} style={styles.groupIcon} />
                  <Text style={styles.groupName}>{group.name}</Text>
                  {group.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Osnovna</Text>
                    </View>
                  )}
                </View>
                <View style={styles.groupActions}>
                  <TouchableOpacity
                    onPress={() => handleEditGroup(group)}
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  {!group.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleDeleteGroup(group)}
                      style={styles.actionButton}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={styles.groupType}>{typeLabel(group.type)}</Text>
              {!!group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
              )}
            </Card>
          ))
        )}

        {/* Add/Edit Group Modal */}
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
                  {isEditing ? 'Uredi grupu' : 'Dodaj novu grupu'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Naziv grupe"
                  placeholder="Unesite naziv grupe"
                  value={name}
                  onChangeText={setName}
                  error={nameError}
                  leftIcon={<Users size={20} color={Colors.textLight} />}
                />

                <Input
                  label="Opis"
                  placeholder="Unesite opis grupe"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.selectorLabel}>Tip grupe:</Text>
                <View style={styles.selectorContainer}>
                  {GROUP_TYPES.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.selectorItem,
                        type === option.id && styles.selectorItemActive,
                      ]}
                      onPress={() => setType(option.id)}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          type === option.id && styles.selectorItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Osnovna grupa:</Text>
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
                    onPress={handleSaveGroup}
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
  emptyCard: {
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  groupCard: {
    padding: 16,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    marginRight: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  groupActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  groupType: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: Colors.text,
  },
  selectorLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  selectorContainer: {
    marginBottom: 24,
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
