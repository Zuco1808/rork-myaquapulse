import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Package, Calendar, X, Users, Menu } from 'lucide-react-native';
import { PackageCard, PricingPackage } from '@/components/pricing/PackageCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { UserGroup } from '@/types/user';

// Mock data for pricing packages
const mockPackages: PricingPackage[] = [
  {
    id: '1',
    name: 'Standardni paket',
    description: 'Osnovni paket za domaćinstva',
    isDefault: true,
    periodIds: ['1', '2'],
    userGroupIds: ['1'],
  },
  {
    id: '2',
    name: 'Poslovni paket',
    description: 'Paket za poslovne korisnike',
    isDefault: false,
    periodIds: ['1', '2'],
    userGroupIds: ['2'],
  },
  {
    id: '3',
    name: 'Ljetni paket',
    description: 'Poseban paket za ljetni period sa progresivnim cijenama',
    isDefault: false,
    periodIds: ['2'],
    userGroupIds: ['1', '2'],
  },
];

// Mock data for periods
const mockPeriods = [
  {
    id: '1',
    name: 'Standardni period',
    startDate: '01.01.2023',
    endDate: '31.05.2023',
    description: 'Redovni period bez ograničenja potrošnje',
    isActive: false,
  },
  {
    id: '2',
    name: 'Ljetni period',
    startDate: '01.06.2023',
    endDate: '30.09.2023',
    description: 'Period sa mogućim redukcijama i povećanim cijenama za prekomjernu potrošnju',
    isActive: true,
  },
  {
    id: '3',
    name: 'Zimski period',
    startDate: '01.10.2023',
    endDate: '31.12.2023',
    description: 'Period sa standardnim cijenama',
    isActive: false,
  },
];

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

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [packages, setPackages] = useState<PricingPackage[]>(mockPackages);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State for add/edit package modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<PricingPackage | null>(null);
  
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
  
  const handleAddPackage = () => {
    // Reset form
    setPackageName('');
    setPackageDescription('');
    setIsDefault(false);
    setSelectedPeriodIds([]);
    setSelectedUserGroupIds([]);
    
    // Reset errors
    setNameError('');
    setPeriodsError('');
    setUserGroupsError('');
    
    // Open modal in add mode
    setIsEditing(false);
    setCurrentPackage(null);
    setModalVisible(true);
  };
  
  const handleEditPackage = (pkg: PricingPackage) => {
    // Set form values
    setPackageName(pkg.name);
    setPackageDescription(pkg.description);
    setIsDefault(pkg.isDefault);
    setSelectedPeriodIds(pkg.periodIds || []);
    setSelectedUserGroupIds(pkg.userGroupIds || []);
    
    // Reset errors
    setNameError('');
    setPeriodsError('');
    setUserGroupsError('');
    
    // Open modal in edit mode
    setIsEditing(true);
    setCurrentPackage(pkg);
    setModalVisible(true);
  };
  
  const handleDeletePackage = (packageId: string) => {
    // Don't allow deleting default package
    const pkg = packages.find(p => p.id === packageId);
    if (pkg && pkg.isDefault) {
      Alert.alert(
        'Greška',
        'Ne možete obrisati osnovni paket.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Brisanje paketa',
      'Da li ste sigurni da želite obrisati ovaj paket?',
      [
        {
          text: 'Otkaži',
          style: 'cancel',
        },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: () => {
            setPackages(packages.filter(p => p.id !== packageId));
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handlePackagePress = (pkg: PricingPackage) => {
    router.push(`/pricing/packages/${pkg.id}`);
  };
  
  const navigateToPeriods = () => {
    router.push('/pricing/periods');
  };
  
  const navigateToUserGroups = () => {
    router.push('/pricing/user-groups');
  };
  
  const togglePeriodSelection = (periodId: string) => {
    if (selectedPeriodIds.includes(periodId)) {
      setSelectedPeriodIds(selectedPeriodIds.filter(id => id !== periodId));
    } else {
      setSelectedPeriodIds([...selectedPeriodIds, periodId]);
    }
    
    // Clear error if at least one period is selected
    if (periodsError && selectedPeriodIds.length > 0) {
      setPeriodsError('');
    }
  };
  
  const toggleUserGroupSelection = (groupId: string) => {
    if (selectedUserGroupIds.includes(groupId)) {
      setSelectedUserGroupIds(selectedUserGroupIds.filter(id => id !== groupId));
    } else {
      setSelectedUserGroupIds([...selectedUserGroupIds, groupId]);
    }
    
    // Clear error if at least one user group is selected
    if (userGroupsError && selectedUserGroupIds.length > 0) {
      setUserGroupsError('');
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!packageName.trim()) {
      setNameError('Naziv paketa je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate periods
    if (selectedPeriodIds.length === 0) {
      setPeriodsError('Odaberite barem jedan period');
      isValid = false;
    } else {
      setPeriodsError('');
    }
    
    // Validate user groups
    if (selectedUserGroupIds.length === 0) {
      setUserGroupsError('Odaberite barem jednu grupu korisnika');
      isValid = false;
    } else {
      setUserGroupsError('');
    }
    
    return isValid;
  };
  
  const handleSavePackage = () => {
    if (!validateForm()) {
      return;
    }
    
    // If setting this package as default, unset default for all other packages
    let updatedPackages = [...packages];
    if (isDefault) {
      updatedPackages = updatedPackages.map(p => ({
        ...p,
        isDefault: false
      }));
    }
    
    if (isEditing && currentPackage) {
      // Update existing package
      updatedPackages = updatedPackages.map(p => 
        p.id === currentPackage.id 
          ? {
              ...p,
              name: packageName,
              description: packageDescription,
              isDefault,
              periodIds: selectedPeriodIds,
              userGroupIds: selectedUserGroupIds
            }
          : p
      );
    } else {
      // Add new package
      const newPackage: PricingPackage = {
        id: Date.now().toString(),
        name: packageName,
        description: packageDescription,
        isDefault,
        periodIds: selectedPeriodIds,
        userGroupIds: selectedUserGroupIds
      };
      updatedPackages.push(newPackage);
    }
    
    setPackages(updatedPackages);
    setModalVisible(false);
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
        title="Upravljanje cijenama"
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
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleAddPackage}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary }]}>
              <Package size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Dodaj novi paket</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={navigateToPeriods}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary }]}>
              <Calendar size={24} color="#fff" />
            </View>
            <Text style={styles.actionText}>Upravljaj periodima</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={navigateToUserGroups}
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
        
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            onEdit={handleEditPackage}
            onDelete={handleDeletePackage}
            onPress={handlePackagePress}
          />
        ))}
        
        <View style={styles.infoCard}>
          <Card style={styles.infoCardContent}>
            <Text style={styles.infoTitle}>Kako funkcionišu paketi cijena?</Text>
            <Text style={styles.infoText}>
              Paketi cijena omogućavaju definisanje različitih cijena za različite količine potrošnje vode.
              Možete kreirati posebne pakete za različite periode godine, kao što je ljetni period kada
              su moguće redukcije vode.
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
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
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
                      isDefault ? styles.switchButtonActive : styles.switchButtonInactive
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
                  {mockPeriods.map(period => (
                    <TouchableOpacity
                      key={period.id}
                      style={[
                        styles.selectorItem,
                        selectedPeriodIds.includes(period.id) && styles.selectorItemActive
                      ]}
                      onPress={() => togglePeriodSelection(period.id)}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          selectedPeriodIds.includes(period.id) && styles.selectorItemTextActive
                        ]}
                      >
                        {period.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.selectorLabel}>Odaberite grupe korisnika:</Text>
                {userGroupsError ? <Text style={styles.errorText}>{userGroupsError}</Text> : null}
                <View style={styles.selectorContainer}>
                  {mockUserGroups.map(group => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.selectorItem,
                        selectedUserGroupIds.includes(group.id) && styles.selectorItemActive
                      ]}
                      onPress={() => toggleUserGroupSelection(group.id)}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          selectedUserGroupIds.includes(group.id) && styles.selectorItemTextActive
                        ]}
                      >
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
                    onPress={handleSavePackage}
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