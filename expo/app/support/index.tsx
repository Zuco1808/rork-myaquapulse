import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  MessageSquare, 
  Phone,
  ChevronRight,
  Menu
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const supportOptions = [
    {
      id: 'report-issue',
      title: 'Prijava kvara',
      description: 'Prijavite kvar ili problem sa vodovodom',
      icon: <AlertTriangle size={24} color={Colors.error} />,
      onPress: () => router.push('/support/report-issue' as any),
    },
    {
      id: 'contact',
      title: 'Kontakt',
      description: 'Kontaktirajte našu službu za korisnike',
      icon: <MessageSquare size={24} color={Colors.primary} />,
      onPress: () => router.push('/support/contact' as any),
    },
    {
      id: 'faq',
      title: 'Često postavljena pitanja',
      description: 'Pronađite odgovore na najčešća pitanja',
      icon: <HelpCircle size={24} color={Colors.info} />,
      onPress: () => router.push('/support/faq' as any),
    },
    {
      id: 'guides',
      title: 'Vodiči i uputstva',
      description: 'Korisni vodiči za korištenje aplikacije',
      icon: <FileText size={24} color={Colors.secondary} />,
      onPress: () => router.push('/support/guides' as any),
    },
    {
      id: 'emergency',
      title: 'Hitni slučajevi',
      description: 'Brojevi telefona za hitne slučajeve',
      icon: <Phone size={24} color={Colors.warning} />,
      onPress: () => router.push('/support/emergency' as any),
    },
  ];
  
  return (
    <View style={styles.container}>
      <Header 
        title="Podrška"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)' as any)}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.headerSection}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Kako vam možemo pomoći?</Text>
          <Text style={styles.headerSubtitle}>
            Odaberite jednu od opcija ispod ili nas kontaktirajte direktno
          </Text>
        </View>
        
        <View style={styles.optionsContainer}>
          {supportOptions.map((option) => (
            <Card key={option.id} style={styles.optionCard}>
              <TouchableOpacity
                style={styles.optionContent}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  {option.icon}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <ChevronRight size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>
        
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Direktan kontakt</Text>
          <Text style={styles.contactInfo}>
            Telefon: +387 33 123 456
          </Text>
          <Text style={styles.contactInfo}>
            Email: podrska@vodovod.ba
          </Text>
          <Text style={styles.contactInfo}>
            Radno vrijeme: Pon-Pet 08:00-16:00
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.highlight,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  optionsContainer: {
    padding: 16,
  },
  optionCard: {
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
  contactSection: {
    padding: 24,
    backgroundColor: Colors.highlight,
    marginTop: 16,
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  contactInfo: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
});