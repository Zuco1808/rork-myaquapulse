import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  MapPin, 
  Building, 
  Globe, 
  Hash,
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
import { Location } from '@/types/location';
import { useCompanies } from '@/lib/hooks/useCompanies';

export default function EditLocationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { companies } = useCompanies();
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Form errors
  const [nameError, setNameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [cityError, setCityError] = useState('');
  const [companyIdError, setCompanyIdError] = useState('');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      router.replace('/login');
    }
  }, [user, router]);
  
  // Load location data
  useEffect(() => {
    if (id) {
      const location = mockLocations.find(loc => loc.id === String(id));
      if (location) {
        setName(location.name);
        setAddress(location.address || '');
        setCity(location.city || '');
        setPostalCode(location.postalCode || '');
        setCompanyId(location.companyId);
        setLatitude(location.coordinates?.latitude ? location.coordinates?.latitude.toString() : '');
        setLongitude(location.coordinates?.longitude ? location.coordinates?.longitude.toString() : '');
      } else {
        Alert.alert("Greška", "Lokacija nije pronađena.");
        router.back();
      }
    }
    setLoading(false);
  }, [id, router]);
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      setNameError('Naziv lokacije je obavezan');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate address
    if (!address.trim()) {
      setAddressError('Adresa je obavezna');
      isValid = false;
    } else {
      setAddressError('');
    }
    
    // Validate city
    if (!city.trim()) {
      setCityError('Grad je obavezan');
      isValid = false;
    } else {
      setCityError('');
    }
    
    // Validate company
    if (!companyId) {
      setCompanyIdError('Kompanija je obavezna');
      isValid = false;
    } else {
      setCompanyIdError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // In a real app, you would call an API to update the location
    Alert.alert(
      "Uspjeh",
      "Lokacija je uspješno ažurirana.",
      [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]
    );
  };
  
  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header 
            title="Uredi lokaciju"
            showBack
            showMenu
            onLeftPress={() => setIsDrawerOpen(true)}
          />
          
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Uredi lokaciju"
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
              label="Naziv lokacije"
              placeholder="Unesite naziv lokacije"
              value={name}
              onChangeText={setName}
              error={nameError}
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Adresa"
              placeholder="Unesite adresu"
              value={address}
              onChangeText={setAddress}
              error={addressError}
              leftIcon={<Building size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Grad"
              placeholder="Unesite grad"
              value={city}
              onChangeText={setCity}
              error={cityError}
              leftIcon={<Globe size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Poštanski broj"
              placeholder="Unesite poštanski broj"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="numeric"
              leftIcon={<Hash size={20} color={Colors.textLight} />}
            />
            
            <Text style={styles.label}>Kompanija:</Text>
            {companyIdError ? <Text style={styles.errorText}>{companyIdError}</Text> : null}
            <View style={styles.optionsContainer}>
              {companies.map(company => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.option,
                    companyId === company.id && styles.optionActive
                  ]}
                  onPress={() => handleCompanyChange(company.id)}
                >
                  <Text style={[
                    styles.optionText,
                    companyId === company.id && styles.optionTextActive
                  ]}>{company.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Geografske koordinate (opcionalno)</Text>
            
            <Input
              label="Geografska širina"
              placeholder="Unesite geografsku širinu"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Geografska dužina"
              placeholder="Unesite geografsku dužinu"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
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