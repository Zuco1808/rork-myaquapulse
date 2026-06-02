import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Save } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { createDistributor } from '@/lib/api/distributors';
import Colors from '@/constants/colors';

export default function AddDistributorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { canAccessAllTenants } = usePermissions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

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
    if (!validate()) return;
    setSaving(true);
    try {
      await createDistributor({
        name: name.trim(),
        contact_email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      Alert.alert('Uspjeh', 'Distributer je uspješno kreiran.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Kreiranje nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header
          title="Novi distributer"
          showBack
          onLeftPress={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconRow}>
            <View style={styles.iconBox}>
              <Building2 size={36} color={Colors.primary} />
            </View>
          </View>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Informacije o distributeru</Text>

            <Input
              label="Naziv distributora *"
              placeholder="npr. Distributer d.o.o."
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
              error={nameError}
            />

            <Input
              label="Email"
              placeholder="kontakt@distributer.ba"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Telefon"
              placeholder="+387 33 xxx xxx"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Adresa"
              placeholder="Ulica i broj, Grad"
              value={address}
              onChangeText={setAddress}
            />
          </Card>

          <Button
            title="Kreiraj distributera"
            leftIcon={<Save size={18} color="#fff" />}
            onPress={handleSave}
            isLoading={saving}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 40 },

  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { padding: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },

  saveBtn: { marginTop: 4 },
});
