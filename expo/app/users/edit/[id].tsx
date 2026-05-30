import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  User as UserIcon,
  Mail,
  Lock,
  Building,
  Phone,
  MapPin,
} from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import { User, UserRole, canManageUser, getDefaultPermissions } from '@/types/user';
import { getUserById, updateUser } from '@/lib/api/users';
import { useCompanies } from '@/lib/hooks/useCompanies';
import Colors from '@/constants/colors';

type PermissionState = {
  can_read_meters: boolean;
  can_report_issues: boolean;
  can_manage_tasks: boolean;
  can_edit_readings: boolean;
  can_send_notifications: boolean;
  can_view_all_data: boolean;
  can_manage_users: boolean;
  can_manage_companies: boolean;
  can_manage_billing: boolean;
  can_backup_data: boolean;
};

const permissionsToState = (perms: ReturnType<typeof getDefaultPermissions>): PermissionState => ({
  can_read_meters: perms.canReadMeters,
  can_report_issues: perms.canReportIssues,
  can_manage_tasks: perms.canManageTasks,
  can_edit_readings: perms.canEditReadings,
  can_send_notifications: perms.canSendNotifications,
  can_view_all_data: perms.canViewAllData,
  can_manage_users: perms.canManageUsers,
  can_manage_companies: perms.canManageCompanies,
  can_manage_billing: perms.canManageBilling,
  can_backup_data: perms.canBackupData,
});

const getMenuPermissionItems = (userRole: UserRole): { key: keyof PermissionState; label: string }[] => {
  switch (userRole) {
    case 'finance':
      return [
        { key: 'can_read_meters', label: 'Vodomjeri i Očitanja' },
        { key: 'can_manage_billing', label: 'Računi' },
        { key: 'can_manage_tasks', label: 'Zadaci' },
        { key: 'can_view_all_data', label: 'Izvještaji' },
        { key: 'can_send_notifications', label: 'Obavještenja' },
        { key: 'can_manage_users', label: 'Korisnici' },
      ];
    case 'worker':
      return [
        { key: 'can_read_meters', label: 'Vodomjeri i Očitanja' },
        { key: 'can_manage_tasks', label: 'Zadaci' },
        { key: 'can_send_notifications', label: 'Obavještenja' },
        { key: 'can_report_issues', label: 'Prijavi kvar' },
      ];
    case 'maintenance':
      return [
        { key: 'can_read_meters', label: 'Vodomjeri' },
        { key: 'can_manage_tasks', label: 'Zadaci' },
        { key: 'can_send_notifications', label: 'Obavještenja' },
        { key: 'can_report_issues', label: 'Prijavi kvar' },
      ];
    case 'citizen':
      return [
        { key: 'can_read_meters', label: 'Vodomjeri i Očitanja' },
        { key: 'can_manage_billing', label: 'Računi' },
        { key: 'can_report_issues', label: 'Prijavi kvar' },
      ];
    default:
      return [];
  }
};

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const { companies } = useCompanies();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [permissions, setPermissions] = useState<PermissionState>(
    permissionsToState(getDefaultPermissions('citizen'))
  );

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    if (id) {
      loadUser(id);
    }
  }, [id]);

  const loadUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const profile = await getUserById(userId);

      if (profile) {
        const mappedUser: User = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as UserRole,
          phone: profile.phone || undefined,
          address: profile.address || undefined,
          avatar: profile.avatar || undefined,
          companyId: profile.company_id || undefined,
          isActive: profile.is_active,
          createdAt: profile.created_at ? new Date(profile.created_at).getTime() : Date.now(),
          permissions: {
            canReadMeters: profile.can_read_meters ?? false,
            canReportIssues: profile.can_report_issues ?? false,
            canManageTasks: profile.can_manage_tasks ?? false,
            canEditReadings: profile.can_edit_readings ?? false,
            canSendNotifications: profile.can_send_notifications ?? false,
            canViewAllData: profile.can_view_all_data ?? false,
            canManageUsers: profile.can_manage_users ?? false,
            canManageCompanies: profile.can_manage_companies ?? false,
            canManageBilling: profile.can_manage_billing ?? false,
            canBackupData: profile.can_backup_data ?? false,
          },
        };

        setUser(mappedUser);
        setName(profile.name);
        setEmail(profile.email);
        setPhone(profile.phone || '');
        setAddress(profile.address || '');
        setRole(profile.role as UserRole);
        setCompanyId(profile.company_id || undefined);
        setPermissions({
          can_read_meters: profile.can_read_meters ?? false,
          can_report_issues: profile.can_report_issues ?? false,
          can_manage_tasks: profile.can_manage_tasks ?? false,
          can_edit_readings: profile.can_edit_readings ?? false,
          can_send_notifications: profile.can_send_notifications ?? false,
          can_view_all_data: profile.can_view_all_data ?? false,
          can_manage_users: profile.can_manage_users ?? false,
          can_manage_companies: profile.can_manage_companies ?? false,
          can_manage_billing: profile.can_manage_billing ?? false,
          can_backup_data: profile.can_backup_data ?? false,
        });
      }
    } catch {
      // user not found
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (user && newRole !== user.role) {
      setPermissions(permissionsToState(getDefaultPermissions(newRole)));
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (!currentUser || !user) return ['citizen'];
    if (currentUser.id === user.id) return [user.role];

    switch (currentUser.role) {
      case 'superadmin':
        return ['superadmin', 'admin', 'finance', 'worker', 'maintenance', 'citizen'];
      case 'admin':
        return ['finance', 'worker', 'maintenance', 'citizen'];
      default:
        return ['citizen'];
    }
  };

  const validateForm = () => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Ime je obavezno');
      isValid = false;
    } else {
      setNameError('');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email je obavezan');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Unesite validnu email adresu');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (password) {
      if (password.length < 6) {
        setPasswordError('Lozinka mora imati najmanje 6 karaktera');
        isValid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError('Lozinke se ne podudaraju');
        isValid = false;
      } else {
        setPasswordError('');
        setConfirmPasswordError('');
      }
    } else {
      setPasswordError('');
      setConfirmPasswordError('');
    }

    if (!role) {
      setRoleError('Uloga je obavezna');
      isValid = false;
    } else {
      setRoleError('');
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;
    setIsSubmitting(true);

    try {
      await updateUser(user.id, {
        name: name.trim(),
        role,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        can_read_meters: permissions.can_read_meters,
        can_report_issues: permissions.can_report_issues,
        can_manage_tasks: permissions.can_manage_tasks,
        can_edit_readings: permissions.can_edit_readings,
        can_send_notifications: permissions.can_send_notifications,
        can_view_all_data: permissions.can_view_all_data,
        can_manage_users: permissions.can_manage_users,
        can_manage_companies: permissions.can_manage_companies,
        can_manage_billing: permissions.can_manage_billing,
        can_backup_data: permissions.can_backup_data,
      });

      if (Platform.OS === 'web') {
        alert('Korisnik je uspješno ažuriran.');
        router.back();
      } else {
        Alert.alert(
          'Uspješno',
          'Korisnik je uspješno ažuriran.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch {
      Alert.alert('Greška', 'Došlo je do greške pri ažuriranju korisnika.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (userRole: UserRole): string => {
    switch (userRole) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'finance': return 'Finansije';
      case 'worker': return 'Radnik';
      case 'maintenance': return 'Održavanje';
      case 'citizen': return 'Građanin';
      default: return userRole;
    }
  };

  const canEdit = () => {
    if (!currentUser || !user) return false;
    if (currentUser.id === user.id) return true;
    return canManageUser(currentUser as any, user as any);
  };

  const showPermissionSection = () => {
    if (!currentUser || !user) return false;
    if (currentUser.id === user.id) return false;
    if (role === 'admin' || role === 'superadmin') return false;
    return currentUser.role === 'admin' || currentUser.role === 'superadmin';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Učitavanje korisnika...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.noAccessContainer}>
        <Text style={styles.noAccessText}>Korisnik nije pronađen.</Text>
        <Button title="Nazad" onPress={() => router.back()} style={styles.noAccessButton} />
      </View>
    );
  }

  if (!canEdit()) {
    return (
      <>
        <Header title="Uredi korisnika" showBack={true} onLeftPress={() => router.back()} />
        <View style={styles.noAccessContainer}>
          <Text style={styles.noAccessText}>Nemate dozvolu za uređivanje ovog korisnika.</Text>
          <Button title="Nazad" onPress={() => router.back()} style={styles.noAccessButton} />
        </View>
      </>
    );
  }

  return (
    <>
      <Header
        title="Uredi korisnika"
        showBack={true}
        showMenu={true}
        onLeftPress={() => router.back()}
        onMenuPress={() => setIsDrawerOpen(true)}
      />

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Uredite podatke korisnika. Obavezna polja su označena sa *.
        </Text>

        <Input
          label="Ime i prezime *"
          placeholder="Unesite ime i prezime"
          value={name}
          onChangeText={setName}
          error={nameError}
          leftIcon={<UserIcon size={20} color={Colors.textLight} />}
        />

        <Input
          label="Email adresa *"
          placeholder="Unesite email adresu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          leftIcon={<Mail size={20} color={Colors.textLight} />}
        />

        <Input
          label="Nova lozinka (ostavite prazno ako ne mijenjate)"
          placeholder="Unesite novu lozinku"
          value={password}
          onChangeText={setPassword}
          isPassword
          error={passwordError}
          leftIcon={<Lock size={20} color={Colors.textLight} />}
        />

        <Input
          label="Potvrda nove lozinke"
          placeholder="Potvrdite novu lozinku"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          isPassword
          error={confirmPasswordError}
          leftIcon={<Lock size={20} color={Colors.textLight} />}
        />

        <Input
          label="Broj telefona"
          placeholder="Unesite broj telefona"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={20} color={Colors.textLight} />}
        />

        <Input
          label="Adresa"
          placeholder="Unesite adresu"
          value={address}
          onChangeText={setAddress}
          leftIcon={<MapPin size={20} color={Colors.textLight} />}
        />

        <Text style={styles.sectionTitle}>Uloga korisnika *</Text>
        {roleError ? <Text style={styles.errorText}>{roleError}</Text> : null}

        <View style={styles.roleButtons}>
          {getAvailableRoles().map((userRole) => (
            <TouchableOpacity
              key={userRole}
              style={[
                styles.roleButton,
                role === userRole && styles.roleButtonActive
              ]}
              onPress={() => handleRoleChange(userRole)}
              disabled={currentUser?.id === user.id}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === userRole && styles.roleButtonTextActive,
                  currentUser?.id === user.id && styles.disabledText
                ]}
              >
                {getRoleLabel(userRole)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(role === 'admin' || role === 'finance' || role === 'worker') && (
          <>
            <Text style={styles.sectionTitle}>Kompanija</Text>
            <View style={styles.companyButtons}>
              {companies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.companyButton,
                    companyId === company.id && styles.companyButtonActive
                  ]}
                  onPress={() => setCompanyId(company.id)}
                >
                  <Building
                    size={16}
                    color={companyId === company.id ? Colors.primary : Colors.textLight}
                    style={styles.companyIcon}
                  />
                  <Text
                    style={[
                      styles.companyButtonText,
                      companyId === company.id && styles.companyButtonTextActive
                    ]}
                  >
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {showPermissionSection() && (
          <>
            <Text style={styles.sectionTitle}>Pristup menijima</Text>
            <Text style={styles.sectionDescription}>
              Odaberite kojim menijima korisnik ima pristup
            </Text>
            {getMenuPermissionItems(role).map((item) => (
              <View key={item.key} style={styles.permissionRow}>
                <Text style={styles.permissionLabel}>{item.label}</Text>
                <Switch
                  value={permissions[item.key]}
                  onValueChange={(value) =>
                    setPermissions((prev) => ({ ...prev, [item.key]: value }))
                  }
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Otkaži"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />

          <Button
            title="Sačuvaj"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 8,
    marginTop: -4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginBottom: 8,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.5,
  },
  companyButtons: {
    marginBottom: 24,
  },
  companyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  companyButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  companyIcon: {
    marginRight: 8,
  },
  companyButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  companyButtonTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permissionLabel: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  noAccessText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  noAccessButton: {
    width: 200,
  },
});
