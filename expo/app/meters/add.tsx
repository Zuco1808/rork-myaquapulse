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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Droplet, Hash, MapPin, Save } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GpsLocationPicker } from '@/components/ui/GpsLocationPicker';
import { useAuthStore } from '@/store/auth-store';
import { createMeter } from '@/lib/api/meters';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/use-permissions';
import { GpsCoords } from '@/lib/use-gps-location';
import Colors from '@/constants/colors';
import { captureError } from '@/lib/sentry';

type MeterType = 'standard' | 'smart' | 'industrial';

const METER_TYPE_LABELS: Record<MeterType, string> = {
  standard: 'Standardni',
  smart: 'Pametni',
  industrial: 'Industrijski',
};

export default function AddMeterScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const { canManageMeters: canManage } = usePermissions();

  /* ── form state ──────────────────────────────── */
  const [serial, setSerial]             = useState('');
  const [address, setAddress]           = useState('');
  const [meterType, setMeterType]       = useState<MeterType>('standard');
  const [utilityId, setUtilityId]       = useState(user?.utility_id ?? '');
  const [selectedUserId, setSelectedUserId] = useState('');

  /* ── picker data ─────────────────────────────── */
  const [utilities, setUtilities]   = useState<{ id: string; name: string }[]>([]);
  const [endUsers, setEndUsers]     = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [gpsCoords, setGpsCoords] = useState<GpsCoords | null>(null);

  /* ── errors / saving ─────────────────────────── */
  const [serialError, setSerialError]   = useState('');
  const [addressError, setAddressError] = useState('');
  const [utilityError, setUtilityError] = useState('');
  const [userError, setUserError]       = useState('');
  const [saving, setSaving]             = useState(false);

  /* ── load picker data ────────────────────────── */
  useEffect(() => {
    if (!canManage) { router.replace('/(tabs)'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Za super_admin – učitaj listu vodovoda
      if (isSuperAdmin) {
        const { data } = await supabase
          .from('water_utilities')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        setUtilities(data || []);
      }

      // 2. Učitaj end_user korisnike (filtrirani po utility ako nije super_admin)
      let usersQ = supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'end_user')
        .order('full_name');

      if (!isSuperAdmin && user?.utility_id) {
        usersQ = usersQ.eq('utility_id', user.utility_id);
      }

      const { data: usersData } = await usersQ;
      setEndUsers(usersData || []);
    } catch (e) {
      captureError(e, { screen: 'meter-add', action: 'loadFormData' });
    } finally {
      setLoadingData(false);
    }
  };

  /* ── when super_admin picks a utility, reload users ── */
  const handleUtilityChange = async (id: string) => {
    setUtilityId(id);
    setSelectedUserId('');
    if (!id) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'end_user')
        .eq('utility_id', id)
        .order('full_name');
      setEndUsers(data || []);
    } catch {}
  };

  /* ── validation ──────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!serial.trim())       { setSerialError('Serijski broj je obavezan');  ok = false; } else setSerialError('');
    if (!address.trim())      { setAddressError('Adresa je obavezna');        ok = false; } else setAddressError('');
    if (!utilityId)           { setUtilityError('Vodovod je obavezan');       ok = false; } else setUtilityError('');
    if (!selectedUserId)      { setUserError('Korisnik je obavezan');         ok = false; } else setUserError('');
    return ok;
  };

  /* ── submit ──────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createMeter({
        utility_id:   utilityId,
        user_id:      selectedUserId,
        address:      address.trim(),
        meter_serial: serial.trim(),
        meter_type:   meterType,
        latitude:     gpsCoords?.latitude ?? null,
        longitude:    gpsCoords?.longitude ?? null,
      });
      Alert.alert('Uspjeh', 'Priključak je uspješno kreiran.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Kreiranje nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  /* ── loading state ───────────────────────────── */
  if (loadingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Novi priključak" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── render ──────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header title="Novi priključak" showBack onLeftPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Icon */}
          <View style={styles.iconRow}>
            <View style={styles.iconBox}>
              <Droplet size={36} color={Colors.primary} />
            </View>
          </View>

          {/* Osnovni podaci */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Osnovni podaci</Text>

            <Input
              label="Serijski broj vodomjera *"
              placeholder="npr. VD-2026-001234"
              value={serial}
              onChangeText={(t) => { setSerial(t); if (serialError) setSerialError(''); }}
              error={serialError}
              leftIcon={<Hash size={18} color={Colors.textLight} />}
            />

            <Input
              label="Adresa priključka *"
              placeholder="Ulica i broj, Grad"
              value={address}
              onChangeText={(t) => { setAddress(t); if (addressError) setAddressError(''); }}
              error={addressError}
              leftIcon={<MapPin size={18} color={Colors.textLight} />}
            />

            <Text style={styles.label}>Tip vodomjera:</Text>
            <View style={styles.chips}>
              {(['standard', 'smart', 'industrial'] as MeterType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, meterType === t && styles.chipActive]}
                  onPress={() => setMeterType(t)}
                >
                  <Text style={[styles.chipText, meterType === t && styles.chipTextActive]}>
                    {METER_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GpsLocationPicker value={gpsCoords} onChange={setGpsCoords} />
          </Card>

          {/* Vodovod (samo super_admin bira, ostali imaju predefiniran) */}
          {isSuperAdmin && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Vodovod *</Text>
              {utilityError ? <Text style={styles.errorText}>{utilityError}</Text> : null}
              {utilities.length === 0 ? (
                <Text style={styles.emptyNote}>Nema aktivnih vodovoda.</Text>
              ) : (
                <View style={styles.chips}>
                  {utilities.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.chip, utilityId === u.id && styles.chipActive]}
                      onPress={() => handleUtilityChange(u.id)}
                    >
                      <Text style={[styles.chipText, utilityId === u.id && styles.chipTextActive]}>
                        {u.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          )}

          {/* Korisnik */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Korisnik (vlasnik priključka) *</Text>
            {userError ? <Text style={styles.errorText}>{userError}</Text> : null}

            {endUsers.length === 0 ? (
              <Text style={styles.emptyNote}>
                {isSuperAdmin && !utilityId
                  ? 'Odaberite vodovod da biste vidjeli korisnike.'
                  : 'Nema registrovanih korisnika za ovaj vodovod.'}
              </Text>
            ) : (
              <View style={styles.userList}>
                {endUsers.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userRow, selectedUserId === u.id && styles.userRowActive]}
                    onPress={() => { setSelectedUserId(u.id); if (userError) setUserError(''); }}
                  >
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, selectedUserId === u.id && styles.userNameActive]}>
                        {u.full_name}
                      </Text>
                      <Text style={[
                        styles.userEmail,
                        selectedUserId === u.id && { color: 'rgba(255,255,255,0.75)' },
                      ]}>
                        {u.email}
                      </Text>
                    </View>
                    {selectedUserId === u.id && <View style={styles.checkDot} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          <Button
            title="Kreiraj priključak"
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
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:  { padding: 16, paddingBottom: 40 },

  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconBox: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },

  section:      { padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  label:        { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 4 },
  errorText:    { fontSize: 13, color: Colors.error, marginBottom: 8 },
  emptyNote:    { fontSize: 13, color: Colors.textLight, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },

  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.highlight },
  chipActive:   { backgroundColor: Colors.primary },
  chipText:     { fontSize: 13, color: Colors.text },
  chipTextActive: { color: '#fff' },

  userList: { gap: 8 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, backgroundColor: Colors.highlight,
  },
  userRowActive: { backgroundColor: Colors.primary },
  userInfo:      { flex: 1 },
  userName:      { fontSize: 14, fontWeight: '600', color: Colors.text },
  userNameActive:{ color: '#fff' },
  userEmail:     { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  checkDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', marginLeft: 8 },

  saveBtn: { marginTop: 4 },
});
