import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import reportesService, { DashboardData, ProductoPorCategoria, StockAlertaResponse } from '@/services/reportesService';
import { formatCurrencyFull, formatNumber, getCategoryEmoji } from '@/utils/formatters';
import {
  Package,
  DollarSign,
  AlertTriangle,
  Truck,
  Plus,
  FileDown,
  ArrowRight,
  Clock,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  BarChart3,
  TriangleAlert,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';

const DashboardPage = () => {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [actFilter, setActFilter] = useState<'hoy' | 'semana' | 'mes'>('hoy');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [categorias, setCategorias] = useState<ProductoPorCategoria[]>([]);
  const [stockAlerta, setStockAlerta] = useState<StockAlertaResponse | null>(null);
  const [actividad, setActividad] = useState<
    Array<{
      id: number;
      tipo: string;
      cantidad: number;
      created_at: string;
      producto?: { nombre: string };
      user?: { nombre: string };
    }>
  >([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, categoriasRes, stockRes] = await Promise.all([
        reportesService.getDashboard(),
        reportesService.getProductosPorCategoria(),
        reportesService.getStockAlerta(),
      ]);

      if (dashboardRes.success) setDashboard(dashboardRes.data);
      if (categoriasRes.success) setCategorias(categoriasRes.data || []);
      if (stockRes.success) setStockAlerta(stockRes.data);
    } catch {
      toast.error('No se pudo cargar el resumen del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadActividad = async (filtro: typeof actFilter) => {
    const hoy = new Date();
    const end = hoy.toISOString().slice(0, 10);
    const startDate = new Date(hoy);
    if (filtro === 'semana') startDate.setDate(hoy.getDate() - 7);
    if (filtro === 'mes') startDate.setDate(hoy.getDate() - 30);
    const start = startDate.toISOString().slice(0, 10);

    try {
      const response = await reportesService.getMovimientos({
        fecha_desde: start,
        fecha_hasta: end,
      });
      if (response.success) {
        setActividad(response.data.movimientos.slice(0, 8));
      }
    } catch {
      setActividad([]);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadActividad(actFilter);
  }, [actFilter]);

  const stats = useMemo(() => {
    const totalProductos = dashboard?.inventario.total_productos ?? 0;
    const valorInventario = dashboard?.inventario.valor_inventario ?? 0;
    const stockBajo = (dashboard?.inventario.stock_bajo ?? 0) + (dashboard?.inventario.stock_critico ?? 0);
    const proveedores = dashboard?.proveedores.total ?? 0;

    return [
      { label: 'Total productos', value: formatNumber(totalProductos), icon: Package, color: 'bg-info', helper: 'Catalogo activo' },
      { label: 'Valor inventario', value: formatCurrencyFull(valorInventario), icon: DollarSign, color: 'bg-success', helper: 'Costo acumulado' },
      { label: 'Bajo stock', value: formatNumber(stockBajo), icon: AlertTriangle, color: 'bg-warning', helper: 'Items por revisar' },
      { label: 'Proveedores', value: formatNumber(proveedores), icon: Truck, color: 'bg-cat-accesorios', helper: 'Activos y vinculados' },
    ];
  }, [dashboard]);

  const resumenHoy = useMemo(() => {
    const mov = dashboard?.movimientos_hoy;
    const cot = dashboard?.cotizaciones;
    return {
      totalMovimientos: mov?.total ?? 0,
      entradas: mov?.entradas ?? 0,
      salidas: mov?.salidas ?? 0,
      cotizacionesActivas: cot?.activas ?? 0,
      cotizacionesPendientes: cot?.pendientes_respuesta ?? 0,
    };
  }, [dashboard]);

  const topCategorias = useMemo(() => {
    return [...categorias]
      .sort((a, b) => (b.valor_inventario || 0) - (a.valor_inventario || 0))
      .slice(0, 4);
  }, [categorias]);

  const alertas = useMemo(() => {
    if (!stockAlerta) return [];
    const criticos = stockAlerta.criticos.productos.map(p => ({
      producto: p.nombre,
      stock: p.stock,
      minimo: p.stock_minimo,
      status: 'critico' as const,
    }));
    const bajos = stockAlerta.bajos.productos.map(p => ({
      producto: p.nombre,
      stock: p.stock,
      minimo: p.stock_minimo,
      status: 'bajo' as const,
    }));
    return [...criticos, ...bajos].slice(0, 4);
  }, [stockAlerta]);

  const quickActions = [
    { label: 'Productos', desc: 'Gestion del catalogo', icon: Boxes, to: '/productos' },
    { label: 'Entradas y Salidas', desc: 'Movimientos de inventario', icon: ArrowLeftRight, to: '/movimientos-inventario' },
    { label: 'Stock Bajo', desc: 'Alertas de reposicion', icon: TriangleAlert, to: '/stock-bajo' },
    { label: 'Reportes', desc: 'Analisis y exportes', icon: BarChart3, to: '/reportes' },
    { label: 'Panel del Dueno', desc: 'Vista ejecutiva avanzada', icon: Crown, to: '/panel-dueno', adminOnly: true },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="bg-gradient-to-r from-primary to-sidebar rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-foreground">
              Resumen general, {user?.nombre.split(' ')[0]}
            </h1>
            <p className="text-primary-foreground/80 text-xs sm:text-sm mt-1">
              Vista rapida del estado operativo para navegar a los modulos clave.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {user?.rol === 'admin' && (
              <button
                onClick={() => navigate('/productos/nuevo')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-card text-foreground text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Nuevo producto
              </button>
            )}
            <button
              onClick={() => navigate('/reportes')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-sidebar text-sidebar-primary-foreground text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <FileDown className="w-4 h-4" /> Reportes
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => (
          <article key={s.label} className="bg-card rounded-xl p-4 sm:p-5 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{loading ? '...' : s.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{s.helper}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <article className="bg-card rounded-xl p-4 sm:p-5 border border-border lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-sm sm:text-base text-foreground">Operacion de hoy</h2>
            <button onClick={() => navigate('/movimientos-inventario')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Ver movimientos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Movimientos</p>
              <p className="text-lg font-semibold text-foreground mt-1">{formatNumber(resumenHoy.totalMovimientos)}</p>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <p className="text-xs text-success">Entradas</p>
              <p className="text-lg font-semibold text-success mt-1 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> {formatNumber(resumenHoy.entradas)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-destructive">Salidas</p>
              <p className="text-lg font-semibold text-destructive mt-1 flex items-center gap-1"><ArrowDownRight className="w-4 h-4" /> {formatNumber(resumenHoy.salidas)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Cotizaciones activas: <span className="font-semibold text-foreground">{formatNumber(resumenHoy.cotizacionesActivas)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Pendientes: <span className="font-semibold text-foreground">{formatNumber(resumenHoy.cotizacionesPendientes)}</span>
            </p>
          </div>
        </article>

        <article className="bg-card rounded-xl p-4 sm:p-5 border border-border">
          <h2 className="font-semibold text-sm sm:text-base text-foreground mb-3">Accesos rapidos</h2>
          <div className="space-y-2">
            {quickActions
              .filter(item => !item.adminOnly || user?.rol === 'admin')
              .map(item => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <item.icon className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <article className="bg-card rounded-xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm sm:text-base text-foreground">Prioridades de stock</h2>
            <button onClick={() => navigate('/stock-bajo')} className="text-xs text-primary font-medium hover:underline">Ver todas</button>
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin alertas en este momento.</p>
          ) : (
            <div className="space-y-2">
              {alertas.map(a => (
                <div key={`${a.producto}-${a.stock}`} className={`p-3 rounded-lg border ${a.status === 'critico' ? 'bg-destructive/10 border-destructive/20' : 'bg-warning/10 border-warning/20'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.producto}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stock: {a.stock} | Minimo: {a.minimo}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'critico' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}`}>
                      {a.status === 'critico' ? 'Critico' : 'Bajo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="bg-card rounded-xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm sm:text-base text-foreground">Categorias con mayor valor</h2>
            <button onClick={() => navigate('/categorias')} className="text-xs text-primary font-medium hover:underline">Ver categorias</button>
          </div>
          {topCategorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay categorias para mostrar.</p>
          ) : (
            <div className="space-y-2">
              {topCategorias.map(cat => (
                <div key={cat.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-medium truncate flex items-center gap-1.5">
                      <span>{getCategoryEmoji(cat.nombre.toLowerCase(), null)}</span>
                      <span>{cat.nombre}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatNumber(cat.total_productos)} productos</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0">{formatCurrencyFull(cat.valor_inventario)}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="bg-card rounded-xl p-4 sm:p-5 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Actividad reciente
          </h2>
          <div className="flex gap-1 w-full sm:w-auto">
            {(['hoy', 'semana', 'mes'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActFilter(f)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium ${actFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {actividad.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos recientes.</p>
        ) : (
          <div className="space-y-2">
            {actividad.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-xs sm:text-sm border-b border-border/70 pb-2 last:border-b-0">
                <span className="text-muted-foreground w-14 text-right shrink-0">
                  {new Date(a.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.tipo === 'entrada' ? 'bg-success' : a.tipo === 'salida' ? 'bg-destructive' : 'bg-info'}`} />
                <p className="text-foreground min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.user?.nombre || 'Sistema'}</span> registró <span className="font-medium">{a.tipo}</span> de {a.producto?.nombre || 'Producto'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
