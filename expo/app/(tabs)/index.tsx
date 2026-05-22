// app/(tabs)/index.tsx
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

    if (user.role === 'super_admin') {
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
          title: 'Vodovodi',
          icon: <Building size={24} color={Colors.primary} />,
          route: '/companies',
          description: 'Upravljanje vodovodima',
        },
        ...commonItems,
      ];
    }

    if (user.role === 'distributor_admin') {
      return [
        {
          title: 'Vodovodi',
          icon: <Building size={24} color={Colors.primary} />,
          route: '/companies',
          description: 'Pregled vodovoda',
        },
        {
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Pregled korisnika',
        },
        {
          title: 'Izvještaji',
          icon: <BarChart size={24} color={Colors.primary} />,
          route: '/reports',
          description: 'Izvještaji distributera',
        },
      ];
    }

    if (user.role === 'utility_admin') {
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
        ...commonItems,
      ];
    }

    if (user.role === 'finance') {
      return [
        {
          title: 'Računi',
          icon: <CreditCard size={24} color={Colors.primary} />,
          route: '/bills',
          description: 'Upravljanje računima',
        },
        {
          title: 'Izvještaji',
          icon: <BarChart size={24} color={Colors.primary} />,
          route: '/reports',
          description: 'Finansijski izvještaji',
        },
        {
          title: 'Korisnici',
          icon: <Users size={24} color={Colors.primary} />,
          route: '/users',
          description: 'Pregled korisnika',
        },
        {
          title: 'Obavještenja',
          icon: <Bell size={24} color={Colors.primary} />,
          route: '/notifications/send',
          description: 'Slanje obavještenja',
        },
      ];
    }

    if (user.role === 'worker') {
      return [
        {
          title: 'Zadaci',
          icon: <ClipboardList size={24} color={Colors.primary} />,
          route: '/tasks',
          description: 'Radni zadaci',
        },
        {
          title: 'Očitanja',
          icon: <Droplet size={24} color={Colors.primary} />,
          route: '/readings',
          description: 'Očitanje vodomjera',
        },
        ...commonItems,
      ];
    }

    // end_user
    return commonItems;
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
            Dobrodošli, {user?.full_name || 'Korisniku'}!
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

        {user?.role === 'end_user' && (
          <Card style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Brze akcije</Text>
            <View style={styles.quickActionsButtons}>
              <Button
                title="Očitaj vodomjer"
                onPress={() => router.push('/readings' as any)}
                style={styles.quickActionButton}
              />
              <Button
                title="Prijavi problem"
                variant="outline"
                onPress={() => router.push('/support/report-issue' as any)}
                style={styles.quickActionButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'super_admin':       return 'Super Administrator';
    case 'distributor_admin': return 'Administrator Distributera';
    case 'utility_admin':     return 'Administrator Vodovoda';
    case 'finance':           return 'Finansije';
    case 'worker':            return 'Radnik';
    case 'end_user':          return 'Korisnik';
    default:                  return '';
  }
};

const { width } = Dimensions.get('window');
const itemWidth = (width - 48) / 2;

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
    paddingBottom: Platform.OS === 'android' ? 100 : 80,
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