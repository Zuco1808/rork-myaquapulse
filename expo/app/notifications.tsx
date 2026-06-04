import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, CheckCircle, Send, Bell } from 'lucide-react-native';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotificationStore } from '@/store/notification-store';
import { AppNotification } from '@/lib/api/notifications';
import { useAuthStore } from '@/store/auth-store';
import { deepLinkForNotification } from '@/lib/notification-routing';
import { usePermissions } from '@/lib/use-permissions';
import Colors from '@/constants/colors';

export default function NotificationsScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { canSendNotifications } = usePermissions();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  /* Osvježi pri svakom fokusu */
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  const onRefresh = () => { fetchNotifications(); };

  const handlePress = (n: AppNotification) => {
    if (!n.is_read) markAsRead(n.id);

    const route = deepLinkForNotification(n.related_entity_type, n.related_entity_id);
    router.push(route as any);
  };

  const canSend = canSendNotifications;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>
          Notifikacije{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>

        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.iconBtn} onPress={markAllAsRead}>
              <CheckCircle size={20} color={Colors.primary} />
              <Text style={styles.iconBtnText}>Sve pročitano</Text>
            </TouchableOpacity>
          )}
          {canSend && (
            <TouchableOpacity
              style={[styles.iconBtn, { marginLeft: 4 }]}
              onPress={() => router.push('/notifications/send' as any)}
            >
              <Send size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem notification={item} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Nema notifikacija"
              message="Trenutno nemate novih notifikacija."
              icon={<Bell size={48} color={Colors.textLight} />}
            />
          }
          contentContainerStyle={notifications.length === 0 ? { flexGrow: 1 } : { paddingBottom: Platform.OS === 'android' ? 80 : 40 }}
        />
      )}

      {/* FAB za slanje — samo super_admin / utility_admin */}
      {canSend && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/notifications/send' as any)}
          activeOpacity={0.85}
        >
          <Send size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn:   { padding: 6 },
  title:     { flex: 1, fontSize: 18, fontWeight: 'bold', color: Colors.text, marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
  },
  iconBtnText: { fontSize: 13, color: Colors.primary, marginLeft: 4 },

  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 24,
    right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
});
