import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  phone?: string;
  address?: string;
  avatar?: string;
  company_id?: string;
  can_read_meters: boolean;
  can_report_issues: boolean;
  can_manage_tasks: boolean;
  can_edit_readings: boolean;
  can_send_notifications: boolean;
  can_view_all_data: boolean;
  can_manage_users: boolean;
  can_manage_companies: boolean;
  can_manage_billing: boolean;
  can_backup_data: boolean;
}

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUserProfile: (profile: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: 'Netacna email adresa ili lozinka', isLoading: false });
            return;
          }

          if (data.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError || !profile) {
              set({ error: 'Greska pri ucitavanju profila', isLoading: false });
              return;
            }

            set({ user: profile, isLoading: false });
          }
        } catch (error) {
          set({ error: 'Doslo je do greske prilikom prijave', isLoading: false });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },

      clearError: () => set({ error: null }),

      updateUserProfile: async (profile) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('profiles')
          .update(profile)
          .eq('id', user.id);

        if (!error) {
          set({ user: { ...user, ...profile } });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
