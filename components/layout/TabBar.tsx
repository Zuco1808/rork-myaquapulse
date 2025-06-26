import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Home, BarChart3, FileText, User, Settings } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBadge } from '../ui/NotificationBadge';
import { useNotificationStore } from '@/store/notification-store';

interface TabItem {
  key: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  path: string;
  roles: string[];
}

export const TabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  
  const tabs: TabItem[] = [
    {
      key: 'home',
      label: 'Početna',
      icon: (color) => <Home size={24} color={color} />,
      path: '/(tabs)',
      roles: ['superadmin', 'admin', 'finance', 'worker', 'citizen'],
    },
    {
      key: 'readings',
      label: 'Očitanja',
      icon: (color) => <FileText size={24} color={color} />,
      path: '/(tabs)/readings',
      roles: ['superadmin', 'admin', 'worker', 'citizen'],
    },
    {
      key: 'reports',
      label: 'Izvještaji',
      icon: (color) => <BarChart3 size={24} color={color} />,
      path: '/(tabs)/reports',
      roles: ['superadmin', 'admin', 'finance'],
    },
    {
      key: 'profile',
      label: 'Profil',
      icon: (color) => <User size={24} color={color} />,
      path: '/(tabs)/profile',
      roles: ['superadmin', 'admin', 'finance', 'worker', 'citizen'],
    },
  ];
  
  // Filter tabs based on user role
  const filteredTabs = tabs.filter(tab => 
    user && tab.roles.includes(user.role)
  );
  
  const handleTabPress = (path: string) => {
    router.push(path);
  };
  
  const isActive = (path: string) => {
    if (path === '/(tabs)' && pathname === '/(tabs)') {
      return true;
    }
    return pathname.startsWith(path);
  };
  
  return (
    <View style={styles.container}>
      {filteredTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => handleTabPress(tab.path)}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            {tab.icon(isActive(tab.path) ? Colors.primary : Colors.textLight)}
            {tab.key === 'profile' && unreadCount > 0 && (
              <NotificationBadge count={unreadCount} size="small" />
            )}
          </View>
          <Text
            style={[
              styles.label,
              isActive(tab.path) && styles.activeLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textLight,
  },
  activeLabel: {
    color: Colors.primary,
    fontWeight: '500',
  },
});