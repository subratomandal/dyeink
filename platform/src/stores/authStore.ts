import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import auth0Client, {
  getAuth0Client,
  getUser as getAuth0User,
  getAccessToken,
  logout as auth0Logout,
  handleRedirectCallback,
  checkSession,
} from '../lib/auth0';
import apiClient from '../lib/apiClient';

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (options?: { connection?: string }) => Promise<void>;
  signup: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      accessToken: null,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      login: async (options) => {
        await auth0Client.login(options);
      },

      signup: async () => {
        await auth0Client.signup();
      },

      logout: async () => {
        try {
          await auth0Logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
        });
      },

      refreshToken: async () => {
        try {
          const token = await getAccessToken();
          set({ accessToken: token || null });
          return token || null;
        } catch (error) {
          console.error('Token refresh error:', error);
          return null;
        }
      },

      initialize: async () => {
        set({ isLoading: true });

        try {
          // Check for redirect callback
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.has('code') && searchParams.has('state')) {
            await handleRedirectCallback();
          }

          // Check if user is authenticated
          const client = await getAuth0Client();
          const isAuth = await client.isAuthenticated();

          if (isAuth) {
            const auth0User = await getAuth0User();
            const token = await getAccessToken();

            if (auth0User && token) {
              set({ accessToken: token });

              // Sync user with backend
              try {
                const response = await apiClient.post('/auth/register', {
                  auth0Id: auth0User.sub,
                  email: auth0User.email,
                  name: auth0User.name || auth0User.nickname,
                  picture: auth0User.picture,
                });

                const user: User = {
                  id: response.data.id,
                  auth0Id: auth0User.sub,
                  email: response.data.email,
                  name: response.data.name,
                  picture: response.data.picture,
                  isAdmin: response.data.isAdmin,
                  createdAt: response.data.createdAt,
                  updatedAt: response.data.updatedAt,
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } catch (error) {
                console.error('Error syncing user with backend:', error);
                // User is authenticated with Auth0 but backend sync failed
                // Still set as authenticated but with basic user info
                const user: User = {
                  id: auth0User.sub.replace('|', '_'),
                  auth0Id: auth0User.sub,
                  email: auth0User.email || '',
                  name: auth0User.name || auth0User.nickname || '',
                  picture: auth0User.picture,
                  isAdmin: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });
              }
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                accessToken: null,
              });
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              accessToken: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
