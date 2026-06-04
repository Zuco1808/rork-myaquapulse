import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Droplet,
  FileText,
  CreditCard,
  ClipboardList,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AppNotification } from '@/lib/api/notifications';

interface NotificationItemProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
}) => {
  const getIcon = () => {
    let IconComponent: any = Bell;
    let iconColor = Colors.info;

    switch (notification.type) {
      case 'warning': IconComponent = AlertTriangle; iconColor = Colors.warning; break;
      case 'error':   IconComponent = AlertCircle;   iconColor = Colors.error;   break;
      case 'success': IconComponent = CheckCircle;   iconColor = Colors.success; break;
      case 'info':
      default:        IconComponent = Info;          iconColor = Colors.info;    break;
    }

    // Override icon by related entity type
    if (notification.related_entity_type) {
      switch (notification.related_entity_type) {
        case 'meter':      IconComponent = Droplet;      break;
        case 'connection': IconComponent = Droplet;      break;
        case 'reading':    IconComponent = FileText;     break;
        case 'bill':       IconComponent = CreditCard;   break;
        case 'task':       IconComponent = ClipboardList; break;
      }
    }

    return <IconComponent size={24} color={iconColor} />;
  };

  const formatTime = (iso: string) => {
    const now = Date.now();
    const diff = Math.floor((now - new Date(iso).getTime()) / 1000);

    if (diff < 60)    return 'Upravo sada';
    if (diff < 3600)  { const m = Math.floor(diff / 60);    return `Prije ${m} ${m === 1 ? 'minutu' : m < 5 ? 'minute' : 'minuta'}`; }
    if (diff < 86400) { const h = Math.floor(diff / 3600);  return `Prije ${h} ${h === 1 ? 'sat' : h < 5 ? 'sata' : 'sati'}`; }
    const d = Math.floor(diff / 86400);
    return `Prije ${d} ${d === 1 ? 'dan' : 'dana'}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, notification.is_read ? styles.read : styles.unread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
        <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
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
  unread: { backgroundColor: Colors.highlight },
  read:   { backgroundColor: '#fff' },
  iconContainer: {
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  content: { flex: 1 },
  title:   { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  message: { fontSize: 13, color: Colors.textLight, marginBottom: 6, lineHeight: 18 },
  time:    { fontSize: 11, color: Colors.placeholder },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 8, alignSelf: 'center',
  },
});
