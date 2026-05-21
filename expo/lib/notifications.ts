import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log('Push notifikacije rade samo na fizickom uredjaju');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Dozvola za notifikacije odbijena');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'myaquapulse',
    })).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0EA5E9',
      });
    }

    return token;
  } catch (err) {
    console.error('Greska pri registraciji push tokena:', err);
    return null;
  }
};

export const savePushToken = async (userId: string, token: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token } as any)
    .eq('id', userId);

  if (error) console.error('Greska pri snimanju push tokena:', error);
};

export const sendLocalNotification = async (title: string, body: string, data?: any) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
};

export const setupNotificationListeners = (onNotification?: (notification: Notifications.Notification) => void) => {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    onNotification?.(notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};
