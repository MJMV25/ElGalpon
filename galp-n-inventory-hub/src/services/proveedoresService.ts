import api, { ApiResponse } from '@/lib/api';

export interface Proveedor {
  id: number;
  nombre_empresa: string;
  nit: string;
  linea_producto: string;
  ciudad: string;
  direccion: string;
  email_administrativo: string;
  telefono_administrativo: string;
  nombre_asesor: string;
  cargo_asesor: string;
  telefono_contacto: string;
  email_comercial: string;
  notas: string | null;
  calificacion: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const proveedoresService = {
  // Obtener todos los proveedores
  getAll: async (params?: { activo?: boolean; buscar?: string; per_page?: number | 'all' }): Promise<ApiResponse<Proveedor[]>> => {
    const response = await api.get('/proveedores', { params });
    return response.data;
  },

  // Obtener un proveedor por ID
  getById: async (id: number): Promise<ApiResponse<Proveedor>> => {
    const response = await api.get(`/proveedores/${id}`);
    return response.data;
  },

  // Crear proveedor (solo admin)
  create: async (data: Partial<Proveedor>): Promise<ApiResponse<Proveedor>> => {
    const response = await api.post('/proveedores', data);
    return response.data;
  },

  // Actualizar proveedor (solo admin)
  update: async (id: number, data: Partial<Proveedor>): Promise<ApiResponse<Proveedor>> => {
    const response = await api.put(`/proveedores/${id}`, data);
    return response.data;
  },

  // Eliminar proveedor (solo admin)
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/proveedores/${id}`);
    return response.data;
  },
};

export default proveedoresService;
