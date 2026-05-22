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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError, user } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  
  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);
  
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email je obavezan');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Unesite validnu email adresu');
      return false;
    }
    
    setEmailError('');
    return true;
  };
  
  const handleLogin = async () => {
    clearError();
    
    const isEmailValid = validateEmail(email);
    
    if (isEmailValid) {
      await login(email, password);
    }
  };
  
  const handleRegister = () => {
    router.push('/register');
  };
  
  // Demo accounts for quick login
  const demoAccounts = [
    { role: 'super_admin', email: 'superadmin@aquapulse.com', password: 'password' },
    { role: 'utility_admin', email: 'admin@vodovod.com', password: 'password' },
    { role: 'finance', email: 'finance@vodovod.com', password: 'password' },
    { role: 'worker', email: 'radnik@vodovod.com', password: 'password' },
    { role: 'end_user', email: 'gradjanin@email.com', password: 'password' },
    { role: 'worker', email: 'odrzavanje@vodovod.com', password: 'password' }
  ];
  
  const loginWithDemoAccount = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    await login(demoEmail, demoPassword);
  };
  
  return (
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
              source={{ uri: 'https://i.imgur.com/JQdxX9Z.png' }}
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
          
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo računi za brzu prijavu:</Text>
            
            <View style={styles.demoAccountsContainer}>
              {demoAccounts.map((account) => (
                <TouchableOpacity
                  key={account.role}
                  style={styles.demoAccount}
                  onPress={() => loginWithDemoAccount(account.email, account.password)}
                >
                  <Text style={styles.demoAccountRole}>
                    {account.role === 'super_admin' ? 'Super Admin' :
                     account.role === 'utility_admin' ? 'utility_admin' :
                     account.role === 'finance' ? 'Finansije' :
                     account.role === 'worker' ? 'Radnik' :
                     account.role === 'worker' ? 'Održavanje' :
                     'Građanin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
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