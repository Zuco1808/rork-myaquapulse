import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from 'react';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { useAuthStore } from '@/store/auth-store';
import { Platform } from "react-native";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Create a client
const queryClient = new QueryClient();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  const { user } = useAuthStore();

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

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications().then(token => {
        if (token) savePushToken(user.id, token);
      });
    }
  }, [user?.id]);

  if (!loaded) {
    return null;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function RootLayoutNav() {
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
      <Stack.Screen name="readings/[id]" options={{ headerShown: true, title: 'Detalji očitanja' }} />
      <Stack.Screen name="meters/[id]" options={{ headerShown: true, title: 'Detalji vodomjera' }} />
      <Stack.Screen name="tasks/[id]" options={{ headerShown: true, title: 'Detalji zadatka' }} />
      <Stack.Screen name="bills/[id]" options={{ headerShown: true, title: 'Detalji računa' }} />
      <Stack.Screen name="users" options={{ headerShown: true, title: 'Korisnici' }} />
      <Stack.Screen name="users/add" options={{ headerShown: true, title: 'Dodaj korisnika' }} />
      <Stack.Screen name="users/edit/[id]" options={{ headerShown: true, title: 'Uredi korisnika' }} />
      <Stack.Screen name="users/reports/[id]" options={{ headerShown: true, title: 'Izvještaji korisnika' }} />
      <Stack.Screen name="companies" options={{ headerShown: true, title: 'Kompanije' }} />
      <Stack.Screen name="companies/add" options={{ headerShown: true, title: 'Dodaj kompaniju' }} />
      <Stack.Screen name="companies/edit/[id]" options={{ headerShown: true, title: 'Uredi kompaniju' }} />
      <Stack.Screen name="companies/[id]" options={{ headerShown: true, title: 'Detalji kompanije' }} />
      <Stack.Screen name="locations" options={{ headerShown: true, title: 'Lokacije' }} />
      <Stack.Screen name="locations/add" options={{ headerShown: true, title: 'Dodaj lokaciju' }} />
      <Stack.Screen name="locations/edit/[id]" options={{ headerShown: true, title: 'Uredi lokaciju' }} />
      <Stack.Screen name="meters" options={{ headerShown: true, title: 'Vodomjeri' }} />
      <Stack.Screen name="alerts" options={{ headerShown: true, title: 'Alarmi' }} />
      <Stack.Screen name="tasks" options={{ headerShown: true, title: 'Zadaci' }} />
      <Stack.Screen name="my-meters" options={{ headerShown: false, title: 'Moj pregled' }} />
      <Stack.Screen name="bills" options={{ headerShown: true, title: 'Računi' }} />
      <Stack.Screen name="support" options={{ headerShown: true, title: 'Podrška' }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifikacije' }} />
      <Stack.Screen name="notifications/send" options={{ headerShown: true, title: 'Pošalji obavijest' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Postavke' }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}
