import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: number;
  relatedEntityId?: string;
  relatedEntityType?: 'meter' | 'reading' | 'bill' | 'task';
}

export interface SendNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  targetAll?: boolean;
  targetRoles?: string[];
  targetUserIds?: string[];
  relatedEntityId?: string;
  relatedEntityType?: Notification['relatedEntityType'];
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (userId?: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId?: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  sendNotification: (notification: SendNotificationInput) => Promise<void>;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  related_entity_id?: string | null;
  related_entity_type?: Notification['relatedEntityType'] | null;
}

const mapRow = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  type: row.type,
  isRead: row.is_read,
  createdAt: new Date(row.created_at).getTime(),
  relatedEntityId: row.related_entity_id ?? undefined,
  relatedEntityType: row.related_entity_type ?? undefined,
});

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      fetchNotifications: async (userId?: string) => {
        set({ isLoading: true, error: null });

        try {
          let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          const list = (data ?? []).map((row) => mapRow(row as NotificationRow));
          set({
            notifications: list,
            unreadCount: list.filter((n) => !n.isRead).length,
            isLoading: false,
          });
        } catch {
          set({ error: 'Failed to fetch notifications', isLoading: false });
        }
      },

      markAsRead: async (notificationId: string) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.isRead).length,
        });

        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      },

      markAllAsRead: async (userId?: string) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          userId ? (n.userId === userId ? { ...n, isRead: true } : n) : { ...n, isRead: true }
        );
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.isRead).length,
        });

        let query = supabase.from('notifications').update({ is_read: true });
        if (userId) query = query.eq('user_id', userId);
        await query;
      },

      deleteNotification: async (notificationId: string) => {
        const { notifications } = get();
        const updated = notifications.filter((n) => n.id !== notificationId);
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.isRead).length,
        });

        await supabase.from('notifications').delete().eq('id', notificationId);
      },

      sendNotification: async (notification: SendNotificationInput) => {
        set({ isLoading: true, error: null });

        try {
          let targetIds: string[] = [];

          if (notification.targetUserIds && notification.targetUserIds.length > 0) {
            targetIds = notification.targetUserIds;
          } else if (notification.targetAll) {
            const { data } = await supabase.from('profiles').select('id');
            targetIds = (data ?? []).map((p) => p.id as string);
          } else if (notification.targetRoles && notification.targetRoles.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id')
              .in('role', notification.targetRoles);
            targetIds = (data ?? []).map((p) => p.id as string);
          }

          if (targetIds.length === 0) {
            set({ isLoading: false });
            return;
          }

          const rows = targetIds.map((uid) => ({
            user_id: uid,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            is_read: false,
            related_entity_id: notification.relatedEntityId ?? null,
            related_entity_type: notification.relatedEntityType ?? null,
            created_at: new Date().toISOString(),
          }));

          const { error } = await supabase.from('notifications').insert(rows);
          if (error) throw error;

          set({ isLoading: false });
        } catch {
          set({ error: 'Failed to send notification', isLoading: false });
          throw new Error('Failed to send notification');
        }
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
