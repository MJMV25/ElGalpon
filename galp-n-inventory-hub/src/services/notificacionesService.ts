import api, { ApiResponse } from '@/lib/api';

export interface Notificacion {
  id: number;
  user_id: number;
  tipo:
    | 'stock_bajo'
    | 'stock_critico'
    | 'stock_agotado'
    | 'cotizacion_respuesta'
    | 'cotizacion_vencer'
    | 'pago_recordatorio'
    | 'ajuste_grande_inventario'
    | 'cambio_precio_fuerte'
    | 'movimiento_sospechoso'
    | 'producto_sin_movimiento'
    | 'sincronizacion_error'
    | 'sistema';
  titulo: string;
  mensaje: string;
  datos: Record<string, any> | null;
  leida: boolean;
  leida_at: string | null;
  created_at: string;
}

const notificacionesService = {
  // Obtener todas las notificaciones
  getAll: async (params?: { per_page?: number; leida?: boolean; tipo?: string }): Promise<ApiResponse<Notificacion[]>> => {
    const response = await api.get('/notificaciones', { params });
    return response.data;
  },

  // Contar notificaciones no leídas
  contarNoLeidas: async (): Promise<ApiResponse<{ no_leidas: number }>> => {
    const response = await api.get('/notificaciones/no-leidas/count');
    return response.data;
  },

  // Marcar notificación como leída
  marcarLeida: async (id: number): Promise<ApiResponse<Notificacion>> => {
    const response = await api.patch(`/notificaciones/${id}/leida`);
    return response.data;
  },

  // Marcar todas como leídas
  marcarTodasLeidas: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.patch('/notificaciones/marcar-todas-leidas');
    return response.data;
  },

  // Eliminar notificación
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/notificaciones/${id}`);
    return response.data;
  },

  // Eliminar todas las notificaciones leídas
  eliminarLeidas: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete('/notificaciones/leidas/all');
    return response.data;
  },
};

export default notificacionesService;

