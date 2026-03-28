import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Droplet, 
  Hash, 
  Calendar, 
  MapPin, 
  User,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { mockLocations } from '@/mocks/locations';
import { mockUsers } from '@/mocks/users';

export default function AddMeterScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Form state
  const [serialNumber, setSerialNumber] = useState('');
  const [type, setType] = useState('standard');
  const [status, setStatus] = useState('active');
  const [locationId, setLocationId] = useState('');
  const [userId, setUserId] = useState('');
  const [installDate, setInstallDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form errors
  const [serialNumberError, setSerialNumberError] = useState('');
  const [locationIdError, setLocationIdError] = useState('');
  const [userIdError, setUserIdError] = useState('');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'worker')) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate serial number
    if (!serialNumber.trim()) {
      setSerialNumberError('Serijski broj je obavezan');
      isValid = false;
    } else {
      setSerialNumberError('');
    }
    
    // Validate location
    if (!locationId) {
      setLocationIdError('Lokacija je obavezna');
      isValid = false;
    } else {
      setLocationIdError('');
    }
    
    // Validate user
    if (!userId) {
      setUserIdError('Korisnik je obavezan');
      isValid = false;
    } else {
      setUserIdError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // In a real app, you would call an API to add the meter
    Alert.alert(
      "Uspjeh",
      "Vodomjer je uspješno dodan.",
      [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]
    );
  };
  
  const handleTypeChange = (selectedType: string) => {
    setType(selectedType);
  };
  
  const handleStatusChange = (selectedStatus: string) => {
    setStatus(selectedStatus);
  };
  
  const handleLocationChange = (id: string) => {
    setLocationId(id);
  };
  
  const handleUserChange = (id: string) => {
    setUserId(id);
  };
  
  // Filter users to show only citizens
  const citizenUsers = mockUsers.filter(u => u.role === 'citizen');
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Dodaj vodomjer"
          showBack
          showMenu
          onLeftPress={() => setIsDrawerOpen(true)}
        />
        
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>
            
            <Input
              label="Serijski broj"
              placeholder="Unesite serijski broj vodomjera"
              value={serialNumber}
              onChangeText={setSerialNumber}
              error={serialNumberError}
              leftIcon={<Hash size={20} color={Colors.textLight} />}
            />
            
            <Text style={styles.label}>Tip vodomjera:</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.option,
                  type === 'standard' && styles.optionActive
                ]}
                onPress={() => handleTypeChange('standard')}
              >
                <Text style={[
                  styles.optionText,
                  type === 'standard' && styles.optionTextActive
                ]}>Standardni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  type === 'smart' && styles.optionActive
                ]}
                onPress={() => handleTypeChange('smart')}
              >
                <Text style={[
                  styles.optionText,
                  type === 'smart' && styles.optionTextActive
                ]}>Pametni</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  type === 'industrial' && styles.optionActive
                ]}
                onPress={() => handleTypeChange('industrial')}
              >
                <Text style={[
                  styles.optionText,
                  type === 'industrial' && styles.optionTextActive
                ]}>Industrijski</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Status:</Text>
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.option,
                  status === 'active' && styles.optionActive
                ]}
                onPress={() => handleStatusChange('active')}
              >
                <Text style={[
                  styles.optionText,
                  status === 'active' && styles.optionTextActive
                ]}>Aktivan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  status === 'inactive' && styles.optionActive
                ]}
                onPress={() => handleStatusChange('inactive')}
              >
                <Text style={[
                  styles.optionText,
                  status === 'inactive' && styles.optionTextActive
                ]}>Neaktivan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.option,
                  status === 'maintenance' && styles.optionActive
                ]}
                onPress={() => handleStatusChange('maintenance')}
              >
                <Text style={[
                  styles.optionText,
                  status === 'maintenance' && styles.optionTextActive
                ]}>Održavanje</Text>
              </TouchableOpacity>
            </View>
            
            <Input
              label="Datum instalacije"
              placeholder="YYYY-MM-DD"
              value={installDate}
              onChangeText={setInstallDate}
              leftIcon={<Calendar size={20} color={Colors.textLight} />}
            />
            
            <Text style={styles.sectionTitle}>Lokacija i korisnik</Text>
            
            <Text style={styles.label}>Lokacija:</Text>
            {locationIdError ? <Text style={styles.errorText}>{locationIdError}</Text> : null}
            <View style={styles.optionsContainer}>
              {mockLocations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.option,
                    locationId === location.id && styles.optionActive
                  ]}
                  onPress={() => handleLocationChange(location.id)}
                >
                  <Text style={[
                    styles.optionText,
                    locationId === location.id && styles.optionTextActive
                  ]}>{location.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.label}>Korisnik:</Text>
            {userIdError ? <Text style={styles.errorText}>{userIdError}</Text> : null}
            <View style={styles.optionsContainer}>
              {citizenUsers.map(citizen => (
                <TouchableOpacity
                  key={citizen.id}
                  style={[
                    styles.option,
                    userId === citizen.id && styles.optionActive
                  ]}
                  onPress={() => handleUserChange(citizen.id)}
                >
                  <Text style={[
                    styles.optionText,
                    userId === citizen.id && styles.optionTextActive
                  ]}>{citizen.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
          
          <View style={styles.actions}>
            <Button
              title="Otkaži"
              variant="outline"
              onPress={() => router.back()}
              style={styles.cancelButton}
            />
            
            <Button
              title="Sačuvaj"
              onPress={handleSubmit}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  formCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.highlight,
    marginRight: 8,
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: Colors.text,
  },
  optionTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
});