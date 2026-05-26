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
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/colors';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Kako mogu podnijeti očitanje vodomjera?',
    answer:
      'Otvorite ekran "Očitanja" u meniju aplikacije. Odaberite vodomjer, unesite trenutnu vrijednost na brojaču i pritisnite dugme "Pošalji". Možete i fotografisati stanje brojaču.',
  },
  {
    question: 'Kada dobijem račun za vodu?',
    answer:
      'Računi se generiraju jednom mjesečno, obično prvih 5 radnih dana u mjesecu za prethodni period. Bit ćete obaviješteni push notifikacijom čim je novi račun dostupan.',
  },
  {
    question: 'Kako platiti račun putem aplikacije?',
    answer:
      'Na ekranu "Računi" odaberite otvoreni račun i pritisnite "Plati". Plaćanje je dostupno putem bankovnog transfera ili kartičnog plaćanja, ovisno o opcijama vašeg vodovoda.',
  },
  {
    question: 'Šta znači status "Na čekanju" kod mog očitanja?',
    answer:
      'Status "Na čekanju" znači da je vaše očitanje primljeno i čeka pregled od strane administratora vodovoda. Bit ćete obaviješteni kada se status promijeni na "Potvrđeno" ili "Odbijeno".',
  },
  {
    question: 'Kako prijaviti kvar na vodovodnoj instalaciji?',
    answer:
      'Idite na "Podrška" > "Prijava kvara", popunite kratki opis problema, odaberite priključak i označite ako se radi o hitnom kvaru. Vaša prijava bit će odmah vidljiva timu vodovoda.',
  },
  {
    question: 'Zašto je moja lozinka odbijena pri promjeni?',
    answer:
      'Lozinka mora imati najmanje 6 znakova. Uvjerite se da oba polja (nova lozinka i potvrda) sadrže isti tekst bez razmaka na početku ili kraju.',
  },
  {
    question: 'Mogu li imati više priključaka na jednom nalogu?',
    answer:
      'Da. Ako imate više objekata sa priključcima na vodovodnu mrežu, administrator vodovoda može svaki priključak dodijeliti vašem nalogu. Svi priključci bit će vidljivi na ekranu "Vodomjeri".',
  },
  {
    question: 'Kako isključiti push notifikacije?',
    answer:
      'Idite na "Postavke" svog uređaja > Aplikacije > MyAquaPulse > Obavještenja. Tamo možete upravljati svim vrstama obavještenja pojedinačno.',
  },
];

export default function FaqScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (i: number) => setExpanded((prev) => (prev === i ? null : i));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Česta pitanja" showBack onLeftPress={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <HelpCircle size={32} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Kako vam možemo pomoći?</Text>
          <Text style={styles.heroSub}>
            Pronađite brze odgovore na najčešća pitanja naših korisnika.
          </Text>
        </View>

        {/* FAQ accordion */}
        {FAQ_ITEMS.map((item, i) => (
          <Card key={i} style={styles.card}>
            <TouchableOpacity
              style={styles.questionRow}
              onPress={() => toggle(i)}
              activeOpacity={0.7}
            >
              <Text style={styles.question}>{item.question}</Text>
              {expanded === i ? (
                <ChevronUp size={20} color={Colors.primary} />
              ) : (
                <ChevronDown size={20} color={Colors.textLight} />
              )}
            </TouchableOpacity>
            {expanded === i && (
              <View style={styles.answerWrap}>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            )}
          </Card>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Niste pronašli odgovor? Kontaktirajte nas na{' '}
            <Text style={styles.footerEmail}>podrska@vodovod.ba</Text>
          </Text>
        </View>
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

  card: { marginBottom: 10, overflow: 'hidden' },
  questionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  question: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8 },
  answerWrap: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 12,
  },
  answer: { fontSize: 14, color: Colors.textLight, lineHeight: 22 },

  footer:      { marginTop: 24, padding: 16, alignItems: 'center' },
  footerText:  { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
  footerEmail: { color: Colors.primary, fontWeight: '600' },
});
