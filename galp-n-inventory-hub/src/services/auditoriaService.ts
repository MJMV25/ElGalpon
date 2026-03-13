import api, { PaginatedResponse } from '@/lib/api';

export interface AuditoriaItem {
  id: number;
  user_id: number | null;
  accion: string;
  modulo: string | null;
  modelo: string | null;
  modelo_id: number | null;
  referencia: string | null;
  datos_anteriores: Record<string, any> | null;
  datos_nuevos: Record<string, any> | null;
  observacion: string | null;
  nivel_riesgo?: 'alto' | 'medio' | 'bajo';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: number;
    nombre: string;
    email: string;
  } | null;
}

export interface AuditoriaFiltros {
  user_id?: number;
  accion?: string;
  modulo?: string;
  modelo?: string;
  referencia?: string;
  solo_sensibles?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
  q?: string;
  per_page?: number;
  page?: number;
}

export interface AuditoriaMetaFiltros {
  usuarios: Array<{ id: number; nombre: string; email: string }>;
  modulos: string[];
  acciones: string[];
  modelos: string[];
}

export interface AuditoriaResponse {
  success: boolean;
  message?: string;
  data: PaginatedResponse<AuditoriaItem>;
  meta: {
    filtros: AuditoriaMetaFiltros;
    resumen?: {
      total_filtrado: number;
      sensibles_filtrado: number;
    };
  };
}

const auditoriaService = {
  getAll: async (params: AuditoriaFiltros = {}): Promise<AuditoriaResponse> => {
    const response = await api.get('/auditoria', { params });
    return response.data;
  },
};

export default auditoriaService;
