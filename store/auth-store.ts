import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, getDefaultPermissions } from '@/types/user';
import { getUserByCredentials } from '@/mocks/users';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUserPermissions: (permissions: Partial<User['permissions']>) => void;
  updateUserProfile: (profile: Partial<User>) => void;
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
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const user = getUserByCredentials(email, password);
          
          if (user) {
            // Ensure user has permissions object
            if (!user.permissions) {
              user.permissions = getDefaultPermissions(user.role);
            }
            
            set({ user, isLoading: false });
          } else {
            set({ error: "Netačna email adresa ili lozinka", isLoading: false });
          }
        } catch (error) {
          set({ error: "Došlo je do greške prilikom prijave", isLoading: false });
        }
      },
      
      logout: () => {
        set({ user: null });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      updateUserPermissions: (permissions) => {
        const { user } = get();
        if (!user) return;
        
        set({
          user: {
            ...user,
            permissions: {
              ...user.permissions,
              ...permissions
            }
          }
        });
      },
      
      updateUserProfile: (profile) => {
        const { user } = get();
        if (!user) return;
        
        set({
          user: {
            ...user,
            ...profile,
            updatedAt: Date.now()
          }
        });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);