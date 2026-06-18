import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/colors';

const DEV_ACCOUNTS = __DEV__ ? [
  { role: 'Super Admin',    email: 'superadmin@aquapulse.com',   password: 'password' },
  { role: 'Utility Admin',  email: 'admin@vodovod.com',          password: 'password' },
  { role: 'Finansije',      email: 'finance@vodovod.com',        password: 'password' },
  { role: 'Radnik',         email: 'radnik@vodovod.com',         password: 'password' },
  { role: 'Održavanje',     email: 'odrzavanje@vodovod.com',     password: 'password' },
  { role: 'Građanin',       email: 'gradjanin@email.com',        password: 'password' },
] : [];

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user, mfaRequired, completeMfa, cancelMfa } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email je obavezan');
      return false;
    } else if (!emailRegex.test(value)) {
      setEmailError('Unesite validnu email adresu');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleLogin = async () => {
    clearError();
    if (validateEmail(email)) {
      await login(email, password);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const handleForgotPassword = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Email', 'Unesite email adresu u polje iznad, pa pritisnite ovaj link.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Email poslan', `Link za resetovanje lozinke je poslan na ${email}. Provjeri inbox.`);
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Nije moguće poslati email za reset.');
    } finally {
      setResetLoading(false);
    }
  };

  const loginWithDemoAccount = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    await login(demoEmail, demoPassword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>MyAquaPulse</Text>
          <Text style={styles.tagline}>Pametno upravljanje vodomjerima</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Prijava</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mfaRequired ? (
            <>
              <Text style={styles.mfaInfo}>
                Unesite 6-cifreni kod iz vaše authenticator aplikacije.
              </Text>
              <Input
                label="2FA kod"
                placeholder="123456"
                value={mfaCode}
                onChangeText={setMfaCode}
                keyboardType="number-pad"
                maxLength={6}
                leftIcon={<Lock size={20} color={Colors.textLight} />}
              />
              <Button
                title="Potvrdi"
                onPress={() => { clearError(); completeMfa(mfaCode); }}
                isLoading={isLoading}
                style={styles.loginButton}
              />
              <TouchableOpacity style={styles.forgotRow} onPress={() => { setMfaCode(''); cancelMfa(); }}>
                <Text style={styles.forgotText}>Odustani</Text>
              </TouchableOpacity>
            </>
          ) : (
          <>
          <Input
            label="Email adresa"
            placeholder="Unesite vašu email adresu"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            leftIcon={<Mail size={20} color={Colors.textLight} />}
          />

          <Input
            label="Lozinka"
            placeholder="Unesite vašu lozinku"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon={<Lock size={20} color={Colors.textLight} />}
          />

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={handleForgotPassword}
            disabled={resetLoading}
          >
            <Text style={styles.forgotText}>
              {resetLoading ? 'Slanje...' : 'Zaboravili ste lozinku?'}
            </Text>
          </TouchableOpacity>

          <Button
            title="Prijavi se"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Nemate račun?
            </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.registerLink}>Registrujte se</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Demo računi (samo development):</Text>
              <View style={styles.demoAccountsContainer}>
                {DEV_ACCOUNTS.map((account) => (
                  <TouchableOpacity
                    key={account.email}
                    style={styles.demoAccount}
                    onPress={() => loginWithDemoAccount(account.email, account.password)}
                  >
                    <Text style={styles.demoAccountRole}>{account.role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.primary },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  mfaInfo: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 14,
    lineHeight: 19,
  },
  loginButton: {
    marginTop: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  registerText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  demoContainer: {
    marginTop: 16,
  },
  demoTitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  demoAccountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  demoAccount: {
    backgroundColor: Colors.highlight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  demoAccountRole: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});
