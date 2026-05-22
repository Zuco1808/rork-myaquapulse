import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, X, Calendar, Edit2, Trash2, Menu } from 'lucide-react-native';
import { PeriodCard, PricingPeriod } from '@/components/pricing/PeriodCard';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';

// Mock data for pricing periods
const mockPeriods: PricingPeriod[] = [
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

export default function PeriodsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [periods, setPeriods] = useState<PricingPeriod[]>(mockPeriods);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State for add/edit period modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<PricingPeriod | null>(null);
  
  // Form state
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  
  // Form errors
  const [nameError, setNameError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  
  const handleAddPeriod = () => {
    // Reset form
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setIsActive(false);
    
    // Reset errors
    setNameError('');
    setStartDateError('');
    setEndDateError('');
    
    // Open modal in add mode
    setIsEditing(false);
    setCurrentPeriod(null);
    setModalVisible(true);
  };
  
  const handleEditPeriod = (period: PricingPeriod) => {
    // Set form values
    setPeriodName(period.name);
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setDescription(period.description || '');
    setIsActive(period.isActive);
    
    // Reset errors
    setNameError('');
    setStartDateError('');
    setEndDateError('');
    
    // Open modal in edit mode
    setIsEditing(true);
    setCurrentPeriod(period);
    setModalVisible(true);
  };
  
  const handleDeletePeriod = (periodId: string) => {
    Alert.alert(
      'Brisanje perioda',
      'Da li ste sigurni da želite obrisati ovaj period?',
      [
        {
          text: 'Otkaži',
          style: 'cancel',
        },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: () => {
            setPeriods(periods.filter(p => p.id !== periodId));
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handlePeriodPress = (period: PricingPeriod) => {
    router.push(`/pricing/periods/${period.id}` as any);
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!periodName.trim()) {
      setNameError('Naziv perioda je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate start date
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!startDate) {
      setStartDateError('Datum početka je obavezan');
      isValid = false;
    } else if (!dateRegex.test(startDate)) {
      setStartDateError('Format datuma mora biti DD.MM.YYYY');
      isValid = false;
    } else {
      setStartDateError('');
    }
    
    // Validate end date
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
  
  const handleSavePeriod = () => {
    if (!validateForm()) {
      return;
    }
    
    if (isEditing && currentPeriod) {
      // Update existing period
      const updatedPeriods = periods.map(p => 
        p.id === currentPeriod.id 
          ? {
              ...p,
              name: periodName,
              startDate,
              endDate,
              description,
              isActive
            }
          : p
      );
      setPeriods(updatedPeriods);
    } else {
      // Add new period
      const newPeriod: PricingPeriod = {
        id: Date.now().toString(),
        name: periodName,
        startDate,
        endDate,
        description,
        isActive
      };
      setPeriods([...periods, newPeriod]);
    }
    
    // Close modal
    setModalVisible(false);
  };
  
  const canManagePricing = user?.role === 'super_admin' || user?.role === 'utility_admin' || user?.role === 'finance';
  
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
        title="Periodi cijena"
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
          <Text style={styles.headerTitle}>Upravljanje periodima</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddPeriod}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Dodaj period</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.description}>
          Periodi omogućavaju definisanje različitih cijena za različite dijelove godine.
          Na primjer, možete definisati ljetni period sa višim cijenama za prekomjernu potrošnju.
        </Text>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktivni periodi</Text>
        </View>
        
        {periods.filter(p => p.isActive).map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            onEdit={handleEditPeriod}
            onDelete={handleDeletePeriod}
            onPress={handlePeriodPress}
          />
        ))}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nadolazeći periodi</Text>
        </View>
        
        {periods.filter(p => !p.isActive).map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            onEdit={handleEditPeriod}
            onDelete={handleDeletePeriod}
            onPress={handlePeriodPress}
          />
        ))}
        
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
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
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
                      isActive ? styles.switchButtonActive : styles.switchButtonInactive
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
                  />
                  
                  <Button
                    title="Sačuvaj"
                    onPress={handleSavePeriod}
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
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
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