import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockNotifications } from '@/mocks/notifications';

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

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (userId?: string) => Promise<void>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (userId?: string) => void;
  deleteNotification: (notificationId: string) => void;
  sendNotification: (notification: any) => Promise<void>;
}

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
          // In a real app, this would be an API call
          // For now, we'll use mock data
          const userNotifications = mockNotifications.filter(
            notif => notif.userId === userId
          );
          
          set({
            notifications: userNotifications,
            unreadCount: userNotifications.filter(n => !n.isRead).length,
            isLoading: false
          });
        } catch (error) {
          set({
            error: 'Failed to fetch notifications',
            isLoading: false
          });
        }
      },
      
      markAsRead: (notificationId: string) => {
        const { notifications } = get();
        
        const updatedNotifications = notifications.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        );
        
        set({
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length
        });
      },
      
      markAllAsRead: (userId?: string) => {
        const { notifications } = get();
        
        const updatedNotifications = notifications.map(notif =>
          notif.userId === userId ? { ...notif, isRead: true } : notif
        );
        
        set({
          notifications: updatedNotifications,
          unreadCount: 0
        });
      },
      
      deleteNotification: (notificationId: string) => {
        const { notifications } = get();
        
        const updatedNotifications = notifications.filter(
          notif => notif.id !== notificationId
        );
        
        set({
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length
        });
      },
      
      sendNotification: async (notification: any) => {
        set({ isLoading: true, error: null });
        
        try {
          // In a real app, this would be an API call to send the notification
          // For now, we'll simulate a delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Create a new notification object
          const newNotification: Notification = {
            id: `notif${Date.now()}`,
            userId: notification.targetAll ? 'all' : notification.targetRoles.join(','),
            title: notification.title,
            message: notification.message,
            type: notification.type as NotificationType,
            isRead: false,
            createdAt: Date.now()
          };
          
          // In a real app, this would be handled by the backend
          // For now, we'll just add it to our local state
          const { notifications } = get();
          
          set({
            notifications: [...notifications, newNotification],
            isLoading: false
          });
          
          return Promise.resolve();
        } catch (error) {
          set({
            error: 'Failed to send notification',
            isLoading: false
          });
          return Promise.reject(error);
        }
      }
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);