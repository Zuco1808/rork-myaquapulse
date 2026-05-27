import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Globe,
  MessageSquare,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

export default function ContactScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');

  /* ── Validation ─────────────────────────────────── */
  const validateSubject = () => {
    if (!subject.trim()) { setSubjectError('Predmet poruke je obavezan'); return false; }
    setSubjectError(''); return true;
  };

  const validateMessage = () => {
    if (!message.trim()) { setMessageError('Tekst poruke je obavezan'); return false; }
    setMessageError(''); return true;
  };

  /* ── Submit ──────────────────────────────────────── */
  const handleSubmit = async () => {
    // Call both so ALL error messages appear at once (no short-circuit)
    const okSubject = validateSubject();
    const okMessage = validateMessage();
    if (!okSubject || !okMessage) return;

    setIsLoading(true);
    try {
      // Resolve utility_id — available directly on most roles;
      // for end_users it may be null, so fall back to their active connection.
      let utilityId = user?.utility_id ?? null;

      if (!utilityId && user?.id) {
        const { data: conn } = await supabase
          .from('connections')
          .select('utility_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        utilityId = conn?.utility_id ?? null;
      }

      if (!utilityId) {
        Alert.alert(
          'Greška',
          'Nije moguće identificirati vodovod. Molimo kontaktirajte nas direktno telefonom ili emailom.',
        );
        return;
      }

      const senderInfo = user
        ? `${user.full_name ?? 'Nepoznat korisnik'} <${user.email}>`
        : 'Neregistrovani korisnik';

      await supabase.from('tasks').insert({
        utility_id: utilityId,
        title:      subject.trim(),
        description: `[Kontakt poruka od: ${senderInfo}]\n\n${message.trim()}`,
        task_type:  'other',
        priority:   'normal',
        status:     'open',
        created_by: user?.id ?? null,
      });

      Alert.alert(
        'Poruka poslana',
        'Vaša poruka je uspješno poslana. Odgovorit ćemo vam u najkraćem mogućem roku.',
        [{ text: 'OK', onPress: () => router.back() }],
      );

      setSubject('');
      setMessage('');
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Slanje poruke nije uspjelo. Pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Quick-contact helpers ───────────────────────── */
  const handleCall     = () => Linking.openURL('tel:+38733123456');
  const handleEmail    = () => Linking.openURL('mailto:info@vodovod.ba');
  const handleWebsite  = () => Linking.openURL('https://www.vodovod.ba');
  const handleLocation = () => Linking.openURL('https://maps.google.com/?q=Sarajevo,Zmaja+od+Bosne+8');

  /* ── Render ──────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title="Kontakt"
        showBack
        onLeftPress={() => router.back()}
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Contact info ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt informacije</Text>

          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <Phone size={20} color={Colors.primary} />
            <Text style={styles.contactText}>+387 33 123 456</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
            <Mail size={20} color={Colors.primary} />
            <Text style={styles.contactText}>info@vodovod.ba</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={handleWebsite}>
            <Globe size={20} color={Colors.primary} />
            <Text style={styles.contactText}>www.vodovod.ba</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={handleLocation}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.contactText}>Zmaja od Bosne 8, Sarajevo</Text>
          </TouchableOpacity>

          <View style={[styles.contactItem, styles.lastItem]}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.contactText}>Pon – Pet: 08:00 – 16:00</Text>
          </View>
        </Card>

        {/* ── Message form ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Pošaljite nam poruku</Text>

          <Input
            label="Predmet"
            placeholder="Unesite predmet poruke"
            value={subject}
            onChangeText={(t) => { setSubject(t); if (subjectError) validateSubject(); }}
            error={subjectError}
          />

          <Input
            label="Poruka"
            placeholder="Unesite vašu poruku"
            value={message}
            onChangeText={(t) => { setMessage(t); if (messageError) validateMessage(); }}
            multiline
            numberOfLines={6}
            style={styles.messageInput}
            error={messageError}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Pošalji poruku"
            onPress={handleSubmit}
            leftIcon={<MessageSquare size={20} color="#fff" />}
            isLoading={isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content:   { flex: 1, padding: 16 },
  section:   { marginBottom: 16 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastItem:    { borderBottomWidth: 0 },
  contactText: { marginLeft: 12, fontSize: 16, color: Colors.text },

  messageInput:   { height: 120, textAlignVertical: 'top' },
  buttonContainer: { marginTop: 8, marginBottom: 32 },
});
