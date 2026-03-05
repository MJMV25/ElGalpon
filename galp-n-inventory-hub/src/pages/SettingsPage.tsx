import { useEffect, useState } from 'react';
import { Store, Bell, Database } from 'lucide-react';
import { toast } from 'sonner';

interface AppSettings {
  businessName: string;
  phone: string;
  address: string;
  city: string;
  notifStock: boolean;
  notifEmail: boolean;
  notifDaily: boolean;
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
};

const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  const persist = (next: AppSettings) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const setField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    persist({ ...settings, [key]: value });
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
