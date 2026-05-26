import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Building, MapPin, FileText } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

export default function AddCompanyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pib, setPib] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [cityError, setCityError] = useState('');

  useEffect(() => {
    if (!user || !['super_admin', 'distributor_admin'].includes(user.role)) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const validate = () => {
    let valid = true;
    if (!name.trim()) { setNameError('Naziv je obavezan'); valid = false; } else setNameError('');
    if (!city.trim()) { setCityError('Grad je obavezan'); valid = false; } else setCityError('');
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('water_utilities').insert({
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || null,
        pib: pib.trim() || null,
        is_active: true,
        distributor_id: user?.distributor_id || null,
      });
      if (error) throw error;
      Alert.alert('Uspjeh', 'Vodovod je uspješno dodan.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Greška', 'Greška pri dodavanju vodovoda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Novi vodovod" showBack onLeftPress={() => router.back()} />
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
        </Card>
        <View style={styles.buttons}>
          <Button
            title="Otkaži"
            variant="outline"
            onPress={() => router.back()}
            style={styles.button}
          />
          <Button
            title="Sačuvaj"
            onPress={handleSave}
            isLoading={isLoading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  button: { flex: 1, marginHorizontal: 8 },
});
