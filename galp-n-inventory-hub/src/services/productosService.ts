import api, { ApiResponse, PaginatedResponse } from '@/lib/api';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  subcategoria_id: number | null;
  proveedor_id: number | null;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  unidad_medida?: string | null;
  lote: string | null;
  fecha_vencimiento: string | null;
  ubicacion: string | null;
  activo: boolean;
  estado_stock: 'normal' | 'bajo' | 'critico';
  categoria?: {
    id: number;
    nombre: string;
    color: string | null;
    icono: string | null;
  };
  subcategoria?: {
    id: number;
    nombre: string;
  };
  proveedor?: {
    id: number;
    nombre_empresa: string;
  };
  movimientos?: MovimientoInventario[];
  ultimo_movimiento_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovimientoInventario {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  precio_compra: number | null;
  lote: string | null;
  proveedor_id: number | null;
  motivo: string | null;
  recibido_por: string | null;
  notas: string | null;
  user_id: number;
  user?: {
    id: number;
    nombre: string;
  };
  created_at: string;
}

export interface ProductosFilter {
  categoria_id?: number;
  subcategoria_id?: number;
  proveedor_id?: number;
  estado_stock?: 'normal' | 'bajo' | 'critico';
  buscar?: string;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number | 'all';
}

export interface MovimientosFilter {
  tipo?: 'entrada' | 'salida' | 'ajuste';
  fecha_desde?: string;
  fecha_hasta?: string;
  per_page?: number;
}

export interface EntradaLoteItem {
  producto_id: number;
  cantidad: number;
  precio_compra?: number;
  lote?: string;
  notas?: string;
}

export interface SalidaLoteItem {
  producto_id: number;
  cantidad: number;
  notas?: string;
}

export interface ProductoBusqueda {
  id: number;
  codigo: string;
  nombre: string;
  presentacion?: string | null;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
}

const productosService = {
  // Obtener todos los productos (paginado)
  getAll: async (filters?: ProductosFilter): Promise<ApiResponse<PaginatedResponse<Producto>>> => {
    const response = await api.get('/productos', { params: filters });
    return response.data;
  },

  // Obtener productos con stock bajo
  getStockBajo: async (): Promise<ApiResponse<Producto[]>> => {
    const response = await api.get('/productos/stock-bajo');
    return response.data;
  },

  // Obtener un producto por ID
  getById: async (id: number): Promise<ApiResponse<Producto>> => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },

  // Obtener movimientos de un producto
  getMovimientos: async (productoId: number, filters?: MovimientosFilter): Promise<ApiResponse<PaginatedResponse<MovimientoInventario>>> => {
    const response = await api.get(`/productos/${productoId}/movimientos`, { params: filters });
    return response.data;
  },

  // Buscar productos por nombre/codigo para autocompletar
  buscarRapido: async (q: string, limit = 30): Promise<ApiResponse<ProductoBusqueda[]>> => {
    const response = await api.get('/productos/buscar', { params: { q, limit } });
    return response.data;
  },

  // Crear producto (solo admin)
  create: async (data: Partial<Producto>): Promise<ApiResponse<Producto> & { warnings?: string[] }> => {
    const response = await api.post('/productos', data);
    return response.data;
  },

  // Importar productos desde Excel (solo admin)
  importarExcel: async (archivo: File, opciones?: { sobrescribir_existentes?: boolean; stock_minimo_default?: number }): Promise<ApiResponse<{
    creados: number;
    actualizados: number;
    omitidos: number;
    errores: string[];
  }>> => {
    const formData = new FormData();
    formData.append('archivo', archivo);

    if (typeof opciones?.sobrescribir_existentes === 'boolean') {
      formData.append('sobrescribir_existentes', opciones.sobrescribir_existentes ? '1' : '0');
    }
    if (typeof opciones?.stock_minimo_default === 'number') {
      formData.append('stock_minimo_default', String(opciones.stock_minimo_default));
    }

    const response = await api.post('/productos/importar-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Actualizar producto (solo admin)
  update: async (id: number, data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
    const response = await api.put(`/productos/${id}`, data);
    return response.data;
  },

  // Eliminar producto (solo admin)
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await api.delete(`/productos/${id}`);
    return response.data;
  },

  // Registrar entrada de stock (solo admin)
  entradaStock: async (productoId: number, data: {
    cantidad: number;
    precio_compra?: number;
    lote?: string;
    proveedor_id?: number;
    notas?: string;
  }): Promise<ApiResponse<MovimientoInventario>> => {
    const response = await api.post(`/productos/${productoId}/entrada`, data);
    return response.data;
  },

  // Registrar salida de stock (solo admin)
  salidaStock: async (productoId: number, data: {
    cantidad: number;
    motivo: string;
    notas?: string;
  }): Promise<ApiResponse<MovimientoInventario>> => {
    const response = await api.post(`/productos/${productoId}/salida`, data);
    return response.data;
  },

  // Entrada por lote de multiples productos (factura de compra)
  entradaStockLote: async (data: {
    factura_compra: string;
    proveedor_id?: number;
    fecha_factura?: string;
    observacion?: string;
    productos: EntradaLoteItem[];
  }): Promise<ApiResponse<{
    tipo_operacion?: string;
    factura_compra: string;
    total_items: number;
    monto_total_compra: number;
    productos: Array<{
      producto_id: number;
      codigo: string;
      nombre: string;
      cantidad: number;
      stock_anterior: number;
      stock_nuevo: number;
    }>;
  }> & { warnings?: string[] }> => {
    const response = await api.post('/movimientos-inventario/entrada-lote', data);
    return response.data;
  },

  // Salida por lote de multiples productos
  salidaStockLote: async (data: {
    motivo: string;
    referencia_documento?: string;
    observacion?: string;
    productos: SalidaLoteItem[];
  }): Promise<ApiResponse<{
    tipo_operacion?: string;
    motivo: string;
    referencia_documento: string | null;
    total_items: number;
    productos: Array<{
      producto_id: number;
      codigo: string;
      nombre: string;
      cantidad: number;
      stock_anterior: number;
      stock_nuevo: number;
    }>;
  }> & { warnings?: string[] }> => {
    const response = await api.post('/movimientos-inventario/salida-lote', data);
    return response.data;
  },
};

export default productosService;
