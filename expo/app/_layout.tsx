import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { registerPushToken, clearPushToken } from '@/lib/push-notifications';
import { deepLinkForNotification } from '@/lib/notification-routing';
import { initSentry, Sentry } from '@/lib/sentry';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// Inicijalizacija što ranije — prije renderinga bilo čega
initSentry();

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Verify the Supabase session before hiding the splash screen so
      // expired JWTs are cleared before the first screen renders.
      initialize().finally(() => SplashScreen.hideAsync());
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { subscribeRealtime, fetchUnreadCount } = useNotificationStore();

  /* ── Push token + Realtime subscription on login/logout ────────────────── */
  const prevUserId     = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (user && user.id !== prevUserId.current) {
      prevUserId.current = user.id;
      registerPushToken().catch((err) =>
        console.warn('[_layout] Push token registration failed:', err),
      );
      unsubscribeRef.current = subscribeRealtime(user.id);
    }

    if (!user && prevUserId.current !== null) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      clearPushToken().catch(() => {});
      prevUserId.current = null;
    }
  }, [user?.id]);

  /* ── AppState: refresh badge when app comes to foreground ───────────────── */
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && user) fetchUnreadCount();
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user?.id]);

  /* ── Foreground notification listeners ──────────────────────────────────── */
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      fetchUnreadCount();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      const route = deepLinkForNotification(
        data?.related_entity_type,
        data?.related_entity_id,
      );
      router.push(route as any);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      {/* ── Core ──────────────────────────────────────────────────────── */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login"    options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" />
      <Stack.Screen name="modal"    options={{ presentation: 'modal' }} />

      {/* ── Users ─────────────────────────────────────────────────────── */}
      {/* All user screens have a custom <Header> component */}
      <Stack.Screen name="users" />
      <Stack.Screen name="users/add" />
      <Stack.Screen name="users/edit/[id]" />
      {/* users/reports uses the native nav header (no custom <Header>) */}
      <Stack.Screen name="users/reports/[id]" options={{ headerShown: false }} />

      {/* ── Companies / Vodovodi ──────────────────────────────────────── */}
      <Stack.Screen name="companies" />
      <Stack.Screen name="companies/[id]" />
      <Stack.Screen name="companies/add" />
      <Stack.Screen name="companies/edit/[id]" />

      {/* ── Distributors ──────────────────────────────────────────────── */}
      <Stack.Screen name="distributors" />
      <Stack.Screen name="distributors/[id]" />
      <Stack.Screen name="distributors/add" />
      <Stack.Screen name="distributors/edit/[id]" />

      {/* ── Locations ─────────────────────────────────────────────────── */}
      <Stack.Screen name="locations" />
      <Stack.Screen name="locations/add" />
      <Stack.Screen name="locations/edit/[id]" />

      {/* ── Meters / Vodomjeri ────────────────────────────────────────── */}
      <Stack.Screen name="meters" />
      <Stack.Screen name="meters/add" />
      <Stack.Screen name="meters/edit/[id]" />

      {/* ── Map / Mapa ────────────────────────────────────────────────── */}
      <Stack.Screen name="map" />

      {/* ── Materials / Artikli ───────────────────────────────────────── */}
      <Stack.Screen name="materials" />

      {/* ── Audit / Evidencija izmjena ────────────────────────────────── */}
      <Stack.Screen name="audit" />

      {/* ── Readings / Consumption ────────────────────────────────────── */}
      <Stack.Screen name="consumption" />

      {/* ── Bills / Invoices ──────────────────────────────────────────── */}
      <Stack.Screen name="bills" />
      <Stack.Screen name="bills/[id]" />

      {/* ── Tasks / Alerts ────────────────────────────────────────────── */}
      <Stack.Screen name="tasks" />
      <Stack.Screen name="tasks/[id]" />
      <Stack.Screen name="alerts" />

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <Stack.Screen name="pricing" />
      <Stack.Screen name="pricing/periods" />
      <Stack.Screen name="pricing/user-groups" />
      <Stack.Screen name="pricing/packages/[id]" />

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notifications/send" />

      {/* ── Support ───────────────────────────────────────────────────── */}
      <Stack.Screen name="support" />
      <Stack.Screen name="support/report-issue" />
      <Stack.Screen name="support/contact" />
      <Stack.Screen name="support/faq" />
      <Stack.Screen name="support/guides" />
      <Stack.Screen name="support/emergency" />
    </Stack>
    <OfflineBanner />
    </>
  );
}
