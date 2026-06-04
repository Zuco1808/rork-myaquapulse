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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Building, Globe, Hash } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { createLocation } from '@/lib/api/locations';
import Colors from '@/constants/colors';

export default function AddLocationScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';

  const [name,       setName]       = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [companyId,  setCompanyId]  = useState(user?.utility_id ?? '');
  const [latitude,   setLatitude]   = useState('');
  const [longitude,  setLongitude]  = useState('');

  const [nameError,      setNameError]      = useState('');
  const [addressError,   setAddressError]   = useState('');
  const [cityError,      setCityError]      = useState('');
  const [companyIdError, setCompanyIdError] = useState('');

  const [utilities,    setUtilities]    = useState<{ id: string; name: string }[]>([]);
  const [loadingUtils, setLoadingUtils] = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);

  /* ── guard ──────────────────────────────────────── */
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'utility_admin')) {
      router.replace('/login');
    }
  }, [user]);

  /* ── load utilities (super_admin only) ──────────── */
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoadingUtils(true);
    supabase
      .from('water_utilities')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setUtilities(data ?? []);
        setLoadingUtils(false);
      });
  }, [isSuperAdmin]);

  /* ── validation ─────────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!name.trim())    { setNameError('Naziv lokacije je obavezan');  ok = false; } else setNameError('');
    if (!address.trim()) { setAddressError('Adresa je obavezna');        ok = false; } else setAddressError('');
    if (!city.trim())    { setCityError('Grad je obavezan');             ok = false; } else setCityError('');
    if (isSuperAdmin && !companyId) {
      setCompanyIdError('Odaberite vodovod'); ok = false;
    } else setCompanyIdError('');
    return ok;
  };

  /* ── submit ─────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await createLocation({
        name:        name.trim(),
        address:     address.trim(),
        city:        city.trim(),
        postal_code: postalCode.trim(),
        company_id:  companyId || undefined,
        latitude:    latitude  ? Number(latitude)  : undefined,
        longitude:   longitude ? Number(longitude) : undefined,
      });
      Alert.alert('Uspjeh', 'Lokacija je uspješno dodana.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Snimanje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ── render ─────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Dodaj lokaciju"
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

            {/* Vodovod — only shown to super_admin */}
            {isSuperAdmin && (
              <>
                <Text style={styles.label}>Vodovod:</Text>
                {companyIdError ? <Text style={styles.errorText}>{companyIdError}</Text> : null}
                {loadingUtils ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
                ) : (
                  <View style={styles.optionsContainer}>
                    {utilities.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.option, companyId === u.id && styles.optionActive]}
                        onPress={() => { setCompanyId(u.id); setCompanyIdError(''); }}
                      >
                        <Text style={[styles.optionText, companyId === u.id && styles.optionTextActive]}>
                          {u.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

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
  safeArea:      { flex: 1, backgroundColor: '#fff' },
  container:     { flex: 1, backgroundColor: '#fff' },
  scrollView:    { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'android' ? 100 : 80 },
  formCard:      { padding: 16 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16, marginTop: 8 },
  label:        { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  errorText:    { fontSize: 14, color: Colors.error, marginBottom: 8 },

  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  option:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.highlight },
  optionActive:     { backgroundColor: Colors.primary },
  optionText:       { fontSize: 14, color: Colors.text },
  optionTextActive: { color: '#fff' },

  actions:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton:  { flex: 1, marginRight: 8 },
  submitButton:  { flex: 1, marginLeft: 8 },
});
