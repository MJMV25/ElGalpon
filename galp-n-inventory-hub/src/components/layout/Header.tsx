import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun, Calendar, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import notificacionesService, { type Notificacion } from '@/services/notificacionesService';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const THEME_KEY = 'galpon_theme';
const asNotificationList = (payload: unknown): Notificacion[] => {
  if (Array.isArray(payload)) return payload as Notificacion[];
  if (payload && typeof payload === 'object') {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as Notificacion[];
  }
  return [];
};

const Header = ({ title, onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!notificationsOpen) return;
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await notificacionesService.getAll({ per_page: 12 });
      const items = asNotificationList(response.data);
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.leida).length);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificacionesService.contarNoLeidas();
      setUnreadCount(response.data?.no_leidas || 0);
    } catch {
      setUnreadCount(0);
    }
  };

  const handleSearch = () => {
    const q = search.trim();
    if (!q) {
      navigate('/productos');
      return;
    }
    navigate(`/productos?q=${encodeURIComponent(q)}`);
  };

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    toast.success(theme === 'dark' ? 'Modo claro activado' : 'Modo oscuro activado');
  };

  const markAsRead = async (id: number) => {
    try {
      await notificacionesService.marcarLeida(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('No se pudo marcar la notificacion');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificacionesService.marcarTodasLeidas();
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
      toast.success('Todas las notificaciones fueron marcadas como leidas');
    } catch {
      toast.error('No se pudieron marcar las notificaciones');
    }
  };

  return (
    <header className="h-16 bg-card/95 backdrop-blur border-b border-border flex items-center px-4 gap-4 shrink-0 sticky top-0 z-30">
      <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground">
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <img
          src="/logo-galpon.png"
          alt="Logo El Galpon"
          className="w-10 h-10 object-contain rounded-md bg-white p-1 border border-border"
        />
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
          <span className="block text-[11px] text-muted-foreground">El Galpon</span>
        </div>
      </div>

      <div className="flex-1 flex justify-center max-w-lg mx-auto">
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Buscar productos, categorias..."
            className="w-full pl-9 pr-16 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded border border-border bg-muted text-[10px] text-muted-foreground hover:text-foreground"
          >
            Ir
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-muted-foreground" ref={notificationsRef}>
        <div className="relative">
          <button
            className="relative hover:text-foreground"
            onClick={() => {
              const nextOpen = !notificationsOpen;
              setNotificationsOpen(nextOpen);
              if (nextOpen) {
                loadNotifications();
              }
            }}
            title="Notificaciones"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-[330px] max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-xs text-primary font-medium disabled:text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Marcar todas</span>
                </button>
              </div>

              {loadingNotifications ? (
                <p className="text-sm text-muted-foreground px-3 py-4">Cargando notificaciones...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-4">No tienes notificaciones.</p>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.slice(0, 12).map(n => (
                    <div key={n.id} className={`px-3 py-2 ${n.leida ? 'bg-card' : 'bg-primary/5'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.mensaje}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {n.created_at ? new Date(n.created_at).toLocaleString('es-CO') : 'Sin fecha'}
                          </p>
                        </div>
                        {!n.leida && (
                          <button onClick={() => markAsRead(n.id)} className="text-[11px] text-primary font-medium hover:underline">
                            Leida
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className={`hover:text-foreground ${theme === 'dark' ? 'text-primary' : ''}`}
          onClick={handleThemeToggle}
          title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        <span className="hidden md:flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5" /> {today}
        </span>
      </div>
    </header>
  );
};

export default Header;
