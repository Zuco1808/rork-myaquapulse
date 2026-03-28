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
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Menu,
  Clock,
  Globe,
  MessageSquare
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function ContactScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form validation
  const [subjectError, setSubjectError] = useState('');
  const [messageError, setMessageError] = useState('');
  
  const validateSubject = () => {
    if (!subject.trim()) {
      setSubjectError('Predmet poruke je obavezan');
      return false;
    }
    setSubjectError('');
    return true;
  };
  
  const validateMessage = () => {
    if (!message.trim()) {
      setMessageError('Tekst poruke je obavezan');
      return false;
    }
    setMessageError('');
    return true;
  };
  
  const handleSubmit = async () => {
    const isSubjectValid = validateSubject();
    const isMessageValid = validateMessage();
    
    if (isSubjectValid && isMessageValid) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        
        // Show success message
        Alert.alert(
          'Uspjeh',
          'Vaša poruka je uspješno poslana. Odgovorit ćemo vam u najkraćem mogućem roku.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back() 
            }
          ]
        );
      }, 1500);
    }
  };
  
  const handleCall = () => {
    Linking.openURL('tel:+38733123456');
  };
  
  const handleEmail = () => {
    Linking.openURL('mailto:info@vodovod.ba');
  };
  
  const handleWebsite = () => {
    Linking.openURL('https://www.vodovod.ba');
  };
  
  const handleLocation = () => {
    Linking.openURL('https://maps.google.com/?q=Sarajevo,Zmaja+od+Bosne+8');
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header 
        title="Kontakt"
        showBack
        leftIcon={<Menu size={24} color={Colors.text} />}
        onLeftPress={() => router.push('/(tabs)')}
      />
      
      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt informacije</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleCall}
          >
            <Phone size={20} color={Colors.primary} />
            <Text style={styles.contactText}>+387 33 123 456</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleEmail}
          >
            <Mail size={20} color={Colors.primary} />
            <Text style={styles.contactText}>info@vodovod.ba</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleWebsite}
          >
            <Globe size={20} color={Colors.primary} />
            <Text style={styles.contactText}>www.vodovod.ba</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleLocation}
          >
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.contactText}>Zmaja od Bosne 8, Sarajevo</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.contactText}>Pon - Pet: 08:00 - 16:00</Text>
          </View>
        </Card>
        
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Pošaljite nam poruku</Text>
          
          <Input
            label="Predmet"
            placeholder="Unesite predmet poruke"
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (subjectError) validateSubject();
            }}
            error={subjectError}
          />
          
          <Input
            label="Poruka"
            placeholder="Unesite vašu poruku"
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (messageError) validateMessage();
            }}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
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
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});