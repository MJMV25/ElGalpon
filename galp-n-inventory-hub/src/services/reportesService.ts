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
    motivo?: string | null;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    precio_compra: number | null;
    recibido_por: string | null;
    user_id: number;
    created_at: string;
    producto?: { id: number; nombre: string; stock_minimo?: number };
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

export interface OwnerPanelResponse {
  kpis: {
    ventas_dia: number;
    ventas_mes: number;
    utilidad_estimada: number;
    margen_estimado: number;
    productos_stock_bajo: number;
    productos_agotados: number;
    valor_total_inventario: number;
    unidades_vendidas_hoy: number;
    unidades_vendidas_mes: number;
  };
  productos_mas_vendidos: Array<{
    id: number;
    codigo: string;
    nombre: string;
    unidades_vendidas: number;
    valor_estimado: number;
    unidades_7_dias: number;
    valor_7_dias: number;
  }>;
  productos_poco_movimiento: Array<{
    id: number;
    codigo: string;
    nombre: string;
    stock_actual: number;
    salidas_45_dias: number;
    dias_sin_movimiento: number;
    valor_inmovilizado: number;
    categoria?: string | null;
    estado_movimiento: 'sin_movimiento' | 'poco_movimiento';
    ultima_salida: string | null;
    producto_url?: string;
  }>;
  movimientos_importantes: Array<{
    id: number;
    tipo: 'entrada' | 'salida' | 'ajuste';
    cantidad: number;
    motivo?: string | null;
    notas?: string | null;
    created_at: string;
    producto: {
      id: number;
      codigo: string;
      nombre: string;
    } | null;
    usuario: {
      id: number;
      nombre: string;
    } | null;
  }>;
  alertas_activas: Array<{
    id: number;
    tipo: string;
    titulo: string;
    mensaje: string;
    created_at?: string | null;
    destino?: string;
    modulo?: string;
    meta?: Record<string, any>;
  }>;
  alertas_resumen: {
    total: number;
    criticas: number;
    stock_bajo: number;
    notificaciones_no_leidas: number;
  };
  resumen_caja: {
    disponible: boolean;
    message: string;
    data: Record<string, any> | null;
  };
  resumen_compras_recientes: {
    disponible: boolean;
    fuente: string;
    periodo_desde: string;
    periodo_hasta: string;
    message: string;
    data: {
      total_movimientos: number;
      total_unidades: number;
      valor_estimado: number;
      proveedores_distintos: number;
    } | null;
  };
  resumen_sincronizacion_siigo: {
    disponible: boolean;
    preparado: boolean;
    integrado: boolean;
    configurado: boolean;
    ultima_sincronizacion: string | null;
    estado: string;
    message: string;
    data: Record<string, any> | null;
  };
  movimientos_sospechosos: {
    disponible: boolean;
    message: string | null;
    resumen?: {
      total: number;
      alto: number;
      medio: number;
      origen_auditoria: number;
      origen_inventario: number;
    };
    items: Array<{
      id: string;
      origen: 'inventario' | 'auditoria';
      riesgo: 'medio' | 'alto';
      descripcion: string;
      usuario?: string | null;
      producto?: string | null;
      ip_address?: string | null;
      created_at: string;
    }>;
  };
  resumen_riesgos: {
    productos_sin_movimiento: number;
    productos_criticos: number;
    productos_agotados: number;
    movimientos_sospechosos: number;
  };
  metadata: {
    periodo_ventas_dia: string;
    periodo_ventas_mes: string;
    periodo_top_vendidos_30_dias?: string;
    periodo_top_vendidos_7_dias?: string;
    fuente_ventas: string;
    actualizado_en: string;
  };
}

export type ReporteExportKey = 'inventario' | 'stock' | 'categorias' | 'valoracion' | 'movimientos' | 'proveedores';
export type ReporteExportFormat = 'excel' | 'pdf';

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

  // Panel ejecutivo para dueños (solo admin en backend)
  getOwnerPanel: async (): Promise<ApiResponse<OwnerPanelResponse>> => {
    const response = await api.get('/reportes/panel-dueno');
    return response.data;
  },

  exportarReporte: async (
    tipo: ReporteExportKey,
    formato: ReporteExportFormat,
    params?: Record<string, string>
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await api.get(`/reportes/exportar/${tipo}/${formato}`, {
      params,
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match?.[1] || `reporte_${tipo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

    return {
      blob: response.data as Blob,
      filename,
    };
  },
};

export default reportesService;
