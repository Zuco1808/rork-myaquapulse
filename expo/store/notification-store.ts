import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  AppNotification,
} from '@/lib/api/notifications';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  /** Subscribe to real-time inserts for the given userId. Returns unsubscribe fn. */
  subscribeRealtime: (userId: string) => () => void;
}

/** Sync Expo app badge with current unread count (best effort). */
const syncBadge = (count: number) => {
  Notifications.setBadgeCountAsync(count).catch(() => {});
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await getMyNotifications();
      const unreadCount = data.filter((n) => !n.is_read).length;
      set({ notifications: data, unreadCount, isLoading: false });
      syncBadge(unreadCount);
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
      syncBadge(count);
    } catch {}
  },

  markAsRead: async (id: string) => {
    try {
      await apiMarkAsRead(id);
      set((state) => {
        const unreadCount = Math.max(0, state.unreadCount - 1);
        syncBadge(unreadCount);
        return {
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          ),
          unreadCount,
        };
      });
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await apiMarkAllAsRead();
      set((state) => {
        syncBadge(0);
        return {
          notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
          unreadCount: 0,
        };
      });
    } catch {}
  },

  /**
   * Opens a Supabase Realtime channel that listens for INSERT events on
   * `notifications` filtered to the current user. New rows are prepended to
   * the list and the badge is updated immediately — no polling required.
   *
   * Call this once after login (from _layout.tsx) and call the returned
   * cleanup function on logout.
   */
  subscribeRealtime: (userId: string) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const raw = payload.new as any;
          const notif: AppNotification = {
            id:                  raw.id,
            user_id:             raw.user_id,
            utility_id:          raw.utility_id ?? null,
            title:               raw.title,
            message:             raw.message,
            type:                raw.type,
            is_read:             raw.is_read,
            related_entity_id:   raw.related_entity_id   ?? null,
            related_entity_type: raw.related_entity_type ?? null,
            created_at:          raw.created_at,
            created_by:          raw.created_by ?? null,
          };

          set((state) => {
            const unreadCount = state.unreadCount + 1;
            syncBadge(unreadCount);
            return {
              notifications: [notif, ...state.notifications],
              unreadCount,
            };
          });
        },
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
