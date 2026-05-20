import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Plus, 
  Camera, 
  Edit3,
  Filter,
  Search,
  ChevronLeft
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ReadingCard } from '@/components/readings/ReadingCard';
import { OCRCameraView } from '@/components/ocr/CameraView';
import { OCRResult } from '@/components/ocr/OCRResult';
import { useAuthStore } from '@/store/auth-store';
import { getReadings, createReading } from '@/lib/api/readings';
import { getMeters } from '@/lib/api/meters';
import Colors from '@/constants/colors';
import { MeterReading } from '@/types/location';

// Extended reading type with meter info
interface ExtendedReading extends MeterReading {
  meterSerialNumber?: string;
  meterId: string; // Added to fix TypeScript error
}

export default function ReadingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showOCRResult, setShowOCRResult] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showAddReadingModal, setShowAddReadingModal] = useState(false);
  const [manualReading, setManualReading] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [availableMeters, setAvailableMeters] = useState<any[]>([]);
  const [readings, setReadings] = useState<ExtendedReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<ExtendedReading[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [readingError, setReadingError] = useState('');
  
  const fetchData = async () => {
    if (!user) {
      router.replace('/login' as any);
      return;
    }
    try {
      const [metersData, readingsData] = await Promise.all([
        getMeters(),
        getReadings(),
      ]);
      const userMeters = user.role === 'citizen'
        ? metersData.filter((m: any) => m.userId === user.id)
        : metersData;
      const userReadings = user.role === 'citizen'
        ? readingsData.filter((r: any) => userMeters.some((m: any) => m.id === r.meter_id))
        : readingsData;
      setAvailableMeters(userMeters);
      setReadings(userReadings);
      setFilteredReadings(userReadings);
      if (userMeters.length > 0) setSelectedMeterId(userMeters[0].id);
    } catch (err) {
      console.error('Greska pri ucitavanju:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  const handleAddReading = () => {
    // Check if user has permission to read meters
    if (user?.role === 'citizen' && !user.permissions?.canReadMeters) {
      Alert.alert(
        "Nemate dozvolu",
        "Nemate dozvolu za unos očitanja. Kontaktirajte administratora."
      );
      return;
    }
    
    setShowAddReadingModal(true);
  };
  
  const validateReading = (value: number): boolean => {
    // Find the selected meter
    const meter = availableMeters.find(m => m.id === selectedMeterId);
    if (!meter) {
      setReadingError("Odabrani vodomjer nije pronađen");
      return false;
    }
    
    // Find the last reading for this meter
    const lastReading = readings
      .filter(r => r.meterId === selectedMeterId)
      .sort((a, b) => b.readingDate - a.readingDate)[0];
    
    // If there's a previous reading, ensure the new value is greater or equal
    if (lastReading && value < lastReading.value) {
      setReadingError(`Nova vrijednost mora biti veća ili jednaka posljednjoj (${lastReading.value} m³)`);
      return false;
    }
    
    setReadingError("");
    return true;
  };
  
  const handleManualSubmit = () => {
    const value = parseFloat(manualReading);
    
    if (isNaN(value)) {
      setReadingError("Unesite validnu numeričku vrijednost");
      return;
    }
    
    if (!validateReading(value)) {
      return;
    }
    
    // In a real app, you would submit the reading to your backend
    const newReading: ExtendedReading = {
      id: `reading-${Date.now()}`,
      meterId: selectedMeterId,
      value: value,
      readingDate: Date.now(),
      readBy: user?.id || '',
      readMethod: user?.role === 'citizen' ? 'citizen' : 'manual',
      status: user?.role === 'citizen' ? 'pending' : 'verified',
      meterSerialNumber: availableMeters.find(m => m.id === selectedMeterId)?.serialNumber
    };
    
    // Add the new reading to the list
    const updatedReadings = [newReading, ...readings];
    setReadings(updatedReadings);
    setFilteredReadings(updatedReadings);
    
    // Close modal and reset form
    setShowAddReadingModal(false);
    setManualReading('');
    setReadingError('');
    
    Alert.alert(
      "Uspjeh",
      "Očitanje je uspješno dodano.",
      [{ text: "OK" }]
    );
  };
  
  const handleOpenCamera = () => {
    setShowAddReadingModal(false);
    setShowCamera(true);
  };
  
  const handleCameraCapture = (imageUri: string) => {
    setCapturedImage(imageUri);
    setShowCamera(false);
    setShowOCRResult(true);
  };
  
  const handleOCRConfirm = (value: number) => {
    if (!validateReading(value)) {
      Alert.alert(
        "Greška",
        readingError,
        [
          { 
            text: "Pokušaj ponovo", 
            onPress: () => {
              setShowOCRResult(false);
              setShowCamera(true);
            }
          },
          { 
            text: "Otkaži", 
            style: "cancel",
            onPress: () => {
              setShowOCRResult(false);
              setCapturedImage(null);
              setReadingError('');
            }
          }
        ]
      );
      return;
    }
    
    // In a real app, you would submit the OCR reading to your backend
    const newReading: ExtendedReading = {
      id: `reading-${Date.now()}`,
      meterId: selectedMeterId,
      value: value,
      readingDate: Date.now(),
      readBy: user?.id || '',
      readMethod: 'ocr',
      imageUrl: capturedImage || undefined,
      status: user?.role === 'citizen' ? 'pending' : 'verified',
      meterSerialNumber: availableMeters.find(m => m.id === selectedMeterId)?.serialNumber
    };
    
    // Add the new reading to the list
    const updatedReadings = [newReading, ...readings];
    setReadings(updatedReadings);
    setFilteredReadings(updatedReadings);
    
    // Close OCR result screen
    setShowOCRResult(false);
    setCapturedImage(null);
    
    Alert.alert(
      "Uspjeh",
      "Očitanje je uspješno dodano.",
      [{ text: "OK" }]
    );
  };
  
  const handleOCRRetry = () => {
    setShowOCRResult(false);
    setShowCamera(true);
  };
  
  const handleOCRCancel = () => {
    setShowOCRResult(false);
    setCapturedImage(null);
  };
  
  const handleEditReading = (readingId: string) => {
    // Only admin and finance can edit readings
    if (user?.role !== 'admin' && user?.role !== 'finance' && user?.role !== 'superadmin') {
      Alert.alert("Nemate dozvolu", "Samo administratori i finansije mogu uređivati očitanja.");
      return;
    }
    
    // In a real app, you would navigate to an edit screen
    Alert.alert(
      "Uređivanje očitanja",
      "Ova funkcionalnost će biti implementirana uskoro."
    );
  };
  
  const handleVerifyReading = (readingId: string) => {
    // Only admin and finance can verify readings
    if (user?.role !== 'admin' && user?.role !== 'finance' && user?.role !== 'superadmin') {
      return;
    }
    
    // Update reading status
    const updatedReadings = readings.map(reading => 
      reading.id === readingId 
        ? { ...reading, status: 'verified' as const } 
        : reading
    );
    
    setReadings(updatedReadings);
    setFilteredReadings(updatedReadings);
    
    Alert.alert("Uspjeh", "Očitanje je potvrđeno.");
  };
  
  const handleRejectReading = (readingId: string) => {
    // Only admin and finance can reject readings
    if (user?.role !== 'admin' && user?.role !== 'finance' && user?.role !== 'superadmin') {
      return;
    }
    
    // Update reading status
    const updatedReadings = readings.map(reading => 
      reading.id === readingId 
        ? { ...reading, status: 'rejected' as const } 
        : reading
    );
    
    setReadings(updatedReadings);
    setFilteredReadings(updatedReadings);
    
    Alert.alert("Uspjeh", "Očitanje je odbijeno.");
  };
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(text, filterStatus);
  };
  
  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    applyFilters(searchQuery, status);
  };
  
  const applyFilters = (query: string, status: string) => {
    let filtered = [...readings];
    
    // Apply search query
    if (query) {
      filtered = filtered.filter(reading => 
        reading.meterSerialNumber?.toLowerCase().includes(query.toLowerCase()) ||
        reading.value.toString().includes(query)
      );
    }
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(reading => reading.status === status);
    }
    
    setFilteredReadings(filtered);
  };
  
  const canAddReadings = 
    user?.role === 'admin' || 
    user?.role === 'finance' || 
    user?.role === 'worker' || 
    user?.role === 'superadmin' || 
    (user?.role === 'citizen' && user.permissions?.canReadMeters);
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Input
          placeholder="Pretraži očitanja..."
          value={searchQuery}
          onChangeText={handleSearch}
          containerStyle={styles.searchInput}
          leftIcon={<Search size={20} color={Colors.textLight} />}
        />
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Filter size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Status:</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'all' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'all' && styles.filterOptionTextActive
              ]}>Svi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'pending' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('pending')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'pending' && styles.filterOptionTextActive
              ]}>Na čekanju</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'verified' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('verified')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'verified' && styles.filterOptionTextActive
              ]}>Potvrđeni</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                filterStatus === 'rejected' && styles.filterOptionActive
              ]}
              onPress={() => handleFilterChange('rejected')}
            >
              <Text style={[
                styles.filterOptionText,
                filterStatus === 'rejected' && styles.filterOptionTextActive
              ]}>Odbijeni</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReadings.length > 0 ? (
          filteredReadings.map(reading => (
            <ReadingCard 
              key={reading.id} 
              reading={reading} 
              showMeterInfo={true}
              meterSerialNumber={reading.meterSerialNumber}
              onEdit={() => handleEditReading(reading.id)}
              onVerify={
                (user?.role === 'admin' || user?.role === 'finance' || user?.role === 'superadmin') && reading.status === 'pending'
                  ? () => handleVerifyReading(reading.id)
                  : undefined
              }
              onReject={
                (user?.role === 'admin' || user?.role === 'finance' || user?.role === 'superadmin') && reading.status === 'pending'
                  ? () => handleRejectReading(reading.id)
                  : undefined
              }
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nema pronađenih očitanja
            </Text>
          </View>
        )}
      </ScrollView>
      
      {canAddReadings && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleAddReading}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Add Reading Modal */}
      <Modal
        visible={showAddReadingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddReadingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowAddReadingModal(false)}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Novo očitanje</Text>
              <View style={styles.placeholder} />
            </View>
            
            <Text style={styles.modalSubtitle}>
              Odaberite vodomjer i unesite očitanje
            </Text>
            
            {availableMeters.length > 0 ? (
              <>
                <Text style={styles.inputLabel}>Vodomjer:</Text>
                <View style={styles.meterOptions}>
                  {availableMeters.map(meter => (
                    <TouchableOpacity
                      key={meter.id}
                      style={[
                        styles.meterOption,
                        selectedMeterId === meter.id && styles.meterOptionActive
                      ]}
                      onPress={() => setSelectedMeterId(meter.id)}
                    >
                      <Text style={[
                        styles.meterOptionText,
                        selectedMeterId === meter.id && styles.meterOptionTextActive
                      ]}>{meter.serialNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.inputContainer}>
                  <Input
                    label="Ručni unos očitanja (m³)"
                    placeholder="Unesite vrijednost očitanja"
                    value={manualReading}
                    onChangeText={setManualReading}
                    keyboardType="numeric"
                    leftIcon={<Edit3 size={20} color={Colors.textLight} />}
                    error={readingError}
                  />
                </View>
                
                <View style={styles.modalButtons}>
                  <Button
                    title="Otkaži"
                    onPress={() => {
                      setShowAddReadingModal(false);
                      setReadingError('');
                    }}
                    variant="outline"
                    style={styles.modalButton}
                  />
                  
                  <Button
                    title="Potvrdi"
                    onPress={handleManualSubmit}
                    style={styles.modalButton}
                    disabled={!manualReading}
                  />
                </View>
                
                <View style={styles.orContainer}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>ILI</Text>
                  <View style={styles.orLine} />
                </View>
                
                <Button
                  title="Skeniraj vodomjer"
                  onPress={handleOpenCamera}
                  variant="secondary"
                  leftIcon={<Camera size={20} color="#fff" />}
                />
              </>
            ) : (
              <View style={styles.noMetersContainer}>
                <Text style={styles.noMetersText}>
                  Nemate dodijeljenih vodomjera. Kontaktirajte administratora.
                </Text>
                <Button
                  title="Zatvori"
                  onPress={() => setShowAddReadingModal(false)}
                  style={styles.closeButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Camera View */}
      {showCamera && (
        <OCRCameraView
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      
      {/* OCR Result View */}
      {showOCRResult && capturedImage && (
        <OCRResult
          imageUri={capturedImage}
          onConfirm={handleOCRConfirm}
          onRetry={handleOCRRetry}
          onCancel={handleOCRCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  filterButton: {
    padding: 12,
    marginLeft: 8,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 12,
    color: Colors.text,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  meterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  meterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.highlight,
    marginRight: 8,
    marginBottom: 8,
  },
  meterOptionActive: {
    backgroundColor: Colors.primary,
  },
  meterOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  meterOptionTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: 16,
    color: Colors.textLight,
    fontSize: 14,
  },
  noMetersContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noMetersText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: '100%',
  },
});


