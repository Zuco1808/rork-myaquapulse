import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ArrowLeft, Menu, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { useNotificationStore } from '@/store/notification-store';
import Colors from '@/constants/colors';

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  onLeftPress?: () => void;
  onMenuPress?: () => void;
  onNotificationsPress?: () => void;
  rightComponent?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showMenu = false,
  showNotifications = false,
  onLeftPress,
  onMenuPress,
  onNotificationsPress,
  rightComponent,
  leftIcon,
}) => {
  const router = useRouter();
  const { unreadCount } = useNotificationStore();
  
  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress();
    } else if (showBack) {
      router.back();
    } else if (showMenu) {
      handleMenuPress();
    }
  };
  
  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };
  
  const handleNotificationsPress = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
    } else {
      router.push('/notifications');
    }
  };
  
  return (
    <View style={[styles.header, Platform.OS === 'ios' && styles.iosHeader]}>
      <View style={styles.leftContainer}>
        {(showBack || showMenu) && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLeftPress}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            {leftIcon ? (
              leftIcon
            ) : showBack ? (
              <ArrowLeft size={24} color={Colors.text} />
            ) : (
              <Menu size={24} color={Colors.text} />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      
      <View style={styles.rightContainer}>
        {showNotifications && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNotificationsPress}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Bell size={24} color={Colors.text} />
            {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
          </TouchableOpacity>
        )}
        
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosHeader: {
    paddingTop: 44,
    height: 88,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  iconButton: {
    padding: 4,
  },
});