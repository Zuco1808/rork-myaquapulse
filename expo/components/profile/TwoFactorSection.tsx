import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ShieldCheck, ShieldOff } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  has2FA, listVerifiedFactors, enrollTotp, verifyEnroll, disableTotp, EnrollResult,
} from '@/lib/api/mfa';
import { captureError } from '@/lib/sentry';
import Colors from '@/constants/colors';

export function TwoFactorSection() {
  const [loading, setLoading]   = useState(true);
  const [enabled, setEnabled]   = useState(false);
  const [enroll, setEnroll]     = useState<EnrollResult | null>(null);
  const [code, setCode]         = useState('');
  const [busy, setBusy]         = useState(false);

  const refresh = async () => {
    try { setEnabled(await has2FA()); }
    catch (e) { captureError(e, { screen: '2fa', action: 'check' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handleStart = async () => {
    setBusy(true);
    try {
      setEnroll(await enrollTotp());
      setCode('');
    } catch (e: any) {
      Alert.alert('Greška', e.message || 'Pokretanje 2FA nije uspjelo.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!enroll) return;
    if (code.trim().length < 6) { Alert.alert('Greška', 'Unesite 6-cifreni kod.'); return; }
    setBusy(true);
    try {
      await verifyEnroll(enroll.factorId, code.trim());
      setEnroll(null);
      setEnabled(true);
      Alert.alert('Uspjeh', 'Dvofaktorska autentifikacija je uključena.');
    } catch (e: any) {
      Alert.alert('Greška', 'Neispravan kod. Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    Alert.alert('Isključi 2FA', 'Sigurno isključiti dvofaktorsku autentifikaciju?', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Isključi', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const factors = await listVerifiedFactors();
            for (const f of factors) await disableTotp(f.id);
            setEnabled(false);
          } catch (e: any) {
            Alert.alert('Greška', e.message || 'Isključivanje nije uspjelo.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {enabled ? <ShieldCheck size={20} color="#4CAF50" /> : <ShieldOff size={20} color={Colors.textLight} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dvofaktorska autentifikacija</Text>
          <Text style={styles.sub}>{enabled ? 'Uključena' : 'Isključena'}</Text>
        </View>
      </View>

      {/* Enrollment u toku */}
      {enroll ? (
        <View style={styles.enrollBox}>
          <Text style={styles.step}>1. Skenirajte QR kod u authenticator aplikaciji (Google Authenticator, Authy…)</Text>
          {Platform.OS !== 'web' || !!enroll.qrSvg ? (
            <View style={styles.qrWrap}>
              <SvgXml xml={enroll.qrSvg} width={180} height={180} />
            </View>
          ) : null}
          <View style={styles.secretRow}>
            <Text style={styles.secret} selectable>Ručni unos ključa: {enroll.secret}</Text>
          </View>

          <Text style={styles.step}>2. Unesite 6-cifreni kod iz aplikacije</Text>
          <Input value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
          <View style={styles.btnRow}>
            <Button title="Odustani" variant="outline" onPress={() => setEnroll(null)} style={{ flex: 1 }} />
            <Button title="Potvrdi" onPress={handleVerify} isLoading={busy} style={{ flex: 1 }} />
          </View>
        </View>
      ) : enabled ? (
        <Button title="Isključi 2FA" variant="outline" onPress={handleDisable} isLoading={busy}
          style={{ marginTop: 10, borderColor: Colors.error }} />
      ) : (
        <Button title="Uključi 2FA" onPress={handleStart} isLoading={busy} style={{ marginTop: 10 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:     { fontSize: 14, fontWeight: '600', color: Colors.text },
  sub:       { fontSize: 12, color: Colors.textLight, marginTop: 1 },

  enrollBox: { marginTop: 12 },
  step:      { fontSize: 13, color: Colors.text, marginTop: 10, marginBottom: 6, fontWeight: '500' },
  qrWrap:    { alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, alignSelf: 'center' },
  secretRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10 },
  secret:    { flex: 1, fontSize: 12, color: Colors.text, fontFamily: 'monospace' },
  btnRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
});
