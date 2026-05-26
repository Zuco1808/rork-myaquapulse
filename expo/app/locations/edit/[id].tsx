import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Building, Globe, Hash } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { getLocationById, updateLocation } from '@/lib/api/locations';
import Colors from '@/constants/colors';

export default function EditLocationScreen() {
  const router  = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [name,       setName]       = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude,   setLatitude]   = useState('');
  const [longitude,  setLongitude]  = useState('');

  const [nameError,    setNameError]    = useState('');
  const [addressError, setAddressError] = useState('');
  const [cityError,    setCityError]    = useState('');

  const [loading,      setLoading]      = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);

  /* ── guard ──────────────────────────────────────── */
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'utility_admin')) {
      router.replace('/login');
    }
  }, [user]);

  /* ── load location ──────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const loc = await getLocationById(id);
        setName(loc.name        ?? '');
        setAddress(loc.address  ?? '');
        setCity(loc.city        ?? '');
        setPostalCode(loc.postal_code ?? '');
        setLatitude(loc.latitude  != null ? String(loc.latitude)  : '');
        setLongitude(loc.longitude != null ? String(loc.longitude) : '');
      } catch {
        Alert.alert('Greška', 'Lokacija nije pronađena.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── validation ─────────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!name.trim())    { setNameError('Naziv lokacije je obavezan');  ok = false; } else setNameError('');
    if (!address.trim()) { setAddressError('Adresa je obavezna');        ok = false; } else setAddressError('');
    if (!city.trim())    { setCityError('Grad je obavezan');             ok = false; } else setCityError('');
    return ok;
  };

  /* ── submit ─────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validate() || !id) return;
    setIsSaving(true);
    try {
      await updateLocation(id, {
        name:        name.trim(),
        address:     address.trim(),
        city:        city.trim(),
        postal_code: postalCode.trim(),
        latitude:    latitude  ? Number(latitude)  : undefined,
        longitude:   longitude ? Number(longitude) : undefined,
      });
      Alert.alert('Uspjeh', 'Lokacija je uspješno ažurirana.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Ažuriranje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── loading state ──────────────────────────────── */
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header title="Uredi lokaciju" showBack onLeftPress={() => router.back()} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Učitavanje...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── render ─────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Uredi lokaciju"
          showBack
          onLeftPress={() => router.back()}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>

            <Input
              label="Naziv lokacije"
              placeholder="Unesite naziv lokacije"
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
              error={nameError}
              leftIcon={<MapPin size={20} color={Colors.textLight} />}
            />
            <Input
              label="Adresa"
              placeholder="Unesite adresu"
              value={address}
              onChangeText={(t) => { setAddress(t); if (addressError) setAddressError(''); }}
              error={addressError}
              leftIcon={<Building size={20} color={Colors.textLight} />}
            />
            <Input
              label="Grad"
              placeholder="Unesite grad"
              value={city}
              onChangeText={(t) => { setCity(t); if (cityError) setCityError(''); }}
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
            <Button title="Otkaži" variant="outline" onPress={() => router.back()} style={styles.cancelButton} />
            <Button title="Sačuvaj" onPress={handleSubmit} isLoading={isSaving} style={styles.submitButton} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: '#fff' },
  container:        { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 16, fontSize: 16, color: Colors.textLight },
  scrollView:       { flex: 1 },
  scrollContent:    { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  formCard:         { padding: 16 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16, marginTop: 8 },
  actions:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton: { flex: 1, marginRight: 8 },
  submitButton: { flex: 1, marginLeft: 8 },
});
