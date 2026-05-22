import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { user } = useAuthStore();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" />
      <Stack.Screen name="bills/[id]" options={{ headerShown: true, title: 'Detalji računa' }} />
      <Stack.Screen name="users" options={{ headerShown: true, title: 'Korisnici' }} />
      <Stack.Screen name="users/add" options={{ headerShown: true, title: 'Dodaj korisnika' }} />
      <Stack.Screen name="users/edit/[id]" options={{ headerShown: true, title: 'Uredi korisnika' }} />
      <Stack.Screen name="users/reports/[id]" options={{ headerShown: true, title: 'Izvještaji korisnika' }} />
      <Stack.Screen name="companies" options={{ headerShown: true, title: 'Vodovodi' }} />
      <Stack.Screen name="locations" options={{ headerShown: true, title: 'Lokacije' }} />
      <Stack.Screen name="locations/add" options={{ headerShown: true, title: 'Dodaj lokaciju' }} />
      <Stack.Screen name="locations/edit/[id]" options={{ headerShown: true, title: 'Uredi lokaciju' }} />
      <Stack.Screen name="meters" options={{ headerShown: true, title: 'Vodomjeri' }} />
      <Stack.Screen name="meters/add" options={{ headerShown: true, title: 'Dodaj vodomjer' }} />
      <Stack.Screen name="alerts" options={{ headerShown: true, title: 'Alarmi' }} />
      <Stack.Screen name="tasks" options={{ headerShown: true, title: 'Zadaci' }} />
      <Stack.Screen name="bills" options={{ headerShown: true, title: 'Računi' }} />
      <Stack.Screen name="support" options={{ headerShown: true, title: 'Podrška' }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifikacije' }} />
      <Stack.Screen name="notifications/send" options={{ headerShown: true, title: 'Pošalji obavijest' }} />
      <Stack.Screen name="pricing" options={{ headerShown: true, title: 'Cijene' }} />
      <Stack.Screen name="pricing/periods" options={{ headerShown: true, title: 'Periodi' }} />
      <Stack.Screen name="pricing/user-groups" options={{ headerShown: true, title: 'Grupe korisnika' }} />
      <Stack.Screen name="consumption" options={{ headerShown: true, title: 'Potrošnja' }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}