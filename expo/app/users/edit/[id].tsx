import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, SafeAreaView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User, Mail, Phone, Lock } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { getUserById, updateUserFull } from '@/lib/api/users';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole, WaterUtility } from '@/types/user';
import Colors from '@/constants/colors';

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('end_user');
  const [isActive, setIsActive] = useState(true);
  const [selectedUtilityId, setSelectedUtilityId] = useState('');
  const [utilities, setUtilities] = useState<WaterUtility[]>([]);

  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const isSelf = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p] = await Promise.all([
        getUserById(id!),
        currentUser?.role === 'super_admin' ? fetchUtilities() : Promise.resolve(),
      ]);
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
      setRole(p.role);
      setIsActive(p.is_active);
      setSelectedUtilityId(p.utility_id || '');
    } catch {
      Alert.alert('Greška', 'Korisnik nije pronađen.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUtilities = async () => {
    const { data } = await supabase
      .from('water_utilities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setUtilities(data || []);
  };

  const availableRoles = (): UserRole[] => {
    if (isSelf) return [role];
    if (currentUser?.role === 'super_admin') return ['utility_admin', 'finance', 'worker', 'end_user'];
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
    if (password) {
      if (password.length < 6) { setPasswordError('Minimum 6 karaktera'); valid = false; } else setPasswordError('');
      if (password !== confirmPassword) { setConfirmPasswordError('Lozinke se ne podudaraju'); valid = false; } else setConfirmPasswordError('');
    } else {
      setPasswordError('');
      setConfirmPasswordError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await updateUserFull({
        target_id: id!,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        ...(password ? { password } : {}),
        ...(!isSelf ? {
          role,
          is_active: isActive,
          utility_id: selectedUtilityId || undefined,
        } : {}),
      });

      Alert.alert('Uspjeh', 'Korisnik je uspješno ažuriran.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Greška', err.message || 'Greška pri ažuriranju korisnika.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Uredi korisnika" showBack onLeftPress={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Uredi korisnika" showBack onLeftPress={() => router.back()} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>

            <View style={styles.emailRow}>
              <Mail size={16} color={Colors.textLight} />
              <Text style={styles.emailText}>{profile?.email}</Text>
            </View>

            <Input
              label="Ime i prezime *"
              placeholder="Unesite ime i prezime"
              value={fullName}
              onChangeText={setFullName}
              error={nameError}
              leftIcon={<User size={20} color={Colors.textLight} />}
            />
            <Input
              label="Telefon"
              placeholder="Unesite telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={Colors.textLight} />}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Promjena lozinke</Text>
            <Text style={styles.hint}>Ostavite prazno ako ne mijenjate lozinku</Text>
            <Input
              label="Nova lozinka"
              placeholder="Minimum 6 karaktera"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={passwordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
            <Input
              label="Potvrdi novu lozinku"
              placeholder="Ponovite lozinku"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={confirmPasswordError}
              leftIcon={<Lock size={20} color={Colors.textLight} />}
            />
          </Card>

          {!isSelf && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Uloga i status</Text>
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
                  <Text style={[styles.statusOptionText, isActive && styles.statusOptionTextActive]}>Aktivan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusOption, !isActive && styles.statusOptionActive]}
                  onPress={() => setIsActive(false)}
                >
                  <Text style={[styles.statusOptionText, !isActive && styles.statusOptionTextActive]}>Neaktivan</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {!isSelf && currentUser?.role === 'super_admin' && utilities.length > 0 && (
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
            <Button title="Sačuvaj" onPress={handleSubmit} isLoading={isSubmitting} style={styles.submitButton} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  card: { padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12, marginTop: 4 },
  hint: { fontSize: 13, color: Colors.textLight, marginBottom: 12, marginTop: -8 },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  emailText: { fontSize: 14, color: Colors.textLight },
  label: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8, marginTop: 4 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.highlight },
  roleOptionActive: { backgroundColor: Colors.primary },
  roleOptionText: { fontSize: 14, color: Colors.text },
  roleOptionTextActive: { color: '#fff' },
  statusOptions: { flexDirection: 'row', marginBottom: 8 },
  statusOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statusOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusOptionText: { fontSize: 14, color: Colors.text },
  statusOptionTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { flex: 1, marginRight: 8 },
  submitButton: { flex: 1, marginLeft: 8 },
});
