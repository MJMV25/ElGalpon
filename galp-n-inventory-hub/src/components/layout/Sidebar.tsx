import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { formatNumber, getInitials } from '@/utils/formatters';
import reportesService from '@/services/reportesService';
import {
  LayoutDashboard, Package, PlusCircle, Tags, AlertTriangle,
  Wallet, BarChart3, Truck, FileText, Users, Settings, LogOut,
  ArrowLeftRight, Crown, Shield,
  X, MoreVertical
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [badges, setBadges] = useState<{
    productos: number | null;
    stockBajo: number | null;
    proveedores: number | null;
    cotizaciones: number | null;
  }>({
    productos: null,
    stockBajo: null,
    proveedores: null,
    cotizaciones: null,
  });

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadBadges = async () => {
      if (!user) return;
      try {
        const response = await reportesService.getDashboard();
        if (!active) return;
        if (response.success) {
          const data = response.data;
          setBadges({
            productos: data.inventario?.total_productos ?? 0,
            stockBajo: (data.inventario?.stock_bajo ?? 0) + (data.inventario?.stock_critico ?? 0),
            proveedores: data.proveedores?.total ?? 0,
            cotizaciones: data.cotizaciones?.activas ?? 0,
          });
        }
      } catch {
        if (active) {
          setBadges({
            productos: null,
            stockBajo: null,
            proveedores: null,
            cotizaciones: null,
          });
        }
      }
    };

    loadBadges();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
        : 'text-sidebar-foreground hover:bg-sidebar-accent'
    }`;

  const badgeClass = 'ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground';

  const sections = [
    {
      label: 'PRINCIPAL',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...(isAdmin ? [{ to: '/panel-dueno', icon: Crown, label: 'Panel del Dueno' }] : []),
        ...(isAdmin ? [{ to: '/auditoria', icon: Shield, label: 'Auditoria' }] : []),
      ]
    },
    {
      label: 'INVENTARIO',
      items: [
        { to: '/productos', icon: Package, label: 'Productos', badge: badges.productos === null ? undefined : formatNumber(badges.productos) },
        ...(isAdmin ? [{ to: '/productos/nuevo', icon: PlusCircle, label: 'Agregar Producto' }] : []),
        ...(isAdmin ? [{ to: '/movimientos-inventario', icon: ArrowLeftRight, label: 'Entradas y Salidas' }] : []),
        { to: '/categorias', icon: Tags, label: 'Categorias' },
        { to: '/stock-bajo', icon: AlertTriangle, label: 'Stock Bajo', badge: badges.stockBajo === null ? undefined : formatNumber(badges.stockBajo) },
      ]
    },
    {
      label: 'FINANZAS',
      items: [
        { to: '/presupuesto', icon: Wallet, label: 'Presupuesto' },
        { to: '/reportes', icon: BarChart3, label: 'Reportes' },
        { to: '/proveedores', icon: Truck, label: 'Proveedores', badge: badges.proveedores === null ? undefined : formatNumber(badges.proveedores) },
      ]
    },
    {
      label: 'COMPRAS',
      items: [
        { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones', badge: badges.cotizaciones === null ? undefined : formatNumber(badges.cotizaciones) },
      ]
    },
    ...(isAdmin ? [{
      label: 'ADMINISTRACION',
      items: [
        { to: '/usuarios', icon: Users, label: 'Usuarios' },
        { to: '/configuracion', icon: Settings, label: 'Configuracion' },
      ]
    }] : []),
  ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
          <img
            src="/logo-galpon.png"
            alt="Logo El Galpon"
            className="w-11 h-11 object-contain rounded-md bg-white/90 p-1"
          />
          <div>
            <span className="block text-lg font-bold leading-tight text-sidebar-primary-foreground">El Galpon</span>
            <span className="block text-[11px] uppercase tracking-wider text-sidebar-primary/90">Agroveterinaria</span>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden text-sidebar-foreground"><X className="w-5 h-5" /></button>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
              {getInitials(user.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-primary-foreground truncate">{user.nombre}</p>
              <p className="text-xs text-sidebar-primary capitalize">{user.rol === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(v => !v)} className="text-sidebar-muted hover:text-sidebar-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg border border-sidebar-border bg-sidebar-accent shadow-lg z-20 py-1">
                  <button
                    onClick={() => {
                      navigate('/');
                      setMenuOpen(false);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-primary/20"
                  >
                    Ir al dashboard
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        navigate('/configuracion');
                        setMenuOpen(false);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-primary/20"
                    >
                      Configuracion
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-primary/20"
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {sections.map(section => (
            <div key={section.label}>
              <p className="px-4 mb-1.5 text-[11px] font-semibold tracking-wider text-sidebar-section uppercase">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={onClose}>
                    <item.icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && <span className={badgeClass}>{item.badge}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar-primary/20 text-sidebar-primary font-medium text-sm hover:bg-sidebar-primary/30 transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar Sesion
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
