import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole, getPermissions } from '@/types/user';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';
import { pendingMfaFactor, completeMfaChallenge } from '@/lib/api/mfa';

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  error: string | null;
  /** Postavljeno kad je nakon lozinke potreban 2FA kod. */
  mfaRequired: boolean;
  mfaFactorId: string | null;
  /** Call once at app startup — verifies the Supabase session and refreshes profile. */
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Dovršava prijavu 2FA kodom. */
  completeMfa: (code: string) => Promise<void>;
  cancelMfa: () => Promise<void>;
  /** Interno: učita profil i postavi korisnika. */
  finalizeLogin: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserProfile: (updates: Partial<Pick<Profile,
    'full_name' | 'phone' | 'avatar_url' | 'push_token' | 'email_notifications_enabled'
  >>) => Promise<void>;
}

function mapProfile(profile: Record<string, any>): Profile {
  return {
    ...profile,
    permissions: getPermissions(profile.role as UserRole),
    // Compatibility aliases za stari kod
    name: profile.full_name,
    avatar: profile.avatar_url,
    companyId: profile.utility_id,
    locationIds: [],
  } as unknown as Profile;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      mfaRequired: false,
      mfaFactorId: null,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            // No active session — clear any stale persisted user
            set({ user: null, isLoading: false });
            return;
          }

          // Session exists — refresh profile from DB to ensure it's current
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            // Profile fetch failed — keep cached user, don't wipe it
            set({ isLoading: false });
            return;
          }

          if (!profile.is_active) {
            // Account deactivated — force logout
            await supabase.auth.signOut();
            clearSentryUser();
            set({ user: null, isLoading: false });
            return;
          }

          const mappedProfile = mapProfile(profile);
          set({ user: mappedProfile, isLoading: false });
          setSentryUser(mappedProfile.id, mappedProfile.email, mappedProfile.role);
        } catch {
          // Network error on startup — keep cached user so app stays usable offline
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error || !data.user) {
            set({ error: 'Neispravni podaci za prijavu', isLoading: false });
            return;
          }

          // 2FA: ako korisnik ima verifikovan faktor, traži kod prije ulaska
          const factorId = await pendingMfaFactor().catch(() => null);
          if (factorId) {
            set({ mfaRequired: true, mfaFactorId: factorId, isLoading: false });
            return;
          }

          await get().finalizeLogin(data.user.id);
        } catch {
          set({ error: 'Greška prilikom prijave', isLoading: false });
        }
      },

      completeMfa: async (code: string) => {
        const { mfaFactorId } = get();
        if (!mfaFactorId) return;
        set({ isLoading: true, error: null });
        try {
          await completeMfaChallenge(mfaFactorId, code.trim());
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) { set({ error: 'Sesija nije pronađena', isLoading: false }); return; }
          await get().finalizeLogin(user.id);
        } catch {
          set({ error: 'Neispravan kod. Pokušajte ponovo.', isLoading: false });
        }
      },

      cancelMfa: async () => {
        await supabase.auth.signOut();
        set({ mfaRequired: false, mfaFactorId: null, isLoading: false, error: null });
      },

      // Učitava profil i postavlja korisnika (zajednički za lozinku i 2FA put)
      finalizeLogin: async (userId: string) => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', userId).single();

        if (profileError || !profile) {
          set({ error: 'Greška pri učitavanju profila', isLoading: false });
          return;
        }
        if (!profile.is_active) {
          await supabase.auth.signOut();
          set({ error: 'Vaš nalog je deaktiviran', isLoading: false });
          return;
        }
        const mappedProfile = mapProfile(profile);
        set({ user: mappedProfile, isLoading: false, mfaRequired: false, mfaFactorId: null });
        setSentryUser(mappedProfile.id, mappedProfile.email, mappedProfile.role);
      },

      logout: async () => {
        await supabase.auth.signOut();
        clearSentryUser();
        set({ user: null, mfaRequired: false, mfaFactorId: null });
      },

      clearError: () => set({ error: null }),

      updateUserProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (error) throw error;
        set({ user: { ...user, ...updates } });
      },
    }),
    {
      name: 'aquapulse-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
