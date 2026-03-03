import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package, Loader2, RefreshCw, Calendar, Download } from 'lucide-react';
import productosService, { Producto } from '@/services/productosService';
import proveedoresService, { Proveedor } from '@/services/proveedoresService';
import reportesService, { MovimientosReporte } from '@/services/reportesService';
import { formatCurrencyFull, getStockStatus } from '@/utils/formatters';

const InventoryMovementsPage = () => {
  const location = useLocation();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingMov, setLoadingMov] = useState(true);
  const [movimientos, setMovimientos] = useState<MovimientosReporte | null>(null);

  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioCompra, setPrecioCompra] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [lote, setLote] = useState('');
  const [motivo, setMotivo] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<'entrada' | 'salida' | 'ajuste' | ''>('');
  const [filtroProducto, setFiltroProducto] = useState('');

  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const [fechaDesde, setFechaDesde] = useState(defaultStart);
  const [fechaHasta, setFechaHasta] = useState(defaultEnd);

  const loadBase = async () => {
    try {
      setLoadingBase(true);
      const [prodRes, provRes] = await Promise.all([
        productosService.getAll({ page: 1, per_page: 500 }),
        proveedoresService.getAll({ per_page: 'all' }),
      ]);

      if (prodRes.success) setProductos(prodRes.data.data || []);
      if (provRes.success) setProveedores(provRes.data || []);
    } catch {
      toast.error('No se pudieron cargar productos o proveedores');
    } finally {
      setLoadingBase(false);
    }
  };

  const loadMovimientos = async () => {
    try {
      setLoadingMov(true);
      const response = await reportesService.getMovimientos({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo: filtroTipo || undefined,
        producto_id: filtroProducto ? Number(filtroProducto) : undefined,
      });
      if (response.success) setMovimientos(response.data);
    } catch {
      toast.error('No se pudieron cargar los movimientos');
    } finally {
      setLoadingMov(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    const state = location.state as { productoId?: number; tipo?: 'entrada' | 'salida' } | null;
    if (state?.productoId) {
      setProductoId(String(state.productoId));
      if (state.tipo) setTipoMovimiento(state.tipo);
    }
  }, [location.state]);

  useEffect(() => {
    loadMovimientos();
  }, [fechaDesde, fechaHasta, filtroTipo, filtroProducto]);

  const selectedProduct = useMemo(
    () => productos.find(p => p.id === Number(productoId)) || null,
    [productos, productoId]
  );

  const handleSubmit = async () => {
    if (!productoId) {
      toast.error('Selecciona un producto');
      return;
    }
    if (cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    if (tipoMovimiento === 'salida' && !motivo.trim()) {
      toast.error('El motivo es obligatorio para salidas');
      return;
    }
    if (!recibidoPor.trim()) {
      toast.error('Debes indicar quién recibe la mercancía');
      return;
    }

    try {
      setSubmitting(true);
      if (tipoMovimiento === 'entrada') {
        await productosService.entradaStock(Number(productoId), {
          cantidad,
          precio_compra: precioCompra ? Number(precioCompra) : undefined,
          proveedor_id: proveedorId ? Number(proveedorId) : undefined,
          lote: lote.trim() || undefined,
          recibido_por: recibidoPor.trim(),
          notas: notas.trim() || undefined,
        });
        toast.success('Entrada registrada correctamente');
      } else {
        await productosService.salidaStock(Number(productoId), {
          cantidad,
          motivo: motivo.trim(),
          recibido_por: recibidoPor.trim(),
          notas: notas.trim() || undefined,
        });
        toast.success('Salida registrada correctamente');
      }

      setCantidad(1);
      setPrecioCompra('');
      setProveedorId('');
      setLote('');
      setMotivo('');
      setRecibidoPor('');
      setNotas('');
      await loadBase();
      await loadMovimientos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo registrar el movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!movimientos) return;
    const rows = [
      ['fecha', 'tipo', 'producto', 'cantidad', 'usuario', 'proveedor', 'recibido_por'],
      ...movimientos.movimientos.map(m => [
        m.created_at,
        m.tipo,
        m.producto?.nombre || '',
        m.cantidad,
        m.user?.nombre || '',
        m.proveedor?.nombre_empresa || '',
        m.recibido_por || '',
      ])
    ];
    const csv = rows
      .map(cols => cols.map(col => `"${String(col ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Entradas y Salidas</h1>
          <p className="text-sm text-muted-foreground">Registra movimientos y controla el historial del inventario</p>
        </div>
        <button
          onClick={() => { loadBase(); loadMovimientos(); }}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted"
        >
          <RefreshCw className={`w-4 h-4 ${loadingBase || loadingMov ? 'animate-spin' : ''}`} /> Recargar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTipoMovimiento('entrada')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tipoMovimiento === 'entrada' ? 'bg-success text-white' : 'bg-muted text-foreground'}`}
            >
              <ArrowDownToLine className="w-4 h-4 inline mr-1" /> Entrada
            </button>
            <button
              onClick={() => setTipoMovimiento('salida')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tipoMovimiento === 'salida' ? 'bg-destructive text-white' : 'bg-muted text-foreground'}`}
            >
              <ArrowUpFromLine className="w-4 h-4 inline mr-1" /> Salida
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Producto *</label>
              <select
                value={productoId}
                onChange={e => setProductoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cantidad *</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              />
            </div>

            {tipoMovimiento === 'entrada' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Precio de compra</label>
                  <input
                    type="number"
                    min={0}
                    value={precioCompra}
                    onChange={e => setPrecioCompra(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Proveedor</label>
                  <select
                    value={proveedorId}
                    onChange={e => setProveedorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Lote</label>
                  <input
                    value={lote}
                    onChange={e => setLote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
              </>
            )}

            {tipoMovimiento === 'salida' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Motivo *</label>
                <input
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: Venta, ajuste, pérdida"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Quién recibe la mercancía *</label>
              <input
                value={recibidoPor}
                onChange={e => setRecibidoPor(e.target.value)}
                placeholder="Nombre de la persona que recibe"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Notas</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Registrar Movimiento'}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="w-4 h-4" /> Detalle del producto</h3>
          {loadingBase ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : selectedProduct ? (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Código:</span> {selectedProduct.codigo}</p>
              <p><span className="text-muted-foreground">Nombre:</span> {selectedProduct.nombre}</p>
              <p><span className="text-muted-foreground">Stock:</span> {selectedProduct.stock}</p>
              <p><span className="text-muted-foreground">Stock mínimo:</span> {selectedProduct.stock_minimo}</p>
              <p><span className="text-muted-foreground">Precio compra:</span> {formatCurrencyFull(selectedProduct.precio_compra)}</p>
              <p><span className="text-muted-foreground">Precio venta:</span> {formatCurrencyFull(selectedProduct.precio_venta)}</p>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-muted">
                <span className={`w-2 h-2 rounded-full ${getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).status === 'critical' ? 'bg-destructive' : getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).status === 'low' ? 'bg-warning' : 'bg-success'}`} />
                {getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).label}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecciona un producto para ver el detalle.</p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Historial de Movimientos</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-muted">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="px-2 py-1 rounded border border-input bg-card" />
              <span>a</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="px-2 py-1 rounded border border-input bg-card" />
            </div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className="px-2 py-1 rounded border border-input bg-card text-sm">
              <option value="">Todos los tipos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
              <option value="ajuste">Ajustes</option>
            </select>
            <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)} className="px-2 py-1 rounded border border-input bg-card text-sm">
              <option value="">Todos los productos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingMov ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : movimientos ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground">Total movimientos</p>
                <p className="text-lg font-semibold text-foreground">{movimientos.resumen.total_movimientos}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground">Entradas</p>
                <p className="text-lg font-semibold text-foreground">{movimientos.resumen.entradas.unidades}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground">Salidas</p>
                <p className="text-lg font-semibold text-foreground">{movimientos.resumen.salidas.unidades}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Usuario</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Proveedor</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Recibido Por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.movimientos.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString('es-CO')}</td>
                      <td className="px-3 py-2 text-foreground">{m.producto?.nombre || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'entrada' ? 'bg-success/10 text-success' : m.tipo === 'salida' ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">{m.cantidad}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.user?.nombre || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.proveedor?.nombre_empresa || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.recibido_por || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No hay movimientos para el rango seleccionado.</p>
        )}
      </div>
    </div>
  );
};

export default InventoryMovementsPage;
