import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError]                   = useState('');
  const [emailError, setEmailError]                 = useState('');
  const [phoneError, setPhoneError]                 = useState('');
  const [passwordError, setPasswordError]           = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  /* ── Validation ────────────────────────────────── */
  const validateName = () => {
    if (!name.trim()) { setNameError('Ime i prezime su obavezni'); return false; }
    setNameError(''); return true;
  };

  const validateEmail = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email)        { setEmailError('Email je obavezan');              return false; }
    if (!re.test(email)) { setEmailError('Unesite validnu email adresu'); return false; }
    setEmailError(''); return true;
  };

  const validatePhone = () => {
    const re = /^[0-9+\s()-]{9,15}$/;
    if (!phone)          { setPhoneError('Telefon je obavezan');           return false; }
    if (!re.test(phone)) { setPhoneError('Unesite validan broj telefona'); return false; }
    setPhoneError(''); return true;
  };

  const validatePassword = () => {
    if (!password)           { setPasswordError('Lozinka je obavezna');               return false; }
    if (password.length < 6) { setPasswordError('Lozinka mora imati najmanje 6 karaktera'); return false; }
    setPasswordError(''); return true;
  };

  const validateConfirmPassword = () => {
    if (!confirmPassword)         { setConfirmPasswordError('Potvrdite lozinku');         return false; }
    if (confirmPassword !== password) { setConfirmPasswordError('Lozinke se ne podudaraju'); return false; }
    setConfirmPasswordError(''); return true;
  };

  /* ── Submit ─────────────────────────────────────── */
  const handleRegister = async () => {
    // Call every validator so ALL error messages appear at once (no short-circuit)
    const v1 = validateName();
    const v2 = validateEmail();
    const v3 = validatePhone();
    const v4 = validatePassword();
    const v5 = validateConfirmPassword();

    if (!(v1 && v2 && v3 && v4 && v5)) return;

    setIsLoading(true);
    try {
      // 1. Create auth user
      const { data, error } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options:  { data: { full_name: name.trim(), phone: phone.trim() } },
      });

      if (error) throw error;

      // 2. If DB trigger doesn't auto-create profile, upsert manually
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:        data.user.id,
          full_name: name.trim(),
          email:     email.trim().toLowerCase(),
          phone:     phone.trim(),
          role:      'end_user',
          is_active: true,
        }, { onConflict: 'id', ignoreDuplicates: true });
      }

      Alert.alert(
        'Registracija uspješna',
        'Vaš račun je kreiran. Prijavite se sa svojom email adresom i lozinkom.',
        [{ text: 'Prijava', onPress: () => router.replace('/login') }],
      );
    } catch (e: any) {
      const msg = e?.message?.includes('already registered')
        ? 'Korisnik s ovom email adresom već postoji.'
        : e?.message || 'Registracija nije uspjela. Pokušajte ponovo.';
      Alert.alert('Greška', msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Render ──────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Registracija</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>
            Kreirajte korisnički račun za pristup aplikaciji
          </Text>

          <Input
            label="Ime i prezime"
            placeholder="Unesite vaše ime i prezime"
            value={name}
            onChangeText={(t) => { setName(t); if (nameError) validateName(); }}
            error={nameError}
            leftIcon={<User size={20} color={Colors.textLight} />}
          />

          <Input
            label="Email adresa"
            placeholder="Unesite vašu email adresu"
            value={email}
            onChangeText={(t) => { setEmail(t); if (emailError) validateEmail(); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            leftIcon={<Mail size={20} color={Colors.textLight} />}
          />

          <Input
            label="Broj telefona"
            placeholder="Unesite vaš broj telefona"
            value={phone}
            onChangeText={(t) => { setPhone(t); if (phoneError) validatePhone(); }}
            keyboardType="phone-pad"
            error={phoneError}
            leftIcon={<Phone size={20} color={Colors.textLight} />}
          />

          <Input
            label="Lozinka"
            placeholder="Najmanje 6 znakova"
            value={password}
            onChangeText={(t) => { setPassword(t); if (passwordError) validatePassword(); }}
            isPassword
            error={passwordError}
            leftIcon={<Lock size={20} color={Colors.textLight} />}
          />

          <Input
            label="Potvrda lozinke"
            placeholder="Ponovite lozinku"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); if (confirmPasswordError) validateConfirmPassword(); }}
            isPassword
            error={confirmPasswordError}
            leftIcon={<Lock size={20} color={Colors.textLight} />}
          />

          <Button
            title="Registruj se"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Već imate račun? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Prijavite se</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  backButton:  { padding: 8 },
  placeholder: { width: 40 },
  title:       { fontSize: 24, fontWeight: 'bold', color: Colors.text },

  formContainer: { flex: 1 },
  subtitle: { fontSize: 16, color: Colors.textLight, marginBottom: 24 },

  registerButton: { marginTop: 8 },

  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText:  { fontSize: 14, color: Colors.textLight },
  loginLink:  { fontSize: 14, color: Colors.primary, fontWeight: 'bold' },
});
