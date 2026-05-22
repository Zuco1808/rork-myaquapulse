import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole, getPermissions } from '@/types/user';

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserProfile: (updates: Partial<Pick<Profile,
    'full_name' | 'phone' | 'avatar_url'
  >>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

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

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            set({ error: 'Greška pri učitavanju profila', isLoading: false });
            return;
          }

          if (!profile.is_active) {
            await supabase.auth.signOut();
            set({ error: 'Vaš nalog je deaktiviran', isLoading: false });
            return;
          }

          const mappedProfile: Profile = {
            ...profile,
            permissions: getPermissions(profile.role as UserRole),
            // Compatibility aliases za stari kod
            name: profile.full_name,
            avatar: profile.avatar_url,
            companyId: profile.utility_id,
            locationIds: [],
          };

          set({ user: mappedProfile, isLoading: false });
        } catch {
          set({ error: 'Greška prilikom prijave', isLoading: false });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },

      clearError: () => set({ error: null }),

      updateUserProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (!error) {
          set({ user: { ...user, ...updates } });
        }
      },
    }),
    {
      name: 'aquapulse-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);