import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Building, 
  Phone, 
  MapPin,
  Menu
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import { mockUsers } from '@/mocks/users';
import { mockCompanies } from '@/mocks/companies';
import { User, UserRole, canManageUser } from '@/types/user';
import Colors from '@/constants/colors';

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  
  // Form errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [roleError, setRoleError] = useState('');
  
  useEffect(() => {
    if (id) {
      loadUser(id);
    }
  }, [id]);
  
  const loadUser = (userId: string) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const foundUser = mockUsers.find(u => u.id === userId);
      
      if (foundUser) {
        setUser(foundUser);
        setName(foundUser.name);
        setEmail(foundUser.email);
        setPhone(foundUser.phone || '');
        setAddress(foundUser.address || '');
        setRole(foundUser.role);
        setCompanyId(foundUser.companyId);
      }
      
      setIsLoading(false);
    }, 1000);
  };
  
  // Get available roles based on current user's role
  const getAvailableRoles = (): UserRole[] => {
    if (!currentUser || !user) return ['citizen'];
    
    // If editing self, don't allow role change
    if (currentUser.id === user.id) {
      return [user.role];
    }
    
    switch (currentUser.role) {
      case 'superadmin':
        return ['superadmin', 'admin', 'finance', 'worker', 'citizen'];
      case 'admin':
        return ['finance', 'worker', 'citizen'];
      default:
        return ['citizen'];
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      setNameError('Ime je obavezno');
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
      setEmailError('Unesite validnu email adresu');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validate password only if it's provided (optional on edit)
    if (password) {
      if (password.length < 6) {
        setPasswordError('Lozinka mora imati najmanje 6 karaktera');
        isValid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError('Lozinke se ne podudaraju');
        isValid = false;
      } else {
        setPasswordError('');
        setConfirmPasswordError('');
      }
    } else {
      setPasswordError('');
      setConfirmPasswordError('');
    }
    
    // Validate role
    if (!role) {
      setRoleError('Uloga je obavezna');
      isValid = false;
    } else {
      setRoleError('');
    }
    
    return isValid;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Show success message
      if (Platform.OS === 'web') {
        alert('Korisnik je uspješno ažuriran.');
      } else {
        Alert.alert(
          'Uspješno',
          'Korisnik je uspješno ažuriran.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back() 
            }
          ]
        );
      }
      
      // Navigate back to users list
      router.back();
    }, 1500);
  };
  
  const getRoleLabel = (userRole: UserRole): string => {
    switch (userRole) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'finance':
        return 'Finansije';
      case 'worker':
        return 'Radnik';
      case 'citizen':
        return 'Građanin';
      default:
        return userRole;
    }
  };
  
  // Check if current user can edit this user
  const canEdit = () => {
    if (!currentUser || !user) return false;
    
    // Users can always edit themselves
    if (currentUser.id === user.id) return true;
    
    // Check if current user can manage the target user's role
    return canManageUser(currentUser as any, user as any);
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje korisnika...</Text>
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={styles.noAccessContainer}>
        <Text style={styles.noAccessText}>
          Korisnik nije pronađen.
        </Text>
        <Button
          title="Nazad"
          onPress={() => router.back()}
          style={styles.noAccessButton}
        />
      </View>
    );
  }
  
  if (!canEdit()) {
    return (
      <>
        <Header 
          title="Uredi korisnika"
          showBack={true}
          onLeftPress={() => router.back()}
        />
        
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessText}>
            Nemate dozvolu za uređivanje ovog korisnika.
          </Text>
          <Button
            title="Nazad"
            onPress={() => router.back()}
            style={styles.noAccessButton}
          />
        </View>
      </>
    );
  }
  
  return (
    <>
      <Header 
        title="Uredi korisnika"
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
        <Text style={styles.description}>
          Uredite podatke korisnika. Obavezna polja su označena sa *.
        </Text>
        
        <Input
          label="Ime i prezime *"
          placeholder="Unesite ime i prezime"
          value={name}
          onChangeText={setName}
          error={nameError}
          leftIcon={<UserIcon size={20} color={Colors.textLight} />}
        />
        
        <Input
          label="Email adresa *"
          placeholder="Unesite email adresu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          leftIcon={<Mail size={20} color={Colors.textLight} />}
        />
        
        <Input
          label="Nova lozinka (ostavite prazno ako ne mijenjate)"
          placeholder="Unesite novu lozinku"
          value={password}
          onChangeText={setPassword}
          isPassword
          error={passwordError}
          leftIcon={<Lock size={20} color={Colors.textLight} />}
        />
        
        <Input
          label="Potvrda nove lozinke"
          placeholder="Potvrdite novu lozinku"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
          error={confirmPasswordError}
          leftIcon={<Lock size={20} color={Colors.textLight} />}
        />
        
        <Input
          label="Broj telefona"
          placeholder="Unesite broj telefona"
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
        
        <Text style={styles.sectionTitle}>Uloga korisnika *</Text>
        {roleError ? <Text style={styles.errorText}>{roleError}</Text> : null}
        
        <View style={styles.roleButtons}>
          {getAvailableRoles().map((userRole) => (
            <TouchableOpacity
              key={userRole}
              style={[
                styles.roleButton,
                role === userRole && styles.roleButtonActive
              ]}
              onPress={() => setRole(userRole)}
              disabled={currentUser?.id === user.id} // Disable if editing self
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === userRole && styles.roleButtonTextActive,
                  currentUser?.id === user.id && styles.disabledText
                ]}
              >
                {getRoleLabel(userRole)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {(role === 'admin' || role === 'finance' || role === 'worker') && (
          <>
            <Text style={styles.sectionTitle}>Kompanija</Text>
            <View style={styles.companyButtons}>
              {mockCompanies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.companyButton,
                    companyId === company.id && styles.companyButtonActive
                  ]}
                  onPress={() => setCompanyId(company.id)}
                >
                  <Building 
                    size={16} 
                    color={companyId === company.id ? Colors.primary : Colors.textLight} 
                    style={styles.companyIcon} 
                  />
                  <Text
                    style={[
                      styles.companyButtonText,
                      companyId === company.id && styles.companyButtonTextActive
                    ]}
                  >
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        
        <View style={styles.buttonContainer}>
          <Button
            title="Otkaži"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          
          <Button
            title="Sačuvaj"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.saveButton}
          />
        </View>
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
  description: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginBottom: 8,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.5,
  },
  companyButtons: {
    marginBottom: 24,
  },
  companyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  companyButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  companyIcon: {
    marginRight: 8,
  },
  companyButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  companyButtonTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  noAccessText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  noAccessButton: {
    width: 200,
  },
});
