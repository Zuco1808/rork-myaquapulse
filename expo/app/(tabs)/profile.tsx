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
  Image
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
  Settings,
  HelpCircle,
  Building,
  Camera,
  X,
  Edit,
  ImageIcon
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [nameError, setNameError] = useState('');

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
          {
            text: 'Odjavi se',
            onPress: () => {
              logout();
              router.replace('/login');
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

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

  const handleEditProfile = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setAvatarUrl(user?.avatar_url || '');
    setShowEditModal(true);
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      setNameError('Ime je obavezno');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSaveProfile = () => {
    if (!validateForm()) return;

    updateUserProfile({
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
    });

    setShowEditModal(false);
    Alert.alert('Uspjeh', 'Profil je uspješno ažuriran.');
  };

  const handleTakePhoto = () => {
    Alert.alert('Funkcionalnost u razvoju', 'Ova funkcionalnost će biti dostupna uskoro.');
  };

  const handleChoosePhoto = () => {
    Alert.alert('Funkcionalnost u razvoju', 'Ova funkcionalnost će biti dostupna uskoro.');
  };

  const sampleAvatars = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=2',
    'https://i.pravatar.cc/150?img=3',
    'https://i.pravatar.cc/150?img=4',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=6',
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
          <Avatar
            source={user?.avatar_url}
            name={user?.full_name}
            size={80}
          />
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

      <Card style={styles.infoCard}>
        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Mail size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Phone size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Telefon</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Nije postavljen'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Shield size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Uloga</Text>
            <Text style={styles.infoValue}>{getRoleName()}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Postavke</Text>
      </View>

      <Card style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Bell size={20} color={Colors.text} />
            <Text style={styles.settingLabel}>Push notifikacije</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: Colors.disabled, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Mail size={20} color={Colors.text} />
            <Text style={styles.settingLabel}>Email notifikacije</Text>
          </View>
          <Switch
            value={emailNotificationsEnabled}
            onValueChange={setEmailNotificationsEnabled}
            trackColor={{ false: Colors.disabled, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Više opcija</Text>
      </View>

      <Card style={styles.optionsCard}>
        <TouchableOpacity
          style={styles.optionItem}
          onPress={() => navigateTo('/support')}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <HelpCircle size={20} color={Colors.text} />
            <Text style={styles.optionLabel}>Pomoć i podrška</Text>
          </View>
          <ChevronRight size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </Card>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>

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
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.avatarSection}>
                <Avatar
                  source={avatarUrl}
                  name={fullName}
                  size={80}
                />

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
                      style={[
                        styles.sampleAvatarButton,
                        avatarUrl === url && styles.selectedAvatarButton
                      ]}
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
                onChangeText={setFullName}
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
                <Button
                  title="Otkaži"
                  variant="outline"
                  onPress={() => setShowEditModal(false)}
                  style={styles.modalButton}
                />
                <Button
                  title="Sačuvaj"
                  onPress={handleSaveProfile}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  companyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 4,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoCard: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  settingsCard: {
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  optionsCard: {
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButtons: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 24,
  },
  avatarButton: {
    marginHorizontal: 8,
  },
  sampleAvatarsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  sampleAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sampleAvatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedAvatarButton: {
    borderColor: Colors.primary,
  },
  sampleAvatar: {
    width: '100%',
    height: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});