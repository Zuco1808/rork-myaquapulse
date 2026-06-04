import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Save } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import {
  getDistributorById,
  updateDistributor,
} from '@/lib/api/distributors';
import { Distributor } from '@/types/user';
import Colors from '@/constants/colors';

export default function EditDistributorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canAccessAllTenants } = usePermissions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  const fetchData = async () => {
    if (!id) return;
    try {
      const d = await getDistributorById(id);
      setName(d.name);
      setEmail(d.contact_email || '');
      setPhone(d.contact_phone || '');
      setAddress(d.address || '');
    } catch {
      Alert.alert('Greška', 'Učitavanje podataka nije uspjelo.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  if (!canAccessAllTenants) return null;

  const validate = () => {
    if (!name.trim()) {
      setNameError('Naziv je obavezan');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !id) return;
    setSaving(true);
    try {
      await updateDistributor(id, {
        name: name.trim(),
        contact_email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      Alert.alert('Uspjeh', 'Podaci distributera su ažurirani.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Ažuriranje nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Uredi distributera" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          title="Uredi distributera"
          showBack
          onLeftPress={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Informacije o distributeru</Text>

            <Input
              label="Naziv distributora *"
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
              error={nameError}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Input
              label="Adresa"
              value={address}
              onChangeText={setAddress}
            />
          </Card>

          <Button
            title="Sačuvaj izmjene"
            leftIcon={<Save size={18} color="#fff" />}
            onPress={handleSave}
            isLoading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  section: { padding: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
});
