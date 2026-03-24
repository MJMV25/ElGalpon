import api, { ApiResponse } from '@/lib/api';

export interface ConfiguracionSistema {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  notifStock: boolean;
  notifEmail: boolean;
  notifDaily: boolean;
  alertEmailPrimary: string;
  alertEmailRecipients?: string[];
  alertWhatsapp: string;
  globalLowStockThreshold: number;
  globalCriticalStockThreshold: number;
  minAllowedMargin: number;
  alertBigInventoryAdjustments: boolean;
  alertStrongPriceChanges: boolean;
  alertSuspiciousMovements: boolean;
}

const configuracionService = {
  get: async (): Promise<ApiResponse<ConfiguracionSistema>> => {
    const response = await api.get('/configuracion');
    return response.data;
  },

  save: async (data: Partial<ConfiguracionSistema>): Promise<ApiResponse<ConfiguracionSistema>> => {
    const response = await api.put('/configuracion', data);
    return response.data;
  },
};

export default configuracionService;
