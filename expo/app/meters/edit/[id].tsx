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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Droplet, Hash, MapPin, Save } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GpsLocationPicker } from '@/components/ui/GpsLocationPicker';
import { useAuthStore } from '@/store/auth-store';
import { getMeterById, updateMeter } from '@/lib/api/meters';
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

export default function EditMeterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const { canManageMeters: canManage } = usePermissions();

  /* ── form state ─────────────────────────────── */
  const [serial, setSerial]           = useState('');
  const [address, setAddress]         = useState('');
  const [meterType, setMeterType]     = useState<MeterType>('standard');
  const [isActive, setIsActive]       = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [gpsCoords, setGpsCoords]     = useState<GpsCoords | null>(null);

  /* ── picker data ────────────────────────────── */
  const [endUsers, setEndUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  /* ── errors / saving ────────────────────────── */
  const [serialError, setSerialError]   = useState('');
  const [addressError, setAddressError] = useState('');
  const [saving, setSaving]             = useState(false);

  /* ── load existing meter + users ────────────── */
  useEffect(() => {
    if (!canManage || !id) { router.replace('/(tabs)'); return; }
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load meter
      const meter = await getMeterById(id as string);
      setSerial(meter.serialNumber || '');
      setAddress(meter.address || '');
      setMeterType((meter.meter_type as MeterType) || 'standard');
      setIsActive(meter.is_active ?? true);
      setSelectedUserId(meter.user_id || '');
      if (meter.latitude != null && meter.longitude != null) {
        setGpsCoords({ latitude: meter.latitude, longitude: meter.longitude });
      }

      // Load end users scoped to utility
      const utilityId = meter.utility_id || user?.utility_id;
      let query = supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'end_user')
        .order('full_name');
      if (utilityId) {
        query = query.eq('utility_id', utilityId);
      }
      const { data: usersData } = await query;
      setEndUsers(usersData || []);
    } catch (e) {
      captureError(e, { screen: 'meter-edit', action: 'loadMeter' });
      Alert.alert('Greška', 'Učitavanje podataka nije uspjelo.');
    } finally {
      setLoadingData(false);
    }
  };

  /* ── validation ─────────────────────────────── */
  const validate = () => {
    let ok = true;
    if (!serial.trim())  { setSerialError('Serijski broj je obavezan'); ok = false; } else setSerialError('');
    if (!address.trim()) { setAddressError('Adresa je obavezna');       ok = false; } else setAddressError('');
    return ok;
  };

  /* ── submit ─────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateMeter(id as string, {
        meter_serial: serial.trim(),
        address:      address.trim(),
        meter_type:   meterType,
        is_active:    isActive,
        latitude:     gpsCoords?.latitude ?? null,
        longitude:    gpsCoords?.longitude ?? null,
        ...(selectedUserId ? { user_id: selectedUserId } : {}),
      });
      Alert.alert('Uspjeh', 'Priključak je uspješno ažuriran.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Ažuriranje nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  /* ── loading ────────────────────────────────── */
  if (loadingData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Uredi vodomjer" showBack onLeftPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── render ─────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header title="Uredi vodomjer" showBack onLeftPress={() => router.back()} />

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

          {/* Status */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Status priključka</Text>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>
                  {isActive ? 'Aktivan' : 'Neaktivan'}
                </Text>
                <Text style={styles.switchDesc}>
                  {isActive
                    ? 'Priključak je aktivan i dostupan za očitavanja.'
                    : 'Priključak je deaktiviran — nije dostupan za nova očitavanja.'}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                thumbColor={isActive ? Colors.primary : Colors.textLight}
              />
            </View>
          </Card>

          {/* Korisnik (promjena vlasnika) */}
          {endUsers.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Vlasnik priključka</Text>
              <View style={styles.userList}>
                {endUsers.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userRow, selectedUserId === u.id && styles.userRowActive]}
                    onPress={() => setSelectedUserId(u.id)}
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
            </Card>
          )}

          <Button
            title="Sačuvaj izmjene"
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

  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.highlight },
  chipActive:     { backgroundColor: Colors.primary },
  chipText:       { fontSize: 13, color: Colors.text },
  chipTextActive: { color: '#fff' },

  switchRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel:{ fontSize: 15, fontWeight: '600', color: Colors.text },
  switchDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  userList: { gap: 8 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 10, backgroundColor: Colors.highlight,
  },
  userRowActive:  { backgroundColor: Colors.primary },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 14, fontWeight: '600', color: Colors.text },
  userNameActive: { color: '#fff' },
  userEmail:      { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  checkDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', marginLeft: 8 },

  saveBtn: { marginTop: 4 },
});
