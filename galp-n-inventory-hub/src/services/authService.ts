import api, { ApiResponse } from '@/lib/api';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'empleado';
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  abilities: string[];
}

export interface LoginStepOneResponse {
  challenge_token: string;
  email: string;
}

const authService = {
  // Paso 1: validar correo + contrasena y disparar envio del OTP
  login: async (email: string, password: string): Promise<ApiResponse<LoginStepOneResponse>> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Paso 2: verificar OTP y obtener token de sesion
  verifyLoginCode: async (challengeToken: string, codigo: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/verificar-codigo', {
      challenge_token: challengeToken,
      codigo,
    });
    return response.data;
  },

  me: async (): Promise<ApiResponse<{ user: User; abilities: string[] }>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  logoutAll: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post('/auth/logout-all');
    return response.data;
  },
};

export default authService;
