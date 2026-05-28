import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Users, 
  Droplet, 
  MapPin, 
  CreditCard, 
  BarChart, 
  Bell, 
  ClipboardList,
  Settings,
  Building,
  Menu
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Drawer } from '@/components/layout/Drawer';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

const LOGO_URL = 'https://i.imgur.com/Ql4jQMl.png';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);
  
  const handleNavigate = (route: string) => {
    router.push(route as any);
  };
  
  // Define menu items based on user role
  const getMenuItems = () => {
    if (!user) return [];
    
    const commonItems = [
      {
        title: 'Računi',
        icon: <CreditCard size={24} color={Colors.primary} />,
        route: '/bills',
        description: 'Pregled i plaćanje računa',
      },
      {
        title: 'Potrošnja',
        icon: <BarChart size={24} color={Colors.primary} />,
        route: '/consumption',
        description: 'Analiza potrošnje vode',
      },
      {
        title: 'Obavještenja',
        icon: <Bell size={24} color={Colors.primary} />,
        route: '/notifications',
        description: 'Pregled obavještenja',
      },
      {
        title: 'Podrška',
        icon: <Settings size={24} color={Colors.primary} />,
        route: '/support',
        description: 'Kontakt i pomoć',
      },
    ];
    
    // Admin and superadmin see all menu items
    if (user.role === 'superadmin' || user.role === 'admin') {
      return [
        {
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Upravljanje korisnicima',
        },
        {
          title: 'Vodomjeri',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/meters',
          description: 'Upravljanje vodomjerima',
        },
        {
          title: 'Lokacije',
          icon: <MapPin size={24} color={Colors.primary} />,
          route: '/locations',
          description: 'Upravljanje lokacijama',
        },
        {
          title: 'Kompanije',
          icon: <Building size={24} color={Colors.primary} />,
          route: '/companies',
          description: 'Upravljanje kompanijama',
        },
        ...commonItems,
      ];
    }
    
    // Finance users see billing and reports filtered by permissions
    if (user.role === 'finance') {
      const items = [];
      if (user.permissions?.canManageBilling) {
        items.push({
          title: 'Računi',
          icon: <CreditCard size={24} color={Colors.primary} />,
          route: '/bills',
          description: 'Upravljanje računima',
        });
      }
      if (user.permissions?.canViewAllData) {
        items.push({
          title: 'Izvještaji',
          icon: <BarChart size={24} color={Colors.primary} />,
          route: '/reports',
          description: 'Finansijski izvještaji',
        });
      }
      if (user.permissions?.canManageUsers) {
        items.push({
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Pregled korisnika',
        });
      }
      if (user.permissions?.canSendNotifications) {
        items.push({
          title: 'Obavještenja',
          icon: <Bell size={24} color={Colors.primary} />,
          route: '/notifications/send',
          description: 'Slanje obavještenja',
        });
      }
      return items;
    }

    // Workers see tasks and readings filtered by permissions
    if (user.role === 'worker') {
      const items = [];
      if (user.permissions?.canManageTasks) {
        items.push({
          title: 'Zadaci',
          icon: <ClipboardList size={24} color={Colors.primary} />,
          route: '/tasks',
          description: 'Radni zadaci',
        });
      }
      if (user.permissions?.canReadMeters) {
        items.push({
          title: 'Očitanja',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/readings',
          description: 'Očitanje vodomjera',
        });
      }
      return [...items, ...commonItems];
    }

    // Maintenance users see tasks and meters filtered by permissions
    if (user.role === 'maintenance') {
      const items = [];
      if (user.permissions?.canManageTasks) {
        items.push({
          title: 'Zadaci',
          icon: <ClipboardList size={24} color={Colors.primary} />,
          route: '/tasks',
          description: 'Zadaci održavanja',
        });
      }
      if (user.permissions?.canReadMeters) {
        items.push({
          title: 'Vodomjeri',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/meters',
          description: 'Pregled vodomjera',
        });
      }
      return [...items, ...commonItems];
    }

    // Citizens see basic menu items filtered by permissions
    const citizenItems = [];
    if (user.permissions?.canManageBilling) {
      citizenItems.push({
        title: 'Računi',
        icon: <CreditCard size={24} color={Colors.primary} />,
        route: '/bills',
        description: 'Pregled i plaćanje računa',
      });
    }
    if (user.permissions?.canReadMeters) {
      citizenItems.push({
        title: 'Potrošnja',
        icon: <BarChart size={24} color={Colors.primary} />,
        route: '/consumption',
        description: 'Analiza potrošnje vode',
      });
    }
    citizenItems.push(
      {
        title: 'Obavještenja',
        icon: <Bell size={24} color={Colors.primary} />,
        route: '/notifications',
        description: 'Pregled obavještenja',
      },
      {
        title: 'Podrška',
        icon: <Settings size={24} color={Colors.primary} />,
        route: '/support',
        description: 'Kontakt i pomoć',
      }
    );
    return citizenItems;
  };
  
  const menuItems = getMenuItems();
  
  return (
    <View style={styles.container}>
      <Header 
        title="MyAquaPulse" 
        showMenu
        onLeftPress={() => setIsDrawerOpen(true)}
      />
      
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.welcomeSection}>
          <Image 
            source={{ uri: LOGO_URL }} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.welcomeText}>
            Dobrodošli, {user?.name || 'Korisniče'}!
          </Text>
          <Text style={styles.roleText}>
            {getRoleLabel(user?.role)}
          </Text>
        </View>
        
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <Card style={styles.menuCard}>
                <View style={styles.menuIconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        
        {user?.role === 'citizen' &&
          (user?.permissions?.canReadMeters || user?.permissions?.canReportIssues) && (
          <Card style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Brze akcije</Text>
            <View style={styles.quickActionsButtons}>
              {user?.permissions?.canReadMeters && (
                <Button
                  title="Očitaj vodomjer"
                  onPress={() => router.push('/readings' as any)}
                  style={styles.quickActionButton}
                />
              )}
              {user?.permissions?.canReportIssues && (
                <Button
                  title="Prijavi problem"
                  variant="outline"
                  onPress={() => router.push('/support/report-issue' as any)}
                  style={styles.quickActionButton}
                />
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

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
    case 'maintenance':
      return 'Održavanje';
    case 'citizen':
      return 'Građanin';
    default:
      return '';
  }
};

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2; // 2 columns with 16px padding on each side and 16px gap

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 100 : 80, // Extra padding for Android
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuItem: {
    width: itemWidth,
    marginBottom: 16,
  },
  menuCard: {
    padding: 16,
    height: 140,
    justifyContent: 'center',
  },
  menuIconContainer: {
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: Colors.textLight,
  },
  quickActionsCard: {
    padding: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  quickActionsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});