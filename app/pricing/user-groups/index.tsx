import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Users, X, Edit2, Trash2, Menu } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { UserGroup, UserGroupType } from '@/types/user';

// Mock data for user groups
const mockUserGroups: UserGroup[] = [
  {
    id: '1',
    name: 'Domaćinstva',
    description: 'Privatna domaćinstva i stanovi',
    isDefault: true,
    type: 'household',
  },
  {
    id: '2',
    name: 'Poslovni korisnici',
    description: 'Kompanije i poslovni objekti',
    isDefault: false,
    type: 'business',
  },
  {
    id: '3',
    name: 'Poljoprivrednici',
    description: 'Korisnici koji koriste vodu za poljoprivredu',
    isDefault: false,
    type: 'agriculture',
  },
  {
    id: '4',
    name: 'Stočari',
    description: 'Korisnici koji koriste vodu za stočarstvo',
    isDefault: false,
    type: 'livestock',
  },
];

export default function UserGroupsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [userGroups, setUserGroups] = useState<UserGroup[]>(mockUserGroups);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State for add/edit group modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<UserGroup | null>(null);
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [groupType, setGroupType] = useState<UserGroupType>('household');
  
  // Form errors
  const [nameError, setNameError] = useState('');
  
  const handleAddGroup = () => {
    // Reset form
    setGroupName('');
    setGroupDescription('');
    setIsDefault(false);
    setGroupType('household');
    
    // Reset errors
    setNameError('');
    
    // Open modal in add mode
    setIsEditing(false);
    setCurrentGroup(null);
    setModalVisible(true);
  };
  
  const handleEditGroup = (group: UserGroup) => {
    // Set form values
    setGroupName(group.name);
    setGroupDescription(group.description);
    setIsDefault(group.isDefault);
    setGroupType(group.type);
    
    // Reset errors
    setNameError('');
    
    // Open modal in edit mode
    setIsEditing(true);
    setCurrentGroup(group);
    setModalVisible(true);
  };
  
  const handleDeleteGroup = (groupId: string) => {
    // Don't allow deleting default group
    const group = userGroups.find(g => g.id === groupId);
    if (group && group.isDefault) {
      Alert.alert(
        'Greška',
        'Ne možete obrisati osnovnu grupu korisnika.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Brisanje grupe',
      'Da li ste sigurni da želite obrisati ovu grupu korisnika?',
      [
        {
          text: 'Otkaži',
          style: 'cancel',
        },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: () => {
            setUserGroups(userGroups.filter(g => g.id !== groupId));
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!groupName.trim()) {
      setNameError('Naziv grupe je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }
    
    return isValid;
  };
  
  const handleSaveGroup = () => {
    if (!validateForm()) {
      return;
    }
    
    // If setting this group as default, unset default for all other groups
    let updatedGroups = [...userGroups];
    if (isDefault) {
      updatedGroups = updatedGroups.map(g => ({
        ...g,
        isDefault: false
      }));
    }
    
    if (isEditing && currentGroup) {
      // Update existing group
      updatedGroups = updatedGroups.map(g => 
        g.id === currentGroup.id 
          ? {
              ...g,
              name: groupName,
              description: groupDescription,
              isDefault,
              type: groupType
            }
          : g
      );
    } else {
      // Add new group
      const newGroup: UserGroup = {
        id: Date.now().toString(),
        name: groupName,
        description: groupDescription,
        isDefault,
        type: groupType
      };
      updatedGroups.push(newGroup);
    }
    
    setUserGroups(updatedGroups);
    setModalVisible(false);
  };
  
  const getGroupTypeLabel = (type: UserGroupType) => {
    switch (type) {
      case 'household':
        return 'Domaćinstva';
      case 'business':
        return 'Poslovni korisnici';
      case 'agriculture':
        return 'Poljoprivrednici';
      case 'livestock':
        return 'Stočari';
      case 'industrial':
        return 'Industrija';
      case 'other':
        return 'Ostalo';
      default:
        return type;
    }
  };
  
  const canManagePricing = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'finance';
  
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
      
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upravljanje grupama korisnika</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddGroup}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj grupu</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.description}>
          Grupe korisnika omogućavaju definisanje različitih cijena za različite tipove korisnika.
          Na primjer, možete definisati različite cijene za domaćinstva i poslovne korisnike.
        </Text>
        
        {userGroups.map((group) => (
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
              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditGroup(group)}
                >
                  <Edit2 size={20} color={Colors.primary} />
                </TouchableOpacity>
                {!group.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {group.description && (
              <Text style={styles.groupDescription}>{group.description}</Text>
            )}
          </Card>
        ))}
        
        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu grupe korisnika?</Text>
            <Text style={styles.infoText}>
              Grupe korisnika omogućavaju definisanje različitih cijena za različite tipove korisnika.
              Svaki korisnik pripada određenoj grupi, a svaka grupa može imati različite pakete cijena.
            </Text>
          </Card>
        </View>
        
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
                  {isEditing ? 'Uredi grupu korisnika' : 'Dodaj novu grupu korisnika'}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <Input
                  label="Naziv grupe"
                  placeholder="Unesite naziv grupe"
                  value={groupName}
                  onChangeText={setGroupName}
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
                  {(['household', 'business', 'agriculture', 'livestock', 'industrial', 'other'] as UserGroupType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        groupType === type && styles.typeButtonActive
                      ]}
                      onPress={() => setGroupType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          groupType === type && styles.typeButtonTextActive
                        ]}
                      >
                        {getGroupTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Osnovna grupa:</Text>
                  <TouchableOpacity
                    style={[
                      styles.switchButton,
                      isDefault ? styles.switchButtonActive : styles.switchButtonInactive
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
                  />
                  
                  <Button
                    title="Sačuvaj"
                    onPress={handleSaveGroup}
                    style={styles.modalButton}
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
  groupCard: {
    marginBottom: 16,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  groupType: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
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
  groupDescription: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 8,
  },
  groupActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
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
  // Modal styles
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
  selectorLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginBottom: 8,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  typeButtonTextActive: {
    color: '#fff',
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