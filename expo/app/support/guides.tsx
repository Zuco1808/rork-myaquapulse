import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  Droplet,
  CreditCard,
  Bell,
  User,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

interface GuideStep {
  step: number;
  text: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: GuideStep[];
}

const GUIDES: Guide[] = [
  {
    id: 'reading',
    title: 'Kako podnijeti očitanje vodomjera',
    description: 'Korak po korak vodič za slanje očitanja',
    icon: <Droplet size={22} color={Colors.primary} />,
    steps: [
      { step: 1, text: 'Otvorite tab "Očitanja" u navigacionoj traci ili u bočnom meniju.' },
      { step: 2, text: 'Pritisnite dugme "+" u donjem desnom uglu da dodate novo očitanje.' },
      { step: 3, text: 'Odaberite vodomjer s popisa vaših priključaka.' },
      { step: 4, text: 'Unesite trenutnu vrijednost s displeja vodomjera (u m³).' },
      { step: 5, text: 'Opcionalno: dodajte komentar ili fotografiju ako ima nepravilnosti.' },
      { step: 6, text: 'Pritisnite "Pošalji" i sačekajte potvrdu. Status će se promijeniti u "Potvrđeno" nakon provjere.' },
    ],
  },
  {
    id: 'bills',
    title: 'Pregled i plaćanje računa',
    description: 'Upravljanje računima za vodu',
    icon: <CreditCard size={22} color={Colors.info} />,
    steps: [
      { step: 1, text: 'Otvorite "Računi" iz menija aplikacije.' },
      { step: 2, text: 'Vidjet ćete listu svih računa sortirano od najnovijeg.' },
      { step: 3, text: 'Pritisnite na račun da vidite detalje — iznos, period, datum dospijeća.' },
      { step: 4, text: 'Na ekranu detalja odaberite "Plati" da pristupite opcijama plaćanja.' },
      { step: 5, text: 'Nakon uspješnog plaćanja status računa se mijenja u "Plaćeno" i dobijate potvrdu putem notifikacije.' },
    ],
  },
  {
    id: 'notifications',
    title: 'Podešavanje obavještenja',
    description: 'Kako upravljati push notifikacijama',
    icon: <Bell size={22} color={Colors.warning} />,
    steps: [
      { step: 1, text: 'Prva prijava: aplikacija traži dozvolu za slanje obavještenja. Pritisnite "Dozvoli".' },
      { step: 2, text: 'Obavještenja dobijate automatski za: novi račun, potvrdu plaćanja, status očitanja i dodijeljene zadatke.' },
      { step: 3, text: 'Sva obavještenja možete pregledati u "Obavještenja" iz menija.' },
      { step: 4, text: 'Za gašenje obavještenja idite na Postavke uređaja > Aplikacije > MyAquaPulse > Obavještenja.' },
    ],
  },
  {
    id: 'profile',
    title: 'Upravljanje profilom',
    description: 'Ažuriranje ličnih podataka i lozinke',
    icon: <User size={22} color={Colors.secondary} />,
    steps: [
      { step: 1, text: 'Otvorite "Postavke" (ikona profila u navigacionoj traci ili u meniju).' },
      { step: 2, text: 'Pritisnite "Uredi profil" da promijenite ime, broj telefona ili avatar.' },
      { step: 3, text: 'Za promjenu lozinke idite u "Više opcija" > "Promijeni lozinku".' },
      { step: 4, text: 'Unesite novu lozinku (min. 6 znakova) i potvrdu, zatim pritisnite "Sačuvaj".' },
    ],
  },
];

export default function GuidesScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Vodiči i uputstva" showBack onLeftPress={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FileText size={32} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Vodiči za korištenje</Text>
          <Text style={styles.heroSub}>
            Detaljni koraci za sve funkcionalnosti aplikacije MyAquaPulse.
          </Text>
        </View>

        {/* Guide list */}
        {GUIDES.map((guide) => {
          const open = expandedId === guide.id;
          return (
            <Card key={guide.id} style={styles.card}>
              <TouchableOpacity
                style={styles.guideHeader}
                onPress={() => toggle(guide.id)}
                activeOpacity={0.7}
              >
                <View style={styles.guideIconWrap}>{guide.icon}</View>
                <View style={styles.guideHeaderText}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideSub}>{guide.description}</Text>
                </View>
                {open ? (
                  <ChevronDown size={20} color={Colors.primary} />
                ) : (
                  <ChevronRight size={20} color={Colors.textLight} />
                )}
              </TouchableOpacity>

              {open && (
                <View style={styles.stepsWrap}>
                  {guide.steps.map((s) => (
                    <View key={s.step} style={styles.stepRow}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepNum}>{s.step}</Text>
                      </View>
                      <Text style={styles.stepText}>{s.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 40 },

  hero: {
    alignItems: 'center',
    backgroundColor: Colors.highlight,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  heroSub:   { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  card: { marginBottom: 12, overflow: 'hidden' },

  guideHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  guideIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.highlight,
    alignItems: 'center', justifyContent: 'center',
  },
  guideHeaderText: { flex: 1 },
  guideTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  guideSub:    { fontSize: 12, color: Colors.textLight },

  stepsWrap: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: 16, gap: 14,
  },
  stepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  stepNum:  { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  stepText: { fontSize: 14, color: Colors.text, lineHeight: 21, flex: 1 },
});
