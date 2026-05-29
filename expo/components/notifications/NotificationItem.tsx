import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Droplet,
  FileText,
  CreditCard,
  ClipboardList
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Notification } from '@/store/notification-store';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const getIcon = () => {
    // First determine by type
    let IconComponent;
    let iconColor;
    
    switch (notification.type) {
      case 'warning':
        IconComponent = AlertTriangle;
        iconColor = Colors.warning;
        break;
      case 'error':
        IconComponent = AlertCircle;
        iconColor = Colors.error;
        break;
      case 'success':
        IconComponent = CheckCircle;
        iconColor = Colors.success;
        break;
      case 'info':
      default:
        IconComponent = Info;
        iconColor = Colors.info;
    }
    
    // Then override by entity type if needed
    if (notification.relatedEntityType) {
      switch (notification.relatedEntityType) {
        case 'meter':
          IconComponent = Droplet;
          break;
        case 'reading':
          IconComponent = FileText;
          break;
        case 'bill':
          IconComponent = CreditCard;
          break;
        case 'task':
          IconComponent = ClipboardList;
          break;
      }
    }
    
    return <IconComponent size={24} color={iconColor} />;
  };
  
  const formatTime = (timestamp: number) => {
    const now = new Date();
    const notificationDate = new Date(timestamp);
    
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Upravo sada';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Prije ${minutes} ${minutes === 1 ? 'minutu' : minutes < 5 ? 'minute' : 'minuta'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Prije ${hours} ${hours === 1 ? 'sat' : hours < 5 ? 'sata' : 'sati'}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Prije ${days} ${days === 1 ? 'dan' : 'dana'}`;
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        notification.isRead ? styles.read : styles.unread
      ]} 
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.time}>
          {formatTime(notification.createdAt)}
        </Text>
      </View>
      {!notification.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unread: {
    backgroundColor: Colors.highlight,
  },
  read: {
    backgroundColor: '#fff',
  },
  iconContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: Colors.placeholder,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 8,
    alignSelf: 'center',
  },
});