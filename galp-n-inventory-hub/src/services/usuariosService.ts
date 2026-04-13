import api, { ApiResponse } from '@/lib/api';
import { User } from './authService';

export interface CreateUserData {
  nombre: string;
  email: string;
  rol: 'admin' | 'empleado';
  password?: string;
}

export interface UpdateUserData {
  nombre?: string;
  email?: string;
  rol?: 'admin' | 'empleado';
  password?: string;
}

const usuariosService = {
  // Obtener todos los usuarios
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const response = await api.get('/usuarios');
    return response.data;
  },

  // Obtener un usuario por ID
  getById: async (id: number): Promise<ApiResponse<User>> => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  // Crear usuario
  create: async (data: CreateUserData): Promise<ApiResponse<User>> => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },

  // Actualizar usuario
  update: async (id: number, data: UpdateUserData): Promise<ApiResponse<User>> => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },

  // Eliminar usuario
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },

  // Activar/Desactivar usuario
  toggleActivo: async (id: number): Promise<ApiResponse<User>> => {
    const response = await api.patch(`/usuarios/${id}/toggle-activo`);
    return response.data;
  },
};

export default usuariosService;

