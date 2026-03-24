import api, { ApiResponse } from '@/lib/api';

export interface Categoria {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  icono: string | null;
  color: string | null;
  activo: boolean;
  productos_count?: number;
  total_productos?: number;
  total_stock?: number;
  valor_inventario?: number;
  subcategorias?: Subcategoria[];
  created_at: string;
  updated_at: string;
}

export interface Subcategoria {
  id: number;
  categoria_id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activo: boolean;
  productos_count?: number;
  created_at: string;
  updated_at: string;
}

const categoriasService = {
  // Obtener todas las categorías
  getAll: async (params?: { include_metrics?: boolean; include_inactive?: boolean; activo?: boolean }): Promise<ApiResponse<Categoria[]>> => {
    const response = await api.get('/categorias', { params });
    return response.data;
  },

  // Obtener una categoría por ID
  getById: async (id: number): Promise<ApiResponse<Categoria>> => {
    const response = await api.get(`/categorias/${id}`);
    return response.data;
  },

  // Obtener subcategorías de una categoría
  getSubcategorias: async (categoriaId: number): Promise<ApiResponse<Subcategoria[]>> => {
    const response = await api.get(`/categorias/${categoriaId}/subcategorias`);
    return response.data;
  },

  // Crear categoría (solo admin)
  create: async (data: Partial<Categoria>): Promise<ApiResponse<Categoria>> => {
    const response = await api.post('/categorias', data);
    return response.data;
  },

  // Actualizar categoría (solo admin)
  update: async (id: number, data: Partial<Categoria>): Promise<ApiResponse<Categoria>> => {
    const response = await api.put(`/categorias/${id}`, data);
    return response.data;
  },

  // Eliminar categoría (solo admin)
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/categorias/${id}`);
    return response.data;
  },

  // Crear subcategoría (solo admin)
  createSubcategoria: async (categoriaId: number, data: Partial<Subcategoria>): Promise<ApiResponse<Subcategoria>> => {
    const response = await api.post(`/categorias/${categoriaId}/subcategorias`, data);
    return response.data;
  },
};

export default categoriasService;
