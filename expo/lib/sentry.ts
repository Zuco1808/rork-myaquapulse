/**
 * lib/sentry.ts
 *
 * Centralna Sentry konfiguracija za AquaPulse.
 *
 * Inicijalizacija: pozvati initSentry() što ranije u _layout.tsx.
 * User context: pozvati setSentryUser() poslije login-a, clearSentryUser() na logout.
 *
 * Potrebne env varijable (u expo/.env):
 *   EXPO_PUBLIC_SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz
 *
 * Za upload source mapa (CI/CD):
 *   SENTRY_ORG=aquapulse
 *   SENTRY_PROJECT=myaquapulse-rn
 *   SENTRY_AUTH_TOKEN=<token iz Sentry Settings > Auth Tokens>
 */

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) {
    if (__DEV__) {
      console.info('[Sentry] EXPO_PUBLIC_SENTRY_DSN nije postavljen — Sentry onemogućen.');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,

    // Postavi na 0.2 u produkciji (20 % transakcija)
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Snima svaku sesiju u razvoju, 10 % u produkciji
    replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1,

    // Uvijek snimi replay uz error
    replaysOnErrorSampleRate: 1.0,

    // Ne šalji PII (email, IP) automatski — setiramo ručno ispod
    sendDefaultPii: false,

    environment: __DEV__ ? 'development' : 'production',

    // Integracije
    integrations: [
      Sentry.mobileReplayIntegration(),
    ],
  });
}

/** Postavlja Sentry user context odmah nakon uspješnog login-a. */
export function setSentryUser(id: string, email: string, role: string): void {
  Sentry.setUser({ id, email, username: role });
}

/** Briše Sentry user context na logout — spriječava miješanje sesija. */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Bilježi grešku u Sentry s opcionim dodatnim kontekstom.
 * Koristiti u catch blokovima umjesto console.error tamo gdje je bitno.
 *
 * @example
 *   captureError(err, { screen: 'readings', action: 'verifyReading' });
 */
export function captureError(
  err: unknown,
  context?: Record<string, string>,
): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

export { Sentry };
