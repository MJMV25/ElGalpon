import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Cliente axios sin autenticación para endpoints públicos
const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export interface CotizacionPublicaData {
  cotizacion: {
    numero: string;
    titulo: string;
    descripcion: string | null;
    fecha_limite: string;
  };
  proveedor: {
    nombre_empresa: string;
    nit: string;
    nombre_asesor: string;
  };
  productos: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    especificaciones: string | null;
  }>;
  ya_respondida: boolean;
}

export interface RespuestaProducto {
  cotizacion_producto_id: number | null;
  precio_unitario: number;
  cantidad_disponible?: number;
  tiempo_entrega_dias?: number;
  notas?: string;
  es_producto_extra?: boolean;
  nombre_producto_extra?: string;
}

const cotizacionPublicaService = {
  // Obtener información de la cotización
  obtenerCotizacion: async (token: string) => {
    const response = await publicApi.get(`/cotizacion-proveedor/${token}`);
    return response.data;
  },

  // Descargar plantilla Excel
  descargarPlantilla: (token: string) => {
    return `${API_URL}/cotizacion-proveedor/${token}/plantilla`;
  },

  // Subir Excel con respuesta
  subirExcel: async (token: string, archivo: File, notasGenerales?: string) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (notasGenerales) {
      formData.append('notas_generales', notasGenerales);
    }

    const response = await publicApi.post(`/cotizacion-proveedor/${token}/excel`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Enviar respuesta mediante formulario web
  enviarRespuestaWeb: async (
    token: string,
    respuestas: RespuestaProducto[],
    notasGenerales?: string
  ) => {
    const response = await publicApi.post(`/cotizacion-proveedor/${token}/respuesta`, {
      respuestas,
      notas_generales: notasGenerales,
    });
    return response.data;
  },
};

export default cotizacionPublicaService;

