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
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Check, 
  Building,
  Menu,
  ChevronLeft
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { mockCompanies } from '@/mocks/companies';
import { mockLocations } from '@/mocks/locations';
import { getDefaultPermissions } from '@/types/user';

export default function AddUserScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('end_user');
  const [isActive, setIsActive] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [building, setBuilding] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  
  // User permissions
  const [permissions, setPermissions] = useState(getDefaultPermissions('end_user'));
  
  // Form errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Check if user has permission to access this screen
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'utility_admin')) {
      router.replace('/login');
    }
  }, [user, router]);
  
  // Update permissions when role changes
  useEffect(() => {
    setPermissions(getDefaultPermissions(role as any));
  }, [role]);
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      setNameError('Ime i prezime je obavezno');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email je obavezan');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Unesite validan email');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validate password
    if (!password) {
      setPasswordError('Lozinka je obavezna');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Lozinka mora imati najmanje 6 karaktera');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError('Lozinke se ne podudaraju');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    // In a real app, you would call an API to create the user
    Alert.alert(
      "Uspjeh",
      "Korisnik je uspješno kreiran.",
      [
        { 
          text: "OK", 
          onPress: () => router.back() 
        }
      ]
    );
  };
  
  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);
  };
  
  const handleStatusChange = (status: boolean) => {
    setIsActive(status);
  };
  
  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
    // Reset location when company changes
    setLocationId('');
  };
  
  const handleLocationChange = (id: string) => {
    setLocationId(id);
  };
  
  const handlePermissionChange = (key: keyof typeof permissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Filter locations based on selected company
  const filteredLocations = companyId 
    ? mockLocations.filter(location => location.companyId === companyId)
    : [];
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header 
          title="Dodaj korisnika"
          showBack
          showMenu={false}
          onLeftPress={() => router.back()}
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
              label="Ime i prezime"
              placeholder="Unesite ime i prezime"
              value={name}
              onChangeText={setName}
              error={nameError}
              leftIcon={<User size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Email"
              placeholder="Unesite email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              leftIcon={<Mail size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Telefon"
              placeholder="Unesite telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Adresa"
              placeholder="Unesite adresu"
              value={address}
              onChangeText={setAddress}
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Lozinka"
              placeholder="Unesite lozinku"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={passwordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
            
            <Input
              label="Potvrdi lozinku"
              placeholder="Potvrdite lozinku"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={confirmPasswordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
            
            <Text style={styles.sectionTitle}>Uloga i status</Text>
            
            <Text style={styles.label}>Uloga korisnika:</Text>
            <View style={styles.roleOptions}>
              {user?.role === 'super_admin' && (
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'utility_admin' && styles.roleOptionActive
                  ]}
                  onPress={() => handleRoleChange('utility_admin')}
                >
                  <Text style={[
                    styles.roleOptionText,
                    role === 'utility_admin' && styles.roleOptionTextActive
                  ]}>Administrator</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'finance' && styles.roleOptionActive
                ]}
                onPress={() => handleRoleChange('finance')}
              >
                <Text style={[
                  styles.roleOptionText,
                  role === 'finance' && styles.roleOptionTextActive
                ]}>Finansije</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'worker' && styles.roleOptionActive
                ]}
                onPress={() => handleRoleChange('worker')}
              >
                <Text style={[
                  styles.roleOptionText,
                  role === 'worker' && styles.roleOptionTextActive
                ]}>Radnik</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'end_user' && styles.roleOptionActive
                ]}
                onPress={() => handleRoleChange('end_user')}
              >
                <Text style={[
                  styles.roleOptionText,
                  role === 'end_user' && styles.roleOptionTextActive
                ]}>Građanin</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Status korisnika:</Text>
            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  isActive && styles.statusOptionActive
                ]}
                onPress={() => handleStatusChange(true)}
              >
                <Text style={[
                  styles.statusOptionText,
                  isActive && styles.statusOptionTextActive
                ]}>Aktivan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  !isActive && styles.statusOptionActive
                ]}
                onPress={() => handleStatusChange(false)}
              >
                <Text style={[
                  styles.statusOptionText,
                  !isActive && styles.statusOptionTextActive
                ]}>Neaktivan</Text>
              </TouchableOpacity>
            </View>
            
            {/* Permissions section */}
            <Text style={styles.sectionTitle}>Dozvole</Text>
            
            {role === 'end_user' && (
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>Dozvoli očitanje vodomjera</Text>
                <TouchableOpacity
                  style={[
                    styles.permissionToggle,
                    permissions.canReadMeters && styles.permissionToggleActive
                  ]}
                  onPress={() => handlePermissionChange('canReadMeters', !permissions.canReadMeters)}
                >
                  <View style={[
                    styles.permissionToggleHandle,
                    permissions.canReadMeters && styles.permissionToggleHandleActive
                  ]} />
                </TouchableOpacity>
              </View>
            )}
            
            {role === 'worker' && (
              <>
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionLabel}>Dozvoli prijavu kvarova</Text>
                  <TouchableOpacity
                    style={[
                      styles.permissionToggle,
                      permissions.canReadMeters && styles.permissionToggleActive
                    ]}
                    onPress={() => handlePermissionChange('canReadMeters', !permissions.canReadMeters)}
                  >
                    <View style={[
                      styles.permissionToggleHandle,
                      permissions.canReadMeters && styles.permissionToggleHandleActive
                    ]} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.permissionItem}>
                  <Text style={styles.permissionLabel}>Dozvoli upravljanje zadacima</Text>
                  <TouchableOpacity
                    style={[
                      styles.permissionToggle,
                      permissions.canManageTasks && styles.permissionToggleActive
                    ]}
                    onPress={() => handlePermissionChange('canManageTasks', !permissions.canManageTasks)}
                  >
                    <View style={[
                      styles.permissionToggleHandle,
                      permissions.canManageTasks && styles.permissionToggleHandleActive
                    ]} />
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            {/* Company and Location selection for citizens */}
            {role === 'end_user' && (
              <>
                <Text style={styles.sectionTitle}>Podaci o lokaciji</Text>
                
                <Text style={styles.label}>Kompanija:</Text>
                <View style={styles.optionsContainer}>
                  {mockCompanies.map(company => (
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
                
                {companyId && (
                  <>
                    <Text style={styles.label}>Lokacija:</Text>
                    <View style={styles.optionsContainer}>
                      {filteredLocations.map(location => (
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
                  </>
                )}
                
                <Input
                  label="Kvart"
                  placeholder="Unesite kvart"
                  value={neighborhood}
                  onChangeText={setNeighborhood}
                  leftIcon={<MapPin size={20} color={Colors.textLight} />}
                />
                
                <Input
                  label="Zgrada"
                  placeholder="Unesite zgradu"
                  value={building}
                  onChangeText={setBuilding}
                  leftIcon={<Building size={20} color={Colors.textLight} />}
                />
                
                <Input
                  label="Broj vodomjera"
                  placeholder="Unesite broj vodomjera"
                  value={meterNumber}
                  onChangeText={setMeterNumber}
                  leftIcon={<Check size={20} color={Colors.textLight} />}
                />
              </>
            )}
            
            {/* Company selection for workers and finance */}
            {(role === 'worker' || role === 'finance') && (
              <>
                <Text style={styles.sectionTitle}>Podaci o kompaniji</Text>
                
                <Text style={styles.label}>Kompanija:</Text>
                <View style={styles.optionsContainer}>
                  {mockCompanies.map(company => (
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
              </>
            )}
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
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.highlight,
    marginRight: 8,
    marginBottom: 8,
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  statusOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permissionLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  permissionToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.disabled,
    padding: 2,
  },
  permissionToggleActive: {
    backgroundColor: Colors.primary,
  },
  permissionToggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  permissionToggleHandleActive: {
    transform: [{ translateX: 22 }],
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