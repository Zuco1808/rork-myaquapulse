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
import { useRouter } from 'expo-router';
import {
  Send,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Users,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { sendNotification, NotifType } from '@/lib/api/notifications';
import { usePermissions } from '@/lib/use-permissions';
import Colors from '@/constants/colors';

/* ── constants ───────────────────────────────────────── */
const NOTIF_TYPES: { id: NotifType; label: string; icon: React.ReactNode }[] = [
  { id: 'info',    label: 'Informacija', icon: <Info       size={18} color={Colors.info}    /> },
  { id: 'success', label: 'Uspjeh',      icon: <CheckCircle size={18} color={Colors.success} /> },
  { id: 'warning', label: 'Upozorenje',  icon: <AlertTriangle size={18} color={Colors.warning} /> },
  { id: 'error',   label: 'Greška',      icon: <AlertCircle size={18} color={Colors.error}   /> },
];

const ROLES = [
  { id: 'utility_admin',    label: 'Admin vodovoda' },
  { id: 'finance',          label: 'Finansije' },
  { id: 'worker',           label: 'Radnik' },
  { id: 'end_user',         label: 'Korisnik' },
  { id: 'distributor_admin',label: 'Distributer' },
];

/* ── component ───────────────────────────────────────── */
export default function SendNotificationScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const { canSendNotifications, canAccessAllTenants } = usePermissions();
  const canAccess = canSendNotifications;

  const [title, setTitle]             = useState('');
  const [message, setMessage]         = useState('');
  const [type, setType]               = useState<NotifType>('info');
  const [targetAll, setTargetAll]     = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sending, setSending]         = useState(false);
  const [titleError, setTitleError]   = useState('');
  const [msgError, setMsgError]       = useState('');

  useEffect(() => {
    if (!canAccess) router.replace('/(tabs)');
  }, [canAccess]);

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const validate = () => {
    let ok = true;
    if (!title.trim())   { setTitleError('Naslov je obavezan');  ok = false; } else setTitleError('');
    if (!message.trim()) { setMsgError('Tekst je obavezan');     ok = false; } else setMsgError('');
    if (!targetAll && selectedRoles.length === 0) {
      Alert.alert('Greška', 'Odaberite barem jednu ulogu korisnika.');
      ok = false;
    }
    return ok;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      const count = await sendNotification({
        title:        title.trim(),
        message:      message.trim(),
        type,
        targetAll,
        targetRoles:  targetAll ? undefined : selectedRoles,
        utility_id:   canAccessAllTenants ? undefined : (user?.utility_id ?? undefined),
      });
      Alert.alert(
        'Uspjeh',
        `Obavijest je poslana ${count} ${count === 1 ? 'korisniku' : count < 5 ? 'korisnika' : 'korisnika'}.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Slanje nije uspjelo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header title="Nova obavijest" showBack onLeftPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Sadržaj */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Sadržaj obavijesti</Text>

            <Input
              label="Naslov *"
              placeholder="npr. Planirano isključenje vode"
              value={title}
              onChangeText={(t) => { setTitle(t); if (titleError) setTitleError(''); }}
              error={titleError}
            />

            <Input
              label="Tekst obavijesti *"
              placeholder="Unesite detaljan tekst..."
              value={message}
              onChangeText={(t) => { setMessage(t); if (msgError) setMsgError(''); }}
              error={msgError}
              multiline
              numberOfLines={4}
              style={styles.multiline}
            />

            <Text style={styles.label}>Tip obavijesti:</Text>
            <View style={styles.chips}>
              {NOTIF_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, type === t.id && styles.typeChipActive]}
                  onPress={() => setType(t.id)}
                >
                  {t.icon}
                  <Text style={[styles.typeChipText, type === t.id && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Primaoci */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Primaoci</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Users size={18} color={Colors.primary} />
                <Text style={styles.switchLabel}>Pošalji svim korisnicima</Text>
              </View>
              <Switch
                value={targetAll}
                onValueChange={(v) => { setTargetAll(v); if (v) setSelectedRoles([]); }}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {!targetAll && (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Uloge korisnika:</Text>
                <View style={styles.chips}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, selectedRoles.includes(r.id) && styles.chipActive]}
                      onPress={() => toggleRole(r.id)}
                    >
                      <Text style={[styles.chipText, selectedRoles.includes(r.id) && styles.chipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Card>

          {/* Scope info */}
          {!canAccessAllTenants && user?.utility_id && (
            <View style={styles.scopeNote}>
              <Info size={14} color={Colors.textLight} />
              <Text style={styles.scopeNoteText}>
                Obavijest će biti poslana samo korisnicima vašeg vodovoda.
              </Text>
            </View>
          )}

          <Button
            title="Pošalji obavijest"
            leftIcon={<Send size={18} color="#fff" />}
            onPress={handleSend}
            isLoading={sending}
            style={styles.sendBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#f4f6f9' },
  content:   { padding: 16, paddingBottom: 40 },
  section:   { padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  label:     { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  multiline: { height: 100, textAlignVertical: 'top' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.highlight,
  },
  chipActive:     { backgroundColor: Colors.primary },
  chipText:       { fontSize: 13, color: Colors.text },
  chipTextActive: { color: '#fff' },

  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: '#fff',
  },
  typeChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.highlight },
  typeChipText:       { fontSize: 13, color: Colors.text },
  typeChipTextActive: { color: Colors.primary, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15, color: Colors.text },

  scopeNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.highlight, borderRadius: 8,
    padding: 12, marginBottom: 14,
  },
  scopeNoteText: { fontSize: 12, color: Colors.textLight, flex: 1 },

  sendBtn: { marginTop: 4 },
});
