import api, { ApiResponse } from '@/lib/api';

export interface Cotizacion {
  id: number;
  numero: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  fecha_limite: string;
  fecha_limite_pasada?: boolean;
  estado: 'borrador' | 'enviada' | 'en_proceso' | 'completada' | 'cancelada';
  user_id: number;
  user_nombre?: string;
  user?: {
    id: number;
    nombre: string;
  };
  productos: CotizacionProducto[];
  proveedores: CotizacionProveedorDetalle[];
  resumen?: {
    total_proveedores: number;
    proveedores_respondidos: number;
    proveedores_pendientes: number;
    progreso: number;
  };
  created_at: string;
  updated_at?: string;
}

export interface CotizacionProducto {
  id: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  especificaciones: string | null;
}

export interface CotizacionProveedorDetalle {
  id: number;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_email: string;
  proveedor_telefono: string;
  proveedor_calificacion: number | null;
  estado: 'pendiente' | 'enviada' | 'respondida' | 'sin_respuesta';
  fecha_envio: string | null;
  fecha_respuesta: string | null;
  total_cotizado: number;
  productos_detalle: ProductoRespuesta[];
  observaciones: string | null;
  ha_respondido: boolean;
}

export interface ProductoRespuesta {
  cotizacion_producto_id: number | null;
  nombre_producto: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  disponibilidad: number | null;
  tiempo_entrega: number | null;
  observaciones: string | null;
  es_producto_extra?: boolean;
}

// Interfaces para crear cotización
export interface CotizacionProveedor {
  id: number;
  cotizacion_id: number;
  proveedor_id: number;
  estado: 'pendiente' | 'enviada' | 'respondida' | 'rechazada';
  fecha_envio: string | null;
  fecha_respuesta: string | null;
  proveedor?: {
    id: number;
    nombre: string;
    email: string;
  };
  respuesta?: CotizacionRespuesta;
}

export interface CotizacionRespuesta {
  id: number;
  cotizacion_proveedor_id: number;
  total: number;
  tiempo_entrega: string | null;
  condiciones_pago: string | null;
  validez_oferta: string | null;
  observaciones: string | null;
  seleccionada: boolean;
  detalles: CotizacionRespuestaDetalle[];
  created_at: string;
}

export interface CotizacionRespuestaDetalle {
  id: number;
  cotizacion_respuesta_id: number;
  cotizacion_producto_id: number;
  precio_unitario: number;
  subtotal: number;
  disponibilidad: string | null;
  observaciones: string | null;
}

export interface ComparacionRespuestas {
  cotizacion: Cotizacion;
  productos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    unidad_medida: string;
    precios_por_proveedor: Array<{
      proveedor_id: number;
      proveedor_nombre: string;
      precio_unitario: number;
      subtotal: number;
      disponibilidad: string | null;
      es_mejor_precio: boolean;
    }>;
  }>;
  totales_por_proveedor: Array<{
    proveedor_id: number;
    proveedor_nombre: string;
    total: number;
    tiempo_entrega: string | null;
    calificacion: number | null;
    es_recomendado: boolean;
  }>;
}

const cotizacionesService = {
  // Obtener todas las cotizaciones
  getAll: async (params?: { estado?: string }): Promise<ApiResponse<Cotizacion[]>> => {
    const response = await api.get('/cotizaciones', { params });
    return response.data;
  },

  // Obtener una cotización por ID
  getById: async (id: number): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.get(`/cotizaciones/${id}`);
    return response.data;
  },

  // Comparar respuestas de una cotización
  compararRespuestas: async (cotizacionId: number): Promise<ApiResponse<ComparacionRespuestas>> => {
    const response = await api.get(`/cotizaciones/${cotizacionId}/comparar`);
    return response.data;
  },

  // Crear cotización (solo admin)
  create: async (data: {
    titulo: string;
    descripcion?: string;
    fecha_limite: string;
    productos: Array<{
      producto_id?: number;
      nombre: string;
      descripcion?: string;
      cantidad: number;
      unidad_medida: string;
      precio_referencia?: number;
    }>;
    proveedores_ids: number[];
    observaciones?: string;
  }): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.post('/cotizaciones', data);
    return response.data;
  },

  // Actualizar cotización (solo admin)
  update: async (id: number, data: Partial<Cotizacion>): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.put(`/cotizaciones/${id}`, data);
    return response.data;
  },

  // Eliminar cotización (solo admin)
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/cotizaciones/${id}`);
    return response.data;
  },

  // Enviar cotización a proveedores (solo admin)
  enviar: async (cotizacionId: number): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.post(`/cotizaciones/${cotizacionId}/enviar`);
    return response.data;
  },

  // Marcar cotización como completada (solo admin)
  completar: async (cotizacionId: number, proveedorSeleccionadoId?: number): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.post(`/cotizaciones/${cotizacionId}/completar`, {
      proveedor_seleccionado_id: proveedorSeleccionadoId
    });
    return response.data;
  },

  // Cancelar cotización (solo admin)
  cancelar: async (cotizacionId: number, motivo?: string): Promise<ApiResponse<Cotizacion>> => {
    const response = await api.post(`/cotizaciones/${cotizacionId}/cancelar`, { motivo });
    return response.data;
  },

  // Registrar respuesta de proveedor (solo admin)
  registrarRespuesta: async (cotizacionProveedorId: number, data: {
    total: number;
    tiempo_entrega?: string;
    condiciones_pago?: string;
    validez_oferta?: string;
    observaciones?: string;
    detalles: Array<{
      cotizacion_producto_id: number;
      precio_unitario: number;
      disponibilidad?: string;
      observaciones?: string;
    }>;
  }): Promise<ApiResponse<CotizacionRespuesta>> => {
    const response = await api.post(`/cotizacion-proveedores/${cotizacionProveedorId}/respuesta`, data);
    return response.data;
  },
};

export default cotizacionesService;

