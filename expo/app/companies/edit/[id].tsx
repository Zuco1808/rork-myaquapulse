import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Building, MapPin, FileText, DollarSign } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/use-permissions';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';
import { WaterUtility } from '@/types/user';

export default function EditCompanyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { canManageDistributor } = usePermissions();

  const [utility, setUtility] = useState<WaterUtility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pib, setPib] = useState('');
  const [packageTier, setPackageTier] = useState<'basic'|'standard'|'premium'>('basic');
  const [subscriptionFee, setSubscriptionFee] = useState('');

  const [nameError, setNameError] = useState('');
  const [cityError, setCityError] = useState('');

  useEffect(() => {
    if (!user || !canManageDistributor) {
      router.replace('/(tabs)');
      return;
    }
    if (id) fetchUtility();
  }, [id, user, canManageDistributor]);

  const fetchUtility = async () => {
    try {
      const { data, error } = await supabase
        .from('water_utilities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setUtility(data);
      setName(data.name || '');
      setCity(data.city || '');
      setAddress(data.address || '');
      setPib(data.pib || '');
      setPackageTier((data.package_tier as any) || 'basic');
      setSubscriptionFee(String(data.subscription_fee ?? ''));
    } catch {
      Alert.alert('Greška', 'Vodovod nije pronađen.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const validate = () => {
    let valid = true;
    if (!name.trim()) { setNameError('Naziv je obavezan'); valid = false; } else setNameError('');
    if (!city.trim()) { setCityError('Grad je obavezan'); valid = false; } else setCityError('');
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('water_utilities')
        .update({
          name: name.trim(),
          city: city.trim(),
          address: address.trim() || null,
          pib: pib.trim() || null,
          package_tier: packageTier,
          subscription_fee: parseFloat(subscriptionFee.replace(',', '.')) || 0,
        })
        .eq('id', id);

      if (error) throw error;
      Alert.alert('Uspjeh', 'Vodovod je uspješno ažuriran.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch {
      Alert.alert('Greška', 'Greška pri ažuriranju vodovoda.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Uredi vodovod" showBack onLeftPress={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Uredi vodovod" showBack onLeftPress={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Osnovne informacije</Text>
            <Input
              label="Naziv vodovoda *"
              placeholder="npr. Vodovod Sarajevo"
              value={name}
              onChangeText={setName}
              leftIcon={<Building size={20} color={Colors.textLight} />}
              error={nameError}
            />
            <Input
              label="Grad *"
              placeholder="npr. Sarajevo"
              value={city}
              onChangeText={setCity}
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
              error={cityError}
            />
            <Input
              label="Adresa"
              placeholder="npr. Ulica bb"
              value={address}
              onChangeText={setAddress}
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
            <Input
              label="PIB / JIB"
              placeholder="Poreski identifikacioni broj"
              value={pib}
              onChangeText={setPib}
              leftIcon={<FileText size={20} color={Colors.textLight} />}
            />

            <Text style={styles.fieldLabel}>Paket</Text>
            <View style={styles.tierRow}>
              {([['basic','Osnovni'],['standard','Standard'],['premium','Premium']] as const).map(([v, label]) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.tierChip, packageTier === v && styles.tierChipActive]}
                  onPress={() => setPackageTier(v)}
                >
                  <Text style={[styles.tierText, packageTier === v && styles.tierTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Provizija distributera: {packageTier === 'premium' ? '15%' : '20%'} mjesečne pretplate</Text>

            <Input
              label="Mjesečna pretplata (€)"
              placeholder="0.00"
              value={subscriptionFee}
              onChangeText={setSubscriptionFee}
              keyboardType="decimal-pad"
              leftIcon={<DollarSign size={20} color={Colors.textLight} />}
            />
          </Card>

          <View style={styles.buttons}>
            <Button title="Otkaži" variant="outline" onPress={() => router.back()} style={styles.button} />
            <Button title="Sačuvaj" onPress={handleSave} isLoading={isSaving} style={styles.button} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  button: { flex: 1, marginHorizontal: 8 },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  tierRow:    { flexDirection: 'row', gap: 8 },
  tierChip:   { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: '#fff' },
  tierChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tierText:   { fontSize: 13, color: Colors.text },
  tierTextActive: { color: '#fff', fontWeight: '600' },
  hint:       { fontSize: 12, color: Colors.textLight, marginTop: 6, marginBottom: 14 },
});
