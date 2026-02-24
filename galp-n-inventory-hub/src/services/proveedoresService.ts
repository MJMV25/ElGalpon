import api, { ApiResponse, PaginatedResponse } from '@/lib/api';

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  email: string;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  deuda: number;  // Campo correcto que retorna el backend
  calificacion: number | null;
  notas: string | null;
  activo: boolean;
  productos_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PagoProveedor {
  id: number;
  proveedor_id: number;
  monto: number;
  metodo_pago: 'efectivo' | 'transferencia' | 'cheque' | 'otro';
  referencia: string | null;
  fecha_pago: string;
  notas: string | null;
  user_id: number;
  user?: {
    id: number;
    nombre: string;
  };
  created_at: string;
}

export interface ResumenDeudas {
  deuda_total: number;
  proveedores_con_deuda: number;
  deuda_mayor: {
    proveedor: string;
    monto: number;
  } | null;
}

const proveedoresService = {
  // Obtener todos los proveedores
  getAll: async (): Promise<ApiResponse<Proveedor[]>> => {
    const response = await api.get('/proveedores');
    return response.data;
  },

  // Obtener resumen de deudas
  getResumenDeudas: async (): Promise<ApiResponse<ResumenDeudas>> => {
    const response = await api.get('/proveedores/resumen-deudas');
    return response.data;
  },

  // Obtener un proveedor por ID
  getById: async (id: number): Promise<ApiResponse<Proveedor>> => {
    const response = await api.get(`/proveedores/${id}`);
    return response.data;
  },

  // Obtener historial de pagos de un proveedor
  getHistorialPagos: async (proveedorId: number): Promise<ApiResponse<PagoProveedor[]>> => {
    const response = await api.get(`/proveedores/${proveedorId}/pagos`);
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

  // Incrementar deuda (solo admin)
  incrementarDeuda: async (proveedorId: number, data: {
    monto: number;
    concepto: string;
  }): Promise<ApiResponse<Proveedor>> => {
    const response = await api.post(`/proveedores/${proveedorId}/incrementar-deuda`, data);
    return response.data;
  },

  // Registrar pago (solo admin)
  registrarPago: async (proveedorId: number, data: {
    monto: number;
    metodo_pago: string;
    referencia?: string;
    notas?: string;
  }): Promise<ApiResponse<PagoProveedor>> => {
    const response = await api.post(`/proveedores/${proveedorId}/pago`, data);
    return response.data;
  },

  // Enviar recordatorio de pago (solo admin)
  enviarRecordatorio: async (proveedorId: number): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.post(`/proveedores/${proveedorId}/recordatorio`);
    return response.data;
  },
};

export default proveedoresService;

