import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Bell, Menu } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Drawer } from '@/components/layout/Drawer';
import { TabBar } from '@/components/layout/TabBar';
import Colors from '@/constants/colors';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { fetchNotifications, unreadCount } = useNotificationStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      router.replace('/login');
    } else {
      // Fetch notifications
      fetchNotifications();
    }
  }, [user, router, fetchNotifications]);
  
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  
  const handleNotificationPress = () => {
    router.push('/notifications');
  };
  
  // Get screen title based on pathname
  const getScreenTitle = () => {
    if (pathname === '/(tabs)') return 'Početna';
    if (pathname === '/(tabs)/readings') return 'Očitanja';
    if (pathname === '/(tabs)/reports') return 'Izvještaji';
    if (pathname === '/(tabs)/profile') return 'Profil';
    return 'MyAquaPulse';
  };
  
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: getScreenTitle(),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: 'bold',
          },
          headerLeft: () => (
            <Pressable
              onPress={toggleDrawer}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                padding: 8,
                marginLeft: 8,
              })}
            >
              <Menu size={24} color={Colors.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleNotificationPress}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                padding: 8,
                marginRight: 8,
                position: 'relative',
              })}
            >
              <Bell size={24} color={Colors.text} />
              <NotificationBadge count={unreadCount} />
            </Pressable>
          ),
          tabBarStyle: {
            display: 'none', // Hide the default tab bar
          },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="readings" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="profile" />
      </Tabs>
      
      {/* Custom Tab Bar */}
      {Platform.OS !== 'web' && <TabBar />}
      
      {/* Drawer */}
      {isDrawerOpen && <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />}
    </>
  );
}