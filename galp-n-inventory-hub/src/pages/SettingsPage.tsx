import { useEffect, useState } from 'react';
import { Store, Bell, Database, Package, Siren } from 'lucide-react';
import { toast } from 'sonner';
import configuracionService from '@/services/configuracionService';

interface AppSettings {
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

const SETTINGS_KEY = 'galpon_settings_v1';

const defaultSettings: AppSettings = {
  businessName: '',
  phone: '',
  address: '',
  city: '',
  notifStock: false,
  notifEmail: false,
  notifDaily: false,
  alertEmailPrimary: 'samugj22@gmail.com',
  alertEmailRecipients: [],
  alertWhatsapp: '',
  globalLowStockThreshold: 10,
  globalCriticalStockThreshold: 3,
  minAllowedMargin: 0,
  alertBigInventoryAdjustments: false,
  alertStrongPriceChanges: false,
  alertSuspiciousMovements: false,
};

const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(raw) });
        } catch {
          setSettings(defaultSettings);
        }
      }

      try {
        const response = await configuracionService.get();
        if (response.success && response.data) {
          const merged = { ...defaultSettings, ...response.data };
          setSettings(merged);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        }
      } catch {
        toast.warning('No se pudo cargar configuracion desde servidor. Usando datos locales.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateLocal = (next: AppSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setDirty(true);
  };

  const setField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateLocal({ ...settings, [key]: value });
  };

  const toInt = (value: string, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.round(parsed));
  };

  const toDecimal = (value: string, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
  };

  const downloadJson = (payload: unknown, name: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadJson(settings, `configuracion-galpon-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('Configuracion exportada');
  };

  const handleBackup = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      settings,
      auth_user: localStorage.getItem('user'),
    };
    downloadJson(payload, `respaldo-galpon-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('Respaldo local generado');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await configuracionService.save(settings);
      if (response.success && response.data) {
        const merged = { ...defaultSettings, ...response.data };
        setSettings(merged);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        setDirty(false);
        toast.success('Configuracion guardada en servidor');
      } else {
        toast.error(response.message || 'No se pudo guardar la configuracion');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/40'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuracion</h1>
        <p className="text-sm text-muted-foreground">Ajustes del sistema</p>
        <div className="mt-3">
          <button
            onClick={handleSave}
            disabled={loading || saving || !dirty}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Store className="w-4 h-4" /> Informacion del Negocio</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><label className="block text-muted-foreground mb-1">Nombre</label><input value={settings.businessName} onChange={e => setField('businessName', e.target.value)} placeholder="Ej: El Galpon" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" /></div>
          <div><label className="block text-muted-foreground mb-1">Telefono</label><input value={settings.phone} onChange={e => setField('phone', e.target.value)} placeholder="Ej: 602-555-1234" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" /></div>
          <div><label className="block text-muted-foreground mb-1">Direccion</label><input value={settings.address} onChange={e => setField('address', e.target.value)} placeholder="Ej: Calle 5 #4-33" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" /></div>
          <div><label className="block text-muted-foreground mb-1">Municipio</label><input value={settings.city} onChange={e => setField('city', e.target.value)} placeholder="Ej: Alcala, Valle del Cauca" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" /></div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" /> Notificaciones</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Alerta de stock bajo</span>
          <Toggle value={settings.notifStock} onChange={() => setField('notifStock', !settings.notifStock)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Notificaciones por email</span>
          <Toggle value={settings.notifEmail} onChange={() => setField('notifEmail', !settings.notifEmail)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Resumen diario</span>
          <Toggle value={settings.notifDaily} onChange={() => setField('notifDaily', !settings.notifDaily)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
          <div>
            <label className="block text-muted-foreground mb-1">Email principal para alertas</label>
            <input
              type="email"
              value={settings.alertEmailPrimary}
              onChange={e => setField('alertEmailPrimary', e.target.value)}
              placeholder="alertas@empresa.com"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-muted-foreground mb-1">WhatsApp para alertas futuras</label>
            <input
              value={settings.alertWhatsapp}
              onChange={e => setField('alertWhatsapp', e.target.value)}
              placeholder="+57 3001234567"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">El numero de WhatsApp se almacena para futuras integraciones. No envia mensajes por ahora.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Parametros Globales de Inventario</h3>
        <p className="text-xs text-muted-foreground">Se usan como referencia cuando un producto no tenga configuracion especifica.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-muted-foreground mb-1">Umbral global stock bajo</label>
            <input
              type="number"
              min={0}
              value={settings.globalLowStockThreshold}
              onChange={e => setField('globalLowStockThreshold', toInt(e.target.value, settings.globalLowStockThreshold))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-muted-foreground mb-1">Umbral global stock critico</label>
            <input
              type="number"
              min={0}
              value={settings.globalCriticalStockThreshold}
              onChange={e => setField('globalCriticalStockThreshold', toInt(e.target.value, settings.globalCriticalStockThreshold))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-muted-foreground mb-1">Margen minimo permitido (%)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={settings.minAllowedMargin}
              onChange={e => setField('minAllowedMargin', toDecimal(e.target.value, settings.minAllowedMargin))}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Siren className="w-4 h-4" /> Parametros de Alertas</h3>
        <p className="text-xs text-muted-foreground">Estos toggles habilitan o deshabilitan logica futura de alertas.</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Alerta por ajustes grandes de inventario</span>
          <Toggle value={settings.alertBigInventoryAdjustments} onChange={() => setField('alertBigInventoryAdjustments', !settings.alertBigInventoryAdjustments)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Alerta por cambios fuertes de precio</span>
          <Toggle value={settings.alertStrongPriceChanges} onChange={() => setField('alertStrongPriceChanges', !settings.alertStrongPriceChanges)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">Alerta por movimientos sospechosos</span>
          <Toggle value={settings.alertSuspiciousMovements} onChange={() => setField('alertSuspiciousMovements', !settings.alertSuspiciousMovements)} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Database className="w-4 h-4" /> Datos y Respaldos</h3>
        <p className="text-sm text-muted-foreground">Ultimo respaldo local: {new Date().toLocaleString('es-CO')}</p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Exportar Datos</button>
          <button onClick={handleBackup} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Respaldar Ahora</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
