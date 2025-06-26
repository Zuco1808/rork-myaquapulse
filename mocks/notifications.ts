export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: number;
  relatedEntityId?: string;
  relatedEntityType?: 'meter' | 'reading' | 'bill' | 'task';
}

export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    userId: '2', // Admin
    title: 'Neuobičajena potrošnja',
    message: 'Vodomjer SJV-12345 pokazuje 50% veću potrošnju od prosjeka.',
    type: 'warning',
    isRead: false,
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    relatedEntityId: 'meter1',
    relatedEntityType: 'meter',
  },
  {
    id: 'notif2',
    userId: '4', // Worker
    title: 'Novi zadatak',
    message: 'Dodijeljeno vam je 5 novih vodomjera za očitanje.',
    type: 'info',
    isRead: true,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    relatedEntityType: 'task',
  },
  {
    id: 'notif3',
    userId: '5', // Citizen
    title: 'Novi račun',
    message: 'Izdat je novi račun za vaš vodomjer. Rok plaćanja: 5 dana.',
    type: 'info',
    isRead: false,
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
    relatedEntityId: 'bill1',
    relatedEntityType: 'bill',
  },
];

export const getNotificationsByUser = (userId: string): Notification[] => {
  return mockNotifications.filter(notif => notif.userId === userId);
};

export const getUnreadNotificationsCount = (userId: string): number => {
  return mockNotifications.filter(notif => notif.userId === userId && !notif.isRead).length;
};