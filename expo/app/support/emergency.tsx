import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Phone, AlertTriangle, Clock, MapPin, Info } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

interface EmergencyContact {
  id: string;
  label: string;
  phone: string;
  description: string;
  available: string;
  urgent: boolean;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'dz',
    label: 'Dežurna služba vodovoda',
    phone: '+38733000111',
    description: 'Prijava hitnih kvarova na vodovodnoj mreži (curenje, poplava, nestanak vode)',
    available: '0–24h, svi dani',
    urgent: true,
  },
  {
    id: 'podrska',
    label: 'Korisnička podrška',
    phone: '+38733123456',
    description: 'Opća pitanja, administrativne promjene, prigovori',
    available: 'Pon – Pet: 08:00 – 16:00',
    urgent: false,
  },
  {
    id: 'tehnika',
    label: 'Tehnička služba',
    phone: '+38733123457',
    description: 'Technički problemi s priključcima, zamjena vodomjera',
    available: 'Pon – Pet: 07:00 – 15:00',
    urgent: false,
  },
  {
    id: 'vz',
    label: 'Vatrogasci (VZ Federacije)',
    phone: '123',
    description: 'Hitni slučajevi — poplava, požar, opasnost po život',
    available: '0–24h',
    urgent: true,
  },
  {
    id: 'hitna',
    label: 'Hitna medicinska pomoć',
    phone: '124',
    description: 'Medicinska hitna pomoć',
    available: '0–24h',
    urgent: true,
  },
];

function callNumber(phone: string, label: string) {
  const url = `tel:${phone}`;
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Greška', `Poziv nije moguć na ovom uređaju.\nBroj: ${phone}`);
      }
    })
    .catch(() => Alert.alert('Greška', 'Pokretanje poziva nije uspjelo.'));
}

export default function EmergencyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Hitni slučajevi" showBack onLeftPress={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Warning banner */}
        <View style={styles.banner}>
          <AlertTriangle size={22} color={Colors.error} />
          <Text style={styles.bannerText}>
            U slučaju neposredne opasnosti po život nazovite{' '}
            <Text style={styles.bannerEmphasis}>112</Text> odmah.
          </Text>
        </View>

        {/* Contacts */}
        {EMERGENCY_CONTACTS.map((c) => (
          <Card key={c.id} style={[styles.card, c.urgent && styles.cardUrgent]}>
            <View style={styles.cardContent}>
              <View style={[styles.iconWrap, c.urgent && styles.iconWrapUrgent]}>
                <Phone size={22} color={c.urgent ? Colors.error : Colors.primary} />
              </View>
              <View style={styles.info}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{c.label}</Text>
                  {c.urgent && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>HITNO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.description}>{c.description}</Text>
                <View style={styles.metaRow}>
                  <Clock size={12} color={Colors.textLight} />
                  <Text style={styles.meta}>{c.available}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.callBtn, c.urgent && styles.callBtnUrgent]}
              onPress={() => callNumber(c.phone, c.label)}
              activeOpacity={0.8}
            >
              <Phone size={16} color="#fff" />
              <Text style={styles.callBtnText}>{c.phone.replace('+387', '0')}</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Info size={16} color={Colors.info} style={{ marginTop: 2 }} />
          <Text style={styles.infoText}>
            Pritisnite dugme s brojem telefona da pokrenete poziv direktno s vašeg uređaja.
            Za prijavu kvara unutar aplikacije koristite opciju "Prijava kvara" u meniju Podrška.
          </Text>
        </View>

        {/* Address */}
        <Card style={styles.addressCard}>
          <View style={styles.addressRow}>
            <MapPin size={18} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.addressTitle}>Sjedište vodovoda</Text>
              <Text style={styles.addressLine}>Zmaja od Bosne 8, 71000 Sarajevo</Text>
              <Text style={styles.addressLine}>info@vodovod.ba</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 40 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF3F3',
    borderWidth: 1, borderColor: Colors.error + '44',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  bannerText:    { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },
  bannerEmphasis:{ fontWeight: 'bold', color: Colors.error, fontSize: 16 },

  card:       { marginBottom: 12, overflow: 'hidden', padding: 0 },
  cardUrgent: { borderWidth: 1, borderColor: Colors.error + '44' },
  cardContent:{ flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },

  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconWrapUrgent: { backgroundColor: Colors.error + '15' },

  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  label:    { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  urgentBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, backgroundColor: Colors.error + '22',
  },
  urgentBadgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.error },
  description: { fontSize: 13, color: Colors.textLight, lineHeight: 19, marginBottom: 5 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta:        { fontSize: 11, color: Colors.textLight },

  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    paddingVertical: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  callBtnUrgent: { backgroundColor: Colors.error },
  callBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.info + '15',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 19 },

  addressCard: { padding: 16 },
  addressRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  addressTitle:{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  addressLine: { fontSize: 13, color: Colors.textLight, marginBottom: 2 },
});
