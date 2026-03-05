import { create } from 'zustand';
import authService, { User } from '@/services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  abilities: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  challengeToken: string | null;

  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyLoginCode: (codigo: string) => Promise<{ success: boolean; message: string }>;
  resetLoginFlow: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  hasAbility: (ability: string) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  abilities: [],
  isAuthenticated: false,
  isLoading: false,
  pendingEmail: null,
  challengeToken: null,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(email, password);

      if (!response.success || !response.data?.challenge_token) {
        throw new Error(response.message || 'No fue posible iniciar el proceso de verificacion');
      }

      set({
        pendingEmail: response.data.email || email,
        challengeToken: response.data.challenge_token,
        isLoading: false,
      });

      return { success: true, message: response.message || 'Codigo enviado al correo' };
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || error.message || 'Credenciales invalidas';
      return { success: false, message };
    }
  },

  verifyLoginCode: async (codigo) => {
    const challengeToken = get().challengeToken;

    if (!challengeToken) {
      return { success: false, message: 'Sesion de verificacion no valida. Inicia de nuevo.' };
    }

    set({ isLoading: true });
    try {
      const response = await authService.verifyLoginCode(challengeToken, codigo);

      if (!response.success) {
        throw new Error(response.message || 'Codigo invalido o expirado');
      }

      const { user, token, abilities } = response.data;

      if (!token) {
        throw new Error('No se recibio el token del servidor');
      }

      localStorage.setItem('auth_token', token);

      set({
        user,
        token,
        abilities,
        isAuthenticated: true,
        isLoading: false,
        challengeToken: null,
        pendingEmail: null,
      });

      return { success: true, message: 'Inicio de sesion exitoso' };
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.message || error.message || 'Codigo invalido o expirado';
      return { success: false, message };
    }
  },

  resetLoginFlow: () => {
    set({
      pendingEmail: null,
      challengeToken: null,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    } finally {
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        abilities: [],
        isAuthenticated: false,
        challengeToken: null,
        pendingEmail: null,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null, abilities: [] });
      return;
    }

    try {
      const response = await authService.me();
      if (response.success && response.data) {
        set({
          user: response.data.user,
          abilities: response.data.abilities,
          isAuthenticated: true,
          token,
        });
      } else {
        throw new Error('Respuesta invalida del servidor');
      }
    } catch (error) {
      console.error('Error al verificar autenticacion:', error);
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        abilities: [],
        isAuthenticated: false,
        challengeToken: null,
        pendingEmail: null,
      });
    }
  },

  hasAbility: (ability) => {
    const { abilities } = get();
    return abilities.includes(ability) || abilities.includes('*');
  },

  isAdmin: () => {
    const { user } = get();
    return user?.rol === 'admin';
  },
}));
