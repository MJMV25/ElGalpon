import { useMemo, useState, useEffect } from 'react';
import { getStockStatus, formatCurrencyFull } from '@/utils/formatters';
import { Download, XCircle, AlertTriangle, DollarSign, ShoppingCart, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import productosService, { Producto } from '@/services/productosService';
import { useNavigate, useLocation } from 'react-router-dom';

const LowStockPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStock = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productosService.getStockBajo();
      if (response.success) setProductos(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo cargar el stock bajo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const lowStockProducts = useMemo(() => productos
    .map(p => ({
      ...p,
      ...getStockStatus(p.stock, p.stock_minimo),
      faltante: Math.max(p.stock_minimo - p.stock, 0),
      costoReposicion: Math.max(p.stock_minimo - p.stock, 0) * p.precio_compra,
    })), [productos]);

  const critical = lowStockProducts.filter(p => p.status === 'critical').length;
  const low = lowStockProducts.filter(p => p.status === 'low').length;
  const totalInversion = lowStockProducts.reduce((sum, p) => sum + p.costoReposicion, 0);

  const exportCsv = () => {
    const header = ['codigo', 'producto', 'categoria', 'stock_actual', 'stock_minimo', 'faltante', 'costo_reposicion'];
    const rows = lowStockProducts.map(p => [
      p.codigo,
      p.nombre,
      p.categoria?.nombre || '',
      p.stock,
      p.stock_minimo,
      p.faltante,
      p.costoReposicion,
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
    toast.success(`Producto agregado a nueva cotización: ${producto.nombre}`);
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
        toast.info(`Producto resaltado: ${product.nombre}`);
      }
    }
  }, [location.state, lowStockProducts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Productos con Stock Bajo</h1>
          <p className="text-sm text-muted-foreground">Productos que necesitan reabastecimiento inmediato</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted">
            <Download className="w-4 h-4" /> Exportar Lista
          </button>
          <button onClick={loadStock} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Recargar
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 border border-destructive/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center"><XCircle className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-2xl font-bold text-foreground">{critical}</p><p className="text-xs text-muted-foreground">Stock Crítico</p></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-warning/30 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-warning" /></div>
                <div><p className="text-2xl font-bold text-foreground">{low}</p><p className="text-xs text-muted-foreground">Stock Bajo</p></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-success" /></div>
                <div><p className="text-2xl font-bold text-foreground">{formatCurrencyFull(totalInversion)}</p><p className="text-xs text-muted-foreground">Inversión Requerida</p></div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Categoría</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock Actual</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock Mínimo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Faltante</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Costo Reposición</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(p => {
                  const requested = requestedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={`border-b border-border last:border-0 ${p.status === 'critical' ? 'bg-destructive/5' : 'bg-warning/5'}`}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'critical' ? 'bg-destructive' : 'bg-warning'}`} />
                          {p.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.nombre}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.categoria?.nombre || '-'}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${p.status === 'critical' ? 'text-destructive' : 'text-warning'}`}>{p.stock}</span></td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{p.stock_minimo}</td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{p.faltante}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCurrencyFull(p.costoReposicion)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePedir(p)}
                          disabled={requested}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> {requested ? 'En Cotización' : 'Pedir'}
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
