import api, { ApiResponse } from '@/lib/api';
import type { Producto } from '@/services/productosService';

export interface DashboardData {
  inventario: {
    total_productos: number;
    valor_inventario: number;
    valor_potencial_venta: number;
    ganancia_potencial: number;
    margen_promedio: number;
    stock_critico: number;
    stock_bajo: number;
  };
  proveedores: {
    total: number;
    con_deuda: number;
    total_deuda: number;
  };
  movimientos_hoy: {
    total: number;
    entradas: number;
    salidas: number;
  };
  cotizaciones: {
    activas: number;
    pendientes_respuesta: number;
  };
}

export interface InventarioValorizadoDetalle {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  subcategoria: string | null;
  proveedor: string | null;
  stock: number;
  stock_minimo: number;
  estado_stock: string;
  precio_compra: number;
  precio_venta: number;
  valor_inventario: number;
  valor_venta: number;
  margen: number;
}

export interface InventarioValorizadoResponse {
  resumen: {
    total_productos: number;
    total_unidades: number;
    valor_compra: number;
    valor_venta: number;
    ganancia_potencial: number;
    margen_promedio: number;
  };
  detalle: InventarioValorizadoDetalle[];
}

export interface ProductoPorCategoria {
  id: number;
  nombre: string;
  color: string | null;
  total_productos: number;
  total_stock: number;
  valor_inventario: number;
  valor_venta: number;
}

export interface MovimientosReporte {
  periodo: {
    desde: string;
    hasta: string;
  };
  resumen: {
    total_movimientos: number;
    entradas: {
      cantidad: number;
      unidades: number;
      valor: number;
    };
    salidas: {
      cantidad: number;
      unidades: number;
    };
    ajustes: {
      cantidad: number;
    };
  };
  movimientos: Array<{
    id: number;
    producto_id: number;
    tipo: string;
    cantidad: number;
    precio_compra: number | null;
    recibido_por: string | null;
    user_id: number;
    created_at: string;
    producto?: { id: number; nombre: string };
    user?: { id: number; nombre: string };
    proveedor?: { id: number; nombre_empresa: string };
  }>;
}

export interface DeudasProveedoresResponse {
  total_deuda: number;
  cantidad_proveedores: number;
  proveedores: Array<{
    id: number;
    nombre: string;
    email: string;
    telefono: string;
    deuda: number;
    ultimos_pagos: Array<{
      id: number;
      monto: number;
      fecha_pago: string;
      metodo_pago: string;
    }>;
  }>;
}

export interface ProductosMasMovidosResponse {
  periodo_dias: number;
  productos: Array<{
    id: number;
    codigo: string;
    nombre: string;
    total_salidas: number;
    numero_movimientos: number;
  }>;
}

export interface StockAlertaResponse {
  criticos: {
    cantidad: number;
    productos: Producto[];
  };
  bajos: {
    cantidad: number;
    productos: Producto[];
  };
}

export interface MovimientosFiltro {
  fecha_desde: string;
  fecha_hasta: string;
  tipo?: 'entrada' | 'salida' | 'ajuste';
  producto_id?: number;
}

const reportesService = {
  // Dashboard principal
  getDashboard: async (): Promise<ApiResponse<DashboardData>> => {
    const response = await api.get('/reportes/dashboard');
    return response.data;
  },

  // Inventario valorizado
  getInventarioValorizado: async (): Promise<ApiResponse<InventarioValorizadoResponse>> => {
    const response = await api.get('/reportes/inventario-valorizado');
    return response.data;
  },

  // Movimientos (con filtros de fecha)
  getMovimientos: async (params: MovimientosFiltro): Promise<ApiResponse<MovimientosReporte>> => {
    const response = await api.get('/reportes/movimientos', {
      params,
    });
    return response.data;
  },

  // Productos por categoría
  getProductosPorCategoria: async (): Promise<ApiResponse<ProductoPorCategoria[]>> => {
    const response = await api.get('/reportes/productos-por-categoria');
    return response.data;
  },

  // Productos más movidos
  getProductosMasMovidos: async (limite?: number, dias?: number): Promise<ApiResponse<ProductosMasMovidosResponse>> => {
    const response = await api.get('/reportes/productos-mas-movidos', {
      params: { limite, dias }
    });
    return response.data;
  },

  // Deudas con proveedores
  getDeudasProveedores: async (): Promise<ApiResponse<DeudasProveedoresResponse>> => {
    const response = await api.get('/reportes/deudas-proveedores');
    return response.data;
  },

  // Stock en alerta
  getStockAlerta: async (): Promise<ApiResponse<StockAlertaResponse>> => {
    const response = await api.get('/reportes/stock-alerta');
    return response.data;
  },
};

export default reportesService;
