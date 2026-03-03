import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import reportesService, { DashboardData, ProductoPorCategoria, StockAlertaResponse } from '@/services/reportesService';
import { formatCurrencyFull, formatNumber, getCategoryEmoji } from '@/utils/formatters';
import { Package, DollarSign, AlertTriangle, Truck, Plus, FileDown, ArrowUpRight, ArrowDownRight, Minus, Clock } from 'lucide-react';
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
    } catch (error) {
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
        setActividad(response.data.movimientos.slice(0, 10));
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
      { label: 'Total Productos', value: formatNumber(totalProductos), icon: Package, color: 'bg-info', trend: 'Productos activos', trendUp: null },
      { label: 'Valor del Inventario', value: formatCurrencyFull(valorInventario), icon: DollarSign, color: 'bg-success', trend: 'Valor de compra', trendUp: null },
      { label: 'Productos Bajo Stock', value: formatNumber(stockBajo), icon: AlertTriangle, color: 'bg-warning', trend: 'Requiere atención', trendUp: false },
      { label: 'Proveedores Activos', value: formatNumber(proveedores), icon: Truck, color: 'bg-cat-accesorios', trend: 'Relaciones activas', trendUp: null },
    ];
  }, [dashboard]);

  const totalValor = categorias.reduce((sum, c) => sum + (c.valor_inventario || 0), 0);

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
    return [...criticos, ...bajos].slice(0, 5);
  }, [stockAlerta]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary to-sidebar rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-primary-foreground">
            ¡Bienvenido, {user?.nombre.split(' ')[0]}!
          </h1>
          <p className="text-primary-foreground/80 text-xs sm:text-sm mt-1">
            Aquí tienes el resumen de tu inventario para hoy
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {user?.rol === 'admin' && (
            <button
              onClick={() => navigate('/productos/nuevo')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-card text-foreground text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Nuevo</span>
            </button>
          )}
          <button
            onClick={() => navigate('/reportes')}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-sidebar text-sidebar-primary-foreground text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden xs:inline">Reporte</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 sm:p-5 border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{s.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${s.color} flex items-center justify-center shrink-0 ml-2`}>
                <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <p className={`text-xs mt-2 sm:mt-3 flex items-center gap-1 ${s.trendUp === true ? 'text-success' : s.trendUp === false ? 'text-destructive' : 'text-muted-foreground'}`}>
              {s.trendUp === true ? <ArrowUpRight className="w-3 h-3" /> : s.trendUp === false ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span className="truncate">{s.trend}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Category + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category distribution */}
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border">
          <h3 className="font-semibold text-sm sm:text-base text-foreground mb-4 flex items-center gap-2">
            <span>📊</span> Distribución por Categoría
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando categorías...</p>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay categorías para mostrar.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {categorias.map(cat => {
                const pct = totalValor > 0 ? Math.round((cat.valor_inventario / totalValor) * 100) : 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                      <span className="text-foreground truncate flex items-center gap-1.5">
                        <span>{getCategoryEmoji(cat.nombre.toLowerCase(), null)}</span>
                        <span className="truncate">{cat.nombre}</span>
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap ml-2">
                        {formatCurrencyFull(cat.valor_inventario)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: cat.color || 'var(--primary)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="bg-card rounded-xl p-4 sm:p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alertas de Stock
            </h3>
            <button
              className="text-xs sm:text-sm text-primary font-medium hover:underline"
              onClick={() => navigate('/stock-bajo')}
            >
              Ver todas
            </button>
          </div>
          {alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin alertas en este momento.</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {alertas.map(a => (
                <div key={`${a.producto}-${a.stock}`} className={`p-3 rounded-lg transition-all ${a.status === 'critico' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20'}`}>
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.producto}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Stock: <span className="font-medium">{a.stock}</span> • Mínimo: {a.minimo}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${a.status === 'critico' ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}`}>
                      {a.status === 'critico' ? 'Crítico' : 'Bajo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-card rounded-xl p-4 sm:p-5 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Actividad Reciente
          </h3>
          <div className="flex gap-1 w-full sm:w-auto">
            {(['hoy', 'semana', 'mes'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActFilter(f)}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-md text-xs font-medium transition-colors ${actFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
        {actividad.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos recientes.</p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {actividad.map((a) => (
              <div key={a.id} className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="text-muted-foreground w-14 sm:w-16 text-right shrink-0">
                  {new Date(a.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.tipo === 'entrada' ? 'bg-success' : a.tipo === 'salida' ? 'bg-destructive' : 'bg-info'}`} />
                <p className="text-foreground min-w-0 flex-1">
                  <span className="font-medium">{a.user?.nombre || 'Sistema'}</span> registró {a.tipo}{' '}
                  <span className="font-medium truncate inline-block max-w-[150px] sm:max-w-none">{a.producto?.nombre || 'Producto'}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
