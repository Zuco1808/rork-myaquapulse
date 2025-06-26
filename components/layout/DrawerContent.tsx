import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Users, 
  Building, 
  MapPin, 
  Droplet, 
  FileText, 
  Bell, 
  Settings,
  BarChart3,
  LogOut,
  Home,
  CreditCard,
  HelpCircle,
  AlertTriangle,
  ClipboardList,
  Database
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import Colors from '@/constants/colors';

// Logo URL from the provided image
const LOGO_URL = "https://i.imgur.com/Tn5JnZR.png";

interface DrawerContentProps {
  onClose: () => void;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({ onClose }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };
  
  const handleLogout = () => {
    logout();
    router.replace('/login');
    onClose();
  };
  
  const renderAdminMenu = () => {
    return (
      <>
        <MenuItem 
          icon={<Home size={20} color={Colors.primary} />}
          label="Početna"
          onPress={() => handleNavigation('/(tabs)')}
        />
        
        <MenuItem 
          icon={<Users size={20} color={Colors.primary} />}
          label="Korisnici"
          onPress={() => handleNavigation('/users')}
        />
        
        <MenuItem 
          icon={<Building size={20} color={Colors.primary} />}
          label="Kompanije"
          onPress={() => handleNavigation('/companies')}
        />
        
        <MenuItem 
          icon={<MapPin size={20} color={Colors.primary} />}
          label="Lokacije"
          onPress={() => handleNavigation('/locations')}
        />
        
        <MenuItem 
          icon={<Droplet size={20} color={Colors.primary} />}
          label="Vodomjeri"
          onPress={() => handleNavigation('/meters')}
        />
        
        <MenuItem 
          icon={<FileText size={20} color={Colors.primary} />}
          label="Očitanja"
          onPress={() => handleNavigation('/(tabs)/readings')}
        />
        
        <MenuItem 
          icon={<CreditCard size={20} color={Colors.primary} />}
          label="Računi"
          onPress={() => handleNavigation('/bills')}
        />
        
        <MenuItem 
          icon={<ClipboardList size={20} color={Colors.primary} />}
          label="Zadaci"
          onPress={() => handleNavigation('/tasks')}
        />
        
        <MenuItem 
          icon={<BarChart3 size={20} color={Colors.primary} />}
          label="Izvještaji"
          onPress={() => handleNavigation('/(tabs)/reports')}
        />
        
        <MenuItem 
          icon={<Bell size={20} color={Colors.primary} />}
          label="Obavještenja"
          onPress={() => handleNavigation('/notifications')}
        />
        
        <MenuItem 
          icon={<AlertTriangle size={20} color={Colors.primary} />}
          label="Upozorenja"
          onPress={() => handleNavigation('/alerts')}
        />
        
        {user?.role === 'admin' && (
          <MenuItem 
            icon={<Database size={20} color={Colors.primary} />}
            label="Backup podataka"
            onPress={() => handleNavigation('/backup')}
          />
        )}
        
        <MenuItem 
          icon={<Settings size={20} color={Colors.primary} />}
          label="Postavke"
          onPress={() => handleNavigation('/(tabs)/profile')}
        />
      </>
    );
  };
  
  const renderFinanceMenu = () => {
    return (
      <>
        <MenuItem 
          icon={<Home size={20} color={Colors.primary} />}
          label="Početna"
          onPress={() => handleNavigation('/(tabs)')}
        />
        
        <MenuItem 
          icon={<Users size={20} color={Colors.primary} />}
          label="Korisnici"
          onPress={() => handleNavigation('/users')}
        />
        
        <MenuItem 
          icon={<Droplet size={20} color={Colors.primary} />}
          label="Vodomjeri"
          onPress={() => handleNavigation('/meters')}
        />
        
        <MenuItem 
          icon={<FileText size={20} color={Colors.primary} />}
          label="Očitanja"
          onPress={() => handleNavigation('/(tabs)/readings')}
        />
        
        <MenuItem 
          icon={<CreditCard size={20} color={Colors.primary} />}
          label="Računi"
          onPress={() => handleNavigation('/bills')}
        />
        
        <MenuItem 
          icon={<ClipboardList size={20} color={Colors.primary} />}
          label="Zadaci"
          onPress={() => handleNavigation('/tasks')}
        />
        
        <MenuItem 
          icon={<BarChart3 size={20} color={Colors.primary} />}
          label="Izvještaji"
          onPress={() => handleNavigation('/(tabs)/reports')}
        />
        
        <MenuItem 
          icon={<Bell size={20} color={Colors.primary} />}
          label="Obavještenja"
          onPress={() => handleNavigation('/notifications')}
        />
        
        <MenuItem 
          icon={<Settings size={20} color={Colors.primary} />}
          label="Postavke"
          onPress={() => handleNavigation('/(tabs)/profile')}
        />
      </>
    );
  };
  
  const renderWorkerMenu = () => {
    return (
      <>
        <MenuItem 
          icon={<Home size={20} color={Colors.primary} />}
          label="Početna"
          onPress={() => handleNavigation('/(tabs)')}
        />
        
        <MenuItem 
          icon={<FileText size={20} color={Colors.primary} />}
          label="Očitanja"
          onPress={() => handleNavigation('/(tabs)/readings')}
        />
        
        <MenuItem 
          icon={<ClipboardList size={20} color={Colors.primary} />}
          label="Zadaci"
          onPress={() => handleNavigation('/tasks')}
        />
        
        <MenuItem 
          icon={<MapPin size={20} color={Colors.primary} />}
          label="Lokacije"
          onPress={() => handleNavigation('/locations')}
        />
        
        <MenuItem 
          icon={<Droplet size={20} color={Colors.primary} />}
          label="Vodomjeri"
          onPress={() => handleNavigation('/meters')}
        />
        
        <MenuItem 
          icon={<Bell size={20} color={Colors.primary} />}
          label="Obavještenja"
          onPress={() => handleNavigation('/notifications')}
        />
        
        <MenuItem 
          icon={<AlertTriangle size={20} color={Colors.primary} />}
          label="Prijavi kvar"
          onPress={() => handleNavigation('/support/report-issue')}
        />
        
        <MenuItem 
          icon={<HelpCircle size={20} color={Colors.primary} />}
          label="Podrška"
          onPress={() => handleNavigation('/support')}
        />
        
        <MenuItem 
          icon={<Settings size={20} color={Colors.primary} />}
          label="Postavke"
          onPress={() => handleNavigation('/(tabs)/profile')}
        />
      </>
    );
  };
  
  const renderCitizenMenu = () => {
    return (
      <>
        <MenuItem 
          icon={<Home size={20} color={Colors.primary} />}
          label="Početna"
          onPress={() => handleNavigation('/(tabs)')}
        />
        
        <MenuItem 
          icon={<Droplet size={20} color={Colors.primary} />}
          label="Vodomjeri"
          onPress={() => handleNavigation('/meters')}
        />
        
        {user?.permissions?.canReadMeters && (
          <MenuItem 
            icon={<FileText size={20} color={Colors.primary} />}
            label="Očitanja"
            onPress={() => handleNavigation('/(tabs)/readings')}
          />
        )}
        
        <MenuItem 
          icon={<CreditCard size={20} color={Colors.primary} />}
          label="Računi"
          onPress={() => handleNavigation('/bills')}
        />
        
        <MenuItem 
          icon={<BarChart3 size={20} color={Colors.primary} />}
          label="Potrošnja"
          onPress={() => handleNavigation('/consumption')}
        />
        
        <MenuItem 
          icon={<Bell size={20} color={Colors.primary} />}
          label="Obavještenja"
          onPress={() => handleNavigation('/notifications')}
        />
        
        <MenuItem 
          icon={<AlertTriangle size={20} color={Colors.primary} />}
          label="Prijavi kvar"
          onPress={() => handleNavigation('/support/report-issue')}
        />
        
        <MenuItem 
          icon={<HelpCircle size={20} color={Colors.primary} />}
          label="Podrška"
          onPress={() => handleNavigation('/support')}
        />
        
        <MenuItem 
          icon={<Settings size={20} color={Colors.primary} />}
          label="Postavke"
          onPress={() => handleNavigation('/(tabs)/profile')}
        />
      </>
    );
  };
  
  const renderMenu = () => {
    if (!user) return null;
    
    if (user.role === 'superadmin' || user.role === 'admin') {
      return renderAdminMenu();
    } else if (user.role === 'finance') {
      return renderFinanceMenu();
    } else if (user.role === 'worker') {
      return renderWorkerMenu();
    } else {
      return renderCitizenMenu();
    }
  };
  
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Administrator';
      case 'admin':
        return 'Administrator';
      case 'finance':
        return 'Finansije';
      case 'worker':
        return 'Radnik';
      case 'citizen':
        return 'Građanin';
      default:
        return '';
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: LOGO_URL }} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <Text style={styles.appName}>MyAquaPulse</Text>
      </View>
      
      <View style={styles.userInfo}>
        <TouchableOpacity 
          onPress={() => handleNavigation('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Avatar 
            source={user?.avatar} 
            name={user?.name || 'User'} 
            size={60} 
          />
        </TouchableOpacity>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{getRoleLabel(user?.role)}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.menuContainer}>
        {renderMenu()}
      </ScrollView>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={Colors.error} style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Odjava</Text>
      </TouchableOpacity>
    </View>
  );
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress }) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={styles.menuItemLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textLight,
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemIcon: {
    width: 24,
    marginRight: 16,
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  logoutIcon: {
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
  },
});