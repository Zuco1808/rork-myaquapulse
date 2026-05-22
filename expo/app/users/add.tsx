import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, SafeAreaView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Phone, Lock } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { UserRole, WaterUtility } from '@/types/user';

export default function AddUserScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('end_user');
  const [isActive, setIsActive] = useState(true);
  const [selectedUtilityId, setSelectedUtilityId] = useState('');
  const [utilities, setUtilities] = useState<WaterUtility[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    if (!user || !['super_admin', 'utility_admin'].includes(user.role)) {
      router.replace('/login');
      return;
    }
    if (user.role === 'utility_admin' && user.utility_id) {
      setSelectedUtilityId(user.utility_id);
    }
    if (user.role === 'super_admin') {
      fetchUtilities();
    }
  }, [user]);

  const fetchUtilities = async () => {
    const { data } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setUtilities(data || []);
  };

  const availableRoles = (): UserRole[] => {
    if (user?.role === 'super_admin') {
      return ['utility_admin', 'finance', 'worker', 'end_user'];
    }
    return ['finance', 'worker', 'end_user'];
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'utility_admin': return 'Administrator';
      case 'finance': return 'Finansije';
      case 'worker': return 'Radnik';
      case 'end_user': return 'Korisnik';
      default: return r;
    }
  };

  const validate = () => {
    let valid = true;
    if (!fullName.trim()) { setNameError('Ime i prezime je obavezno'); valid = false; } else setNameError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) { setEmailError('Email je obavezan'); valid = false; }
    else if (!emailRegex.test(email)) { setEmailError('Unesite validan email'); valid = false; }
    else setEmailError('');
    if (!password) { setPasswordError('Lozinka je obavezna'); valid = false; }
    else if (password.length < 6) { setPasswordError('Lozinka mora imati najmanje 6 karaktera'); valid = false; }
    else setPasswordError('');
    if (password !== confirmPassword) { setConfirmPasswordError('Lozinke se ne podudaraju'); valid = false; }
    else setConfirmPasswordError('');
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const utilityId = user?.role === 'utility_admin' ? user.utility_id : selectedUtilityId;

    if (!utilityId && role !== 'super_admin') {
      Alert.alert('Greška', 'Molimo odaberite vodovod.');
      return;
    }

    setIsLoading(true);
    try {
      // Kreiraj auth korisnika
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          role,
        }
      });

      if (authError) throw authError;

      // Update profila s ispravnim podacima
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
          utility_id: utilityId || null,
          is_active: isActive,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      Alert.alert('Uspjeh', 'Korisnik je uspješno kreiran.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri kreiranju korisnika.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Dodaj korisnika" showBack onLeftPress={() => router.back()} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>
            <Input
              label="Ime i prezime *"
              placeholder="Unesite ime i prezime"
              value={fullName}
              onChangeText={setFullName}
              error={nameError}
              leftIcon={<User size={20} color={Colors.textLight} />}
            />
            <Input
              label="Email *"
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
              label="Lozinka *"
              placeholder="Minimum 6 karaktera"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={passwordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
            <Input
              label="Potvrdi lozinku *"
              placeholder="Ponovite lozinku"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={confirmPasswordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Uloga</Text>
            <View style={styles.roleOptions}>
              {availableRoles().map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, role === r && styles.roleOptionActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                    {getRoleLabel(r)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[styles.statusOption, isActive && styles.statusOptionActive]}
                onPress={() => setIsActive(true)}
              >
                <Text style={[styles.statusOptionText, isActive && styles.statusOptionTextActive]}>
                  Aktivan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusOption, !isActive && styles.statusOptionActive]}
                onPress={() => setIsActive(false)}
              >
                <Text style={[styles.statusOptionText, !isActive && styles.statusOptionTextActive]}>
                  Neaktivan
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {user?.role === 'super_admin' && utilities.length > 0 && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Vodovod</Text>
              <View style={styles.roleOptions}>
                {utilities.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.roleOption, selectedUtilityId === u.id && styles.roleOptionActive]}
                    onPress={() => setSelectedUtilityId(u.id)}
                  >
                    <Text style={[styles.roleOptionText, selectedUtilityId === u.id && styles.roleOptionTextActive]}>
                      {u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          <View style={styles.actions}>
            <Button title="Otkaži" variant="outline" onPress={() => router.back()} style={styles.cancelButton} />
            <Button title="Sačuvaj" onPress={handleSubmit} isLoading={isLoading} style={styles.submitButton} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  card: { padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8, marginTop: 8 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.highlight },
  roleOptionActive: { backgroundColor: Colors.primary },
  roleOptionText: { fontSize: 14, color: Colors.text },
  roleOptionTextActive: { color: '#fff' },
  statusOptions: { flexDirection: 'row', marginBottom: 16 },
  statusOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statusOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusOptionText: { fontSize: 14, color: Colors.text },
  statusOptionTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { flex: 1, marginRight: 8 },
  submitButton: { flex: 1, marginLeft: 8 },
});
