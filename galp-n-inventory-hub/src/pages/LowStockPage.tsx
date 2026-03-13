import { useMemo, useState, useEffect } from 'react';
import { getStockStatus, formatCurrencyFull } from '@/utils/formatters';
import { Download, XCircle, AlertTriangle, DollarSign, ShoppingCart, Loader2, RefreshCw, Search, Package, ArrowLeftRight, FileBarChart2, Crown, Filter } from 'lucide-react';
import { toast } from 'sonner';
import productosService, { Producto } from '@/services/productosService';
import categoriasService, { Categoria } from '@/services/categoriasService';
import { useNavigate, useLocation } from 'react-router-dom';

type FilaStock = Producto & {
  status: 'critical' | 'low' | 'normal';
  label: string;
  faltante: number;
  costoReposicion: number;
  estadoVisual: 'agotado' | 'critical' | 'low';
  estadoLabel: string;
};

const LowStockPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [estado, setEstado] = useState<'all' | 'critical' | 'low' | 'agotado'>('all');

  const loadStock = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [stockRes, catRes] = await Promise.all([
        productosService.getStockBajo(),
        categoriasService.getAll(),
      ]);
      if (stockRes.success) setProductos(stockRes.data || []);
      if (catRes.success) setCategorias(catRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo cargar el stock bajo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const lowStockProducts = useMemo<FilaStock[]>(() => productos
    .map(p => {
      const stockStatus = getStockStatus(p.stock, p.stock_minimo);
      const faltante = Math.max(p.stock_minimo - p.stock, 0);

      let estadoVisual: FilaStock['estadoVisual'] = stockStatus.status;
      let estadoLabel = stockStatus.label;
      if (p.stock <= 0) {
        estadoVisual = 'agotado';
        estadoLabel = 'Agotado';
      }

      return {
        ...p,
        ...stockStatus,
        faltante,
        costoReposicion: faltante * p.precio_compra,
        estadoVisual,
        estadoLabel,
      };
    }), [productos]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return lowStockProducts.filter(p => {
      const matchSearch = !term
        || p.nombre.toLowerCase().includes(term)
        || p.codigo.toLowerCase().includes(term);

      const matchCategoria = !categoriaId || String(p.categoria_id) === categoriaId;

      const matchEstado = estado === 'all'
        || (estado === 'agotado' && p.stock <= 0)
        || (estado === 'critical' && p.estadoVisual === 'critical')
        || (estado === 'low' && p.estadoVisual === 'low');

      return matchSearch && matchCategoria && matchEstado;
    });
  }, [lowStockProducts, search, categoriaId, estado]);

  const metrics = useMemo(() => {
    const critical = filteredProducts.filter(p => p.estadoVisual === 'critical').length;
    const low = filteredProducts.filter(p => p.estadoVisual === 'low').length;
    const agotados = filteredProducts.filter(p => p.stock <= 0).length;
    const totalInversion = filteredProducts.reduce((sum, p) => sum + p.costoReposicion, 0);

    return { critical, low, agotados, totalInversion };
  }, [filteredProducts]);

  const exportCsv = () => {
    const header = ['codigo', 'producto', 'categoria', 'estado', 'stock_actual', 'stock_minimo', 'faltante', 'costo_reposicion', 'ultimo_movimiento'];
    const rows = filteredProducts.map(p => [
      p.codigo,
      p.nombre,
      p.categoria?.nombre || '',
      p.estadoLabel,
      p.stock,
      p.stock_minimo,
      p.faltante,
      p.costoReposicion,
      p.ultimo_movimiento_at || '',
    ]);

    const csv = [header, ...rows]
      .map(cols => cols.map(col => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-bajo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Lista exportada correctamente');
  };

  const handlePedir = (producto: Producto) => {
    setRequestedIds(prev => (prev.includes(producto.id) ? prev : [...prev, producto.id]));
    toast.success(`Producto agregado a nueva cotizacion: ${producto.nombre}`);
    navigate('/cotizaciones/nueva', {
      state: {
        preselectedProducts: [{
          producto_id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria?.nombre || '',
        }],
        source: 'stock-bajo',
      }
    });
  };

  useEffect(() => {
    const focusCode = (location.state as { focusCode?: string } | null)?.focusCode;
    if (focusCode) {
      const product = lowStockProducts.find(p => p.codigo === focusCode);
      if (product) {
        setSearch(focusCode);
        toast.info(`Producto resaltado: ${product.nombre}`);
      }
    }
  }, [location.state, lowStockProducts]);

  const estadoBadgeClass = (p: FilaStock) => {
    if (p.estadoVisual === 'agotado') return 'bg-destructive/20 text-destructive';
    if (p.estadoVisual === 'critical') return 'bg-destructive/10 text-destructive';
    return 'bg-warning/10 text-warning';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Productos con Stock Bajo</h1>
          <p className="text-sm text-muted-foreground">Controla alertas de reposicion sin salir del flujo operativo.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted">
            <Download className="w-4 h-4" /> Exportar Lista
          </button>
          <button onClick={loadStock} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Recargar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/productos')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Productos</button>
        <button onClick={() => navigate('/movimientos-inventario')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><ArrowLeftRight className="w-3.5 h-3.5" /> Entradas y Salidas</button>
        <button onClick={() => navigate('/reportes')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><FileBarChart2 className="w-3.5 h-3.5" /> Reportes</button>
        <button onClick={() => navigate('/panel-dueno')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Panel del Dueño</button>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o codigo"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>

          <select
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Todas las categorias</option>
            {categorias.map(cat => (
              <option key={cat.id} value={String(cat.id)}>{cat.nombre}</option>
            ))}
          </select>

          <select
            value={estado}
            onChange={e => setEstado(e.target.value as typeof estado)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="agotado">Agotado</option>
            <option value="critical">Critico</option>
            <option value="low">Bajo</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setCategoriaId('');
              setEstado('all');
            }}
            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
          {error}
          <button onClick={loadStock} className="ml-4 underline">Reintentar</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-5 border border-destructive/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center"><XCircle className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-2xl font-bold text-foreground">{metrics.critical}</p><p className="text-xs text-muted-foreground">Stock Critico</p></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-warning/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div>
                <div><p className="text-2xl font-bold text-foreground">{metrics.low}</p><p className="text-xs text-muted-foreground">Stock Bajo</p></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-destructive/40 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/25 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-2xl font-bold text-foreground">{metrics.agotados}</p><p className="text-xs text-muted-foreground">Agotados</p></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-success" /></div>
                <div><p className="text-2xl font-bold text-foreground">{formatCurrencyFull(metrics.totalInversion)}</p><p className="text-xs text-muted-foreground">Inversion Requerida</p></div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[1180px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Categoria</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Faltante</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Costo Reposicion</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Ult. Movimiento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Contexto</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No hay productos con los filtros actuales.</td>
                  </tr>
                )}
                {filteredProducts.map(p => {
                  const requested = requestedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${p.estadoVisual === 'agotado' ? 'bg-destructive/10' : p.estadoVisual === 'critical' ? 'bg-destructive/5' : 'bg-warning/5'}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadgeClass(p)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.estadoVisual === 'low' ? 'bg-warning' : 'bg-destructive'}`} />
                          {p.estadoLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.categoria?.nombre || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-foreground">{p.stock}</div>
                        <div className="text-xs text-muted-foreground">min {p.stock_minimo}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-semibold">{p.faltante}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{formatCurrencyFull(p.costoReposicion)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.ultimo_movimiento_at ? new Date(p.ultimo_movimiento_at).toLocaleString('es-CO') : 'Sin movimiento'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate('/productos', { state: { focusCode: p.codigo } })}
                            className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
                            title="Ir a Productos"
                          >
                            Producto
                          </button>
                          <button
                            onClick={() => navigate('/movimientos-inventario', { state: { productoId: p.id } })}
                            className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
                            title="Ver historial en Entradas y Salidas"
                          >
                            Historial
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePedir(p)}
                          disabled={requested}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> {requested ? 'En Cotizacion' : 'Pedir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default LowStockPage;
