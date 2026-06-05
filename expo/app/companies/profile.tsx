import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  HeadphonesIcon,
  Camera,
} from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth-store';
import { getCompanyById, updateCompany } from '@/lib/api/companies';
import { mockCompanies } from '@/mocks/companies';
import Colors from '@/constants/colors';

export default function CompanyProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'super_admin' && user.role !== 'utility_admin') {
      router.replace('/(tabs)'); return;
    }
    const cid = (user as any).companyId || (user as any).company_id;
    if (cid) {
      setCompanyId(cid);
      loadCompany(cid);
    } else {
      // Fallback to first mock company for demo
      const mock = mockCompanies[0];
      if (mock) fillForm(mock);
      setIsLoading(false);
    }
  }, [user]);

  const loadCompany = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await getCompanyById(id);
      fillForm(data);
    } catch {
      // Fallback to mock
      const mock = mockCompanies.find(c => c.id === id) || mockCompanies[0];
      if (mock) fillForm(mock);
    } finally {
      setIsLoading(false);
    }
  };

  const fillForm = (data: any) => {
    setName(data.name || '');
    setAddress(data.address || '');
    setCity(data.city || '');
    setPostalCode(data.postalCode || data.postal_code || '');
    setCountry(data.country || 'Bosnia and Herzegovina');
    setPhone(data.phone || '');
    setEmail(data.email || '');
    setWebsite(data.website || '');
    setLogo(data.logo || '');
    setSupportEmail(data.supportEmail || data.support_email || '');
  };

  const validate = () => {
    let valid = true;
    if (!name.trim()) { setNameError('Naziv je obavezan'); valid = false; } else setNameError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) { setEmailError('Nevažeća email adresa'); valid = false; } else setEmailError('');
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (companyId) {
        await updateCompany(companyId, {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim(),
          logo: logo.trim(),
          support_email: supportEmail.trim(),
        });
      }
      if (Platform.OS === 'web') {
        alert('Profil kompanije je uspješno ažuriran.');
      } else {
        Alert.alert('Uspješno', 'Profil kompanije je uspješno ažuriran.');
      }
    } catch {
      Alert.alert('Greška', 'Nije moguće sačuvati promjene. Pokušajte ponovo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Header
        title="Profil kompanije"
        showBack
        showMenu
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Logo preview */}
        <Card style={styles.logoCard}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Building size={40} color={Colors.disabled} />
              <Text style={styles.logoPlaceholderText}>Nema logotipa</Text>
            </View>
          )}
          <Input
            label="URL logotipa"
            placeholder="https://example.com/logo.png"
            value={logo}
            onChangeText={setLogo}
            autoCapitalize="none"
            leftIcon={<Camera size={18} color={Colors.textLight} />}
            containerStyle={styles.logoInput}
          />
        </Card>

        {/* Basic info */}
        <Text style={styles.sectionTitle}>Osnovni podaci</Text>

        <Input
          label="Naziv kompanije *"
          placeholder="Vodovod d.o.o."
          value={name}
          onChangeText={setName}
          error={nameError}
          leftIcon={<Building size={18} color={Colors.textLight} />}
        />

        <Input
          label="Adresa"
          placeholder="Ulica i broj"
          value={address}
          onChangeText={setAddress}
          leftIcon={<MapPin size={18} color={Colors.textLight} />}
        />

        <View style={styles.row}>
          <View style={styles.flex2}>
            <Input
              label="Grad"
              placeholder="Sarajevo"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.gap} />
          <View style={styles.flex1}>
            <Input
              label="Poštanski broj"
              placeholder="71000"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Input
          label="Zemlja"
          placeholder="Bosnia and Herzegovina"
          value={country}
          onChangeText={setCountry}
          leftIcon={<Globe size={18} color={Colors.textLight} />}
        />

        {/* Contact */}
        <Text style={styles.sectionTitle}>Kontakt</Text>

        <Input
          label="Telefon"
          placeholder="033/123-456"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={18} color={Colors.textLight} />}
        />

        <Input
          label="Email"
          placeholder="info@kompanija.ba"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          leftIcon={<Mail size={18} color={Colors.textLight} />}
        />

        <Input
          label="Email za podršku"
          placeholder="podrska@kompanija.ba"
          value={supportEmail}
          onChangeText={setSupportEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<HeadphonesIcon size={18} color={Colors.textLight} />}
        />

        <Input
          label="Web stranica"
          placeholder="https://www.kompanija.ba"
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
          keyboardType="url"
          leftIcon={<Globe size={18} color={Colors.textLight} />}
        />

        <Button
          title="Sačuvaj promjene"
          onPress={handleSave}
          isLoading={isSaving}
          style={styles.saveBtn}
        />

        <Button
          title="Otkaži"
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelBtn}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  logoCard: {
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 80,
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 120,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  logoPlaceholderText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  logoInput: {
    width: '100%',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  gap: {
    width: 10,
  },
  saveBtn: {
    marginTop: 20,
  },
  cancelBtn: {
    marginTop: 10,
  },
});
