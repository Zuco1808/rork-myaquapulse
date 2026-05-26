import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  HelpCircle,
  Building,
  Camera,
  X,
  Edit,
  ImageIcon,
  Lock,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { registerPushToken, clearPushToken } from '@/lib/push-notifications';
import Colors from '@/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuthStore();

  // Push notifications — source of truth is push_token presence in DB
  const [pushEnabled,   setPushEnabled]   = useState<boolean>(!!user?.push_token);
  const [pushToggling,  setPushToggling]  = useState(false);

  // Email notifications — stored in profiles.email_notifications_enabled
  const [emailEnabled,  setEmailEnabled]  = useState<boolean>(
    user?.email_notifications_enabled !== false,
  );
  const [emailToggling, setEmailToggling] = useState(false);

  /* ── Edit profile modal ──────────────────────────────────────────────────── */
  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName]           = useState(user?.full_name || '');
  const [phone, setPhone]                 = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl]         = useState(user?.avatar_url || '');
  const [nameError, setNameError]         = useState('');
  const [isSaving, setIsSaving]           = useState(false);

  /* ── Password change modal ───────────────────────────────────────────────── */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword]             = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [passwordError, setPasswordError]         = useState('');
  const [confirmError, setConfirmError]           = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const getRoleName = () => {
    if (!user) return '';
    switch (user.role) {
      case 'super_admin':       return 'Super Administrator';
      case 'distributor_admin': return 'Administrator Distributera';
      case 'utility_admin':     return 'Administrator Vodovoda';
      case 'finance':           return 'Finansije';
      case 'worker':            return 'Radnik';
      case 'end_user':          return 'Korisnik';
      default:                  return user.role;
    }
  };

  /* ── Logout ──────────────────────────────────────────────────────────────── */
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      router.replace('/login');
    } else {
      Alert.alert(
        'Odjava',
        'Da li ste sigurni da se želite odjaviti?',
        [
          { text: 'Otkaži', style: 'cancel' },
          { text: 'Odjavi se', onPress: () => { logout(); router.replace('/login'); } },
        ],
        { cancelable: true },
      );
    }
  };

  /* ── Push notification toggle ───────────────────────────────────────────── */
  const handlePushToggle = async (value: boolean) => {
    setPushToggling(true);
    try {
      if (value) {
        const token = await registerPushToken();
        if (token) {
          await updateUserProfile({ push_token: token });
          setPushEnabled(true);
        } else {
          // Permission denied or simulator — inform user
          Alert.alert(
            'Dozvola odbijena',
            'Molimo dozvolite push notifikacije u postavkama uređaja pa pokušajte ponovo.',
            [{ text: 'U redu' }],
          );
        }
      } else {
        await clearPushToken();
        await updateUserProfile({ push_token: null });
        setPushEnabled(false);
      }
    } catch (err: any) {
      Alert.alert('Greška', err?.message || 'Promjena nije uspjela.');
    } finally {
      setPushToggling(false);
    }
  };

  /* ── Email notification toggle ───────────────────────────────────────────── */
  const handleEmailToggle = async (value: boolean) => {
    setEmailToggling(true);
    try {
      await updateUserProfile({ email_notifications_enabled: value });
      setEmailEnabled(value);
    } catch (err: any) {
      Alert.alert('Greška', err?.message || 'Promjena nije uspjela.');
    } finally {
      setEmailToggling(false);
    }
  };

  /* ── Edit profile ────────────────────────────────────────────────────────── */
  const handleEditProfile = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setAvatarUrl(user?.avatar_url || '');
    setNameError('');
    setShowEditModal(true);
  };

  const validateForm = () => {
    if (!fullName.trim()) { setNameError('Ime je obavezno'); return false; }
    setNameError('');
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      await updateUserProfile({ full_name: fullName, phone, avatar_url: avatarUrl });
      setShowEditModal(false);
      Alert.alert('Uspjeh', 'Profil je uspješno ažuriran.');
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Ažuriranje nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakePhoto  = () => Alert.alert('Funkcionalnost u razvoju', 'Ova funkcionalnost će biti dostupna uskoro.');
  const handleChoosePhoto = () => Alert.alert('Funkcionalnost u razvoju', 'Ova funkcionalnost će biti dostupna uskoro.');

  const sampleAvatars = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=2',
    'https://i.pravatar.cc/150?img=3',
    'https://i.pravatar.cc/150?img=4',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=6',
  ];

  /* ── Password change ─────────────────────────────────────────────────────── */
  const openPasswordModal = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setConfirmError('');
    setShowPasswordModal(true);
  };

  const validatePassword = () => {
    let ok = true;
    if (newPassword.length < 6) {
      setPasswordError('Lozinka mora imati najmanje 6 znakova');
      ok = false;
    } else {
      setPasswordError('');
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('Lozinke se ne podudaraju');
      ok = false;
    } else {
      setConfirmError('');
    }
    return ok;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false);
      Alert.alert('Uspjeh', 'Lozinka je uspješno promijenjena.');
    } catch (e: any) {
      Alert.alert('Greška', e?.message || 'Promjena lozinke nije uspjela.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ── Profile header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
          <Avatar source={user?.avatar_url} name={user?.full_name} size={80} />
          <View style={styles.editAvatarButton}>
            <Edit size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userRole}>{getRoleName()}</Text>
          {user?.utility_id && (
            <View style={styles.companyContainer}>
              <Building size={14} color={Colors.textLight} />
              <Text style={styles.companyName}>Vodovod</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Info card ── */}
      <Card style={styles.infoCard}>
        <View style={styles.infoItem}>
          <View style={styles.infoIcon}><Mail size={20} color={Colors.primary} /></View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}><Phone size={20} color={Colors.primary} /></View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Telefon</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Nije postavljen'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}><Shield size={20} color={Colors.primary} /></View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Uloga</Text>
            <Text style={styles.infoValue}>{getRoleName()}</Text>
          </View>
        </View>
      </Card>

      {/* ── Notification settings ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Postavke</Text>
      </View>

      <Card style={styles.settingsCard}>
        {/* Push notifications */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Bell size={20} color={Colors.text} />
            <View>
              <Text style={styles.settingLabel}>Push notifikacije</Text>
              {Platform.OS !== 'web' && (
                <Text style={styles.settingSubLabel}>
                  {pushEnabled ? 'Uključene' : 'Isključene'}
                </Text>
              )}
            </View>
          </View>
          {pushToggling ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              trackColor={{ false: Colors.disabled, true: Colors.primary }}
              thumbColor="#fff"
              disabled={Platform.OS === 'web'}
            />
          )}
        </View>

        <View style={styles.divider} />

        {/* Email notifications */}
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Mail size={20} color={Colors.text} />
            <View>
              <Text style={styles.settingLabel}>Email notifikacije</Text>
              <Text style={styles.settingSubLabel}>
                {emailEnabled ? 'Uključene' : 'Isključene'}
              </Text>
            </View>
          </View>
          {emailToggling ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={emailEnabled}
              onValueChange={handleEmailToggle}
              trackColor={{ false: Colors.disabled, true: Colors.primary }}
              thumbColor="#fff"
            />
          )}
        </View>
      </Card>

      {/* ── More options ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Više opcija</Text>
      </View>

      <Card style={styles.optionsCard}>
        <TouchableOpacity style={styles.optionItem} onPress={openPasswordModal} activeOpacity={0.7}>
          <View style={styles.optionLeft}>
            <Lock size={20} color={Colors.text} />
            <Text style={styles.optionLabel}>Promijeni lozinku</Text>
          </View>
          <ChevronRight size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.optionItem} onPress={() => router.push('/support' as any)} activeOpacity={0.7}>
          <View style={styles.optionLeft}>
            <HelpCircle size={20} color={Colors.text} />
            <Text style={styles.optionLabel}>Pomoć i podrška</Text>
          </View>
          <ChevronRight size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </Card>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>

      {/* ════ Edit Profile Modal ════ */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Uredi profil</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.avatarSection}>
                <Avatar source={avatarUrl} name={fullName} size={80} />

                <View style={styles.avatarButtons}>
                  <Button
                    title="Kamera"
                    variant="outline"
                    size="small"
                    leftIcon={<Camera size={16} color={Colors.primary} />}
                    onPress={handleTakePhoto}
                    style={styles.avatarButton}
                  />
                  <Button
                    title="Galerija"
                    variant="outline"
                    size="small"
                    leftIcon={<ImageIcon size={16} color={Colors.primary} />}
                    onPress={handleChoosePhoto}
                    style={styles.avatarButton}
                  />
                </View>

                <Text style={styles.sampleAvatarsTitle}>Odaberi avatar:</Text>
                <View style={styles.sampleAvatars}>
                  {sampleAvatars.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.sampleAvatarButton, avatarUrl === url && styles.selectedAvatarButton]}
                      onPress={() => setAvatarUrl(url)}
                    >
                      <Image source={{ uri: url }} style={styles.sampleAvatar} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Ime i prezime"
                placeholder="Unesite ime i prezime"
                value={fullName}
                onChangeText={(t) => { setFullName(t); if (nameError) setNameError(''); }}
                leftIcon={<User size={20} color={Colors.textLight} />}
                error={nameError}
              />

              <Input
                label="Telefon"
                placeholder="Unesite telefon"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={Colors.textLight} />}
              />

              <View style={styles.modalButtons}>
                <Button title="Otkaži" variant="outline" onPress={() => setShowEditModal(false)} style={styles.modalButton} />
                <Button title="Sačuvaj" onPress={handleSaveProfile} isLoading={isSaving} style={styles.modalButton} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════ Password Change Modal ════ */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Promijeni lozinku</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollView}>
              <Input
                label="Nova lozinka"
                placeholder="Najmanje 6 znakova"
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); if (passwordError) setPasswordError(''); }}
                secureTextEntry
                leftIcon={<Lock size={20} color={Colors.textLight} />}
                error={passwordError}
              />

              <Input
                label="Potvrdi novu lozinku"
                placeholder="Unesite lozinku ponovo"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (confirmError) setConfirmError(''); }}
                secureTextEntry
                leftIcon={<Lock size={20} color={Colors.textLight} />}
                error={confirmError}
              />

              <View style={styles.modalButtons}>
                <Button title="Otkaži" variant="outline" onPress={() => setShowPasswordModal(false)} style={styles.modalButton} />
                <Button title="Promijeni" onPress={handleChangePassword} isLoading={isChangingPassword} style={styles.modalButton} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  contentContainer: { padding: 16, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  userInfo:        { marginLeft: 16 },
  userName:        { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  userRole:        { fontSize: 14, color: Colors.textLight, marginBottom: 4 },
  companyContainer:{ flexDirection: 'row', alignItems: 'center' },
  companyName:     { fontSize: 14, color: Colors.textLight, marginLeft: 4 },
  editAvatarButton:{
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, width: 28, height: 28,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  infoCard:    { marginBottom: 24 },
  infoItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoIcon:    { width: 40, alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel:   { fontSize: 12, color: Colors.textLight, marginBottom: 4 },
  infoValue:   { fontSize: 16, color: Colors.text },
  divider:     { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  sectionHeader: { marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  settingsCard: { marginBottom: 24 },
  settingItem:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingLeft:  { flexDirection: 'row', alignItems: 'center' },
  settingLabel:    { fontSize: 16, color: Colors.text, marginLeft: 12 },
  settingSubLabel: { fontSize: 12, color: Colors.textLight, marginLeft: 12, marginTop: 2 },

  optionsCard: { marginBottom: 24 },
  optionItem:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  optionLeft:  { flexDirection: 'row', alignItems: 'center' },
  optionLabel: { fontSize: 16, color: Colors.text, marginLeft: 12 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
  logoutText:   { fontSize: 16, color: Colors.error, fontWeight: '500', marginLeft: 8 },

  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:    { backgroundColor: '#fff', borderRadius: 12, width: '90%', maxWidth: 500, maxHeight: '90%' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:      { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  closeButton:     { padding: 4 },
  modalScrollView: { padding: 16 },
  modalButtons:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 16 },
  modalButton:     { flex: 1, marginHorizontal: 8 },

  avatarSection:       { alignItems: 'center', marginBottom: 24 },
  avatarButtons:       { flexDirection: 'row', marginTop: 16, marginBottom: 24 },
  avatarButton:        { marginHorizontal: 8 },
  sampleAvatarsTitle:  { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 12 },
  sampleAvatars:       { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  sampleAvatarButton:  { width: 60, height: 60, borderRadius: 30, margin: 8, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  selectedAvatarButton:{ borderColor: Colors.primary },
  sampleAvatar:        { width: '100%', height: '100%' },
});
