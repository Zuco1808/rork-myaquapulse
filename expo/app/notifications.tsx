import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Plus, Send } from 'lucide-react-native';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotificationStore } from '@/store/notification-store';
import { Notification } from '@/mocks/notifications';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
    setRefreshing(false);
  };
  
  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.relatedEntityType && notification.relatedEntityId) {
      switch (notification.relatedEntityType) {
        case 'meter':
          router.push(`/meters/${notification.relatedEntityId}`);
          break;
        case 'reading':
          router.push(`/readings/${notification.relatedEntityId}`);
          break;
        case 'bill':
          router.push(`/bills/${notification.relatedEntityId}`);
          break;
        case 'task':
          router.push(`/tasks/${notification.relatedEntityId}`);
          break;
      }
    }
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  const handleSendNotification = () => {
    router.push('/notifications/send');
  };
  
  const renderHeader = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    return (
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.title}>Notifikacije</Text>
        
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
            >
              <CheckCircle size={20} color={Colors.primary} />
              <Text style={styles.markAllText}>Označi sve</Text>
            </TouchableOpacity>
          )}
          
          {/* Only show send button for superadmin */}
          {user && user.role === 'superadmin' && (
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendNotification}
              activeOpacity={0.7}
            >
              <Send size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  const renderEmpty = () => {
    return (
      <EmptyState
        title="Nema notifikacija"
        message="Trenutno nemate novih notifikacija."
        icon={<Bell size={48} color={Colors.textLight} />}
        style={styles.emptyState}
      />
    );
  };
  
  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : null}
      />
      
      {/* Floating action button for superadmin */}
      {user && user.role === 'superadmin' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleSendNotification}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Import Bell icon for the empty state
import { Bell } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});