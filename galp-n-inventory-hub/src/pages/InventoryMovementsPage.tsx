import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Package, Loader2, RefreshCw, Calendar, Download, Plus, Trash2, AlertTriangle } from 'lucide-react';
import productosService, { Producto, ProductoBusqueda } from '@/services/productosService';
import proveedoresService, { Proveedor } from '@/services/proveedoresService';
import reportesService, { MovimientosReporte } from '@/services/reportesService';
import { formatCurrencyFull, getStockStatus } from '@/utils/formatters';

type MovimientoRow = {
  productoId: string;
  productoQuery: string;
  cantidad: number;
  precioCompra: string;
  lote: string;
  notas: string;
};

const createEmptyRow = (): MovimientoRow => ({
  productoId: '',
  productoQuery: '',
  cantidad: 1,
  precioCompra: '',
  lote: '',
  notas: '',
});

const InventoryMovementsPage = () => {
  const location = useLocation();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingMov, setLoadingMov] = useState(true);
  const [movimientos, setMovimientos] = useState<MovimientosReporte | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Producto | null>(null);

  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada');
  const [rows, setRows] = useState<MovimientoRow[]>([createEmptyRow()]);
  const [rowSuggestions, setRowSuggestions] = useState<Record<number, ProductoBusqueda[]>>({});
  const [productosMap, setProductosMap] = useState<Record<number, ProductoBusqueda>>({});

  const rowSearchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const historySearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [facturaCompra, setFacturaCompra] = useState('');
  const [fechaFactura, setFechaFactura] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [referenciaDocumento, setReferenciaDocumento] = useState('');
  const [observacion, setObservacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<'entrada' | 'salida' | 'ajuste' | ''>('');
  const [filtroProductoId, setFiltroProductoId] = useState('');
  const [filtroProductoQuery, setFiltroProductoQuery] = useState('');
  const [filtroProductoSugerencias, setFiltroProductoSugerencias] = useState<ProductoBusqueda[]>([]);

  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const [fechaDesde, setFechaDesde] = useState(defaultStart);
  const [fechaHasta, setFechaHasta] = useState(defaultEnd);

  const mergeProductos = (productos: ProductoBusqueda[]) => {
    setProductosMap(prev => {
      const next = { ...prev };
      productos.forEach(p => {
        next[p.id] = p;
      });
      return next;
    });
  };

  const mapProductoToBusqueda = (p: Producto): ProductoBusqueda => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    presentacion: p.presentacion,
    stock: p.stock,
    stock_minimo: p.stock_minimo,
    precio_compra: p.precio_compra,
    precio_venta: p.precio_venta,
  });

  const buscarProductosFila = (idx: number, query: string) => {
    if (rowSearchTimers.current[idx]) {
      clearTimeout(rowSearchTimers.current[idx]);
    }

    const term = query.trim();
    if (!term) {
      setRowSuggestions(prev => ({ ...prev, [idx]: [] }));
      return;
    }

    rowSearchTimers.current[idx] = setTimeout(async () => {
      try {
        const response = await productosService.buscarRapido(term, 30);
        const data = response.data || [];
        setRowSuggestions(prev => ({ ...prev, [idx]: data }));
        mergeProductos(data);
      } catch {
        setRowSuggestions(prev => ({ ...prev, [idx]: [] }));
      }
    }, 220);
  };

  const buscarProductoHistorial = (query: string) => {
    if (historySearchTimer.current) clearTimeout(historySearchTimer.current);

    const term = query.trim();
    if (!term) {
      setFiltroProductoSugerencias([]);
      setFiltroProductoId('');
      return;
    }

    historySearchTimer.current = setTimeout(async () => {
      try {
        const response = await productosService.buscarRapido(term, 20);
        const data = response.data || [];
        setFiltroProductoSugerencias(data);
        mergeProductos(data);
      } catch {
        setFiltroProductoSugerencias([]);
      }
    }, 220);
  };

  const loadBase = async () => {
    try {
      setLoadingBase(true);
      const provRes = await proveedoresService.getAll({ per_page: 'all' });
      if (provRes.success) setProveedores(provRes.data || []);
    } catch {
      toast.error('No se pudieron cargar proveedores');
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
        producto_id: filtroProductoId ? Number(filtroProductoId) : undefined,
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
    if (!state?.productoId) return;

    const init = async () => {
      try {
        const response = await productosService.getById(state.productoId!);
        if (response.success && response.data) {
          const p = mapProductoToBusqueda(response.data);
          mergeProductos([p]);
          setRows(prev => {
            const next = [...prev];
            next[0] = {
              ...next[0],
              productoId: String(p.id),
              productoQuery: `${p.codigo} - ${p.nombre}`,
            };
            return next;
          });
          if (state.tipo) setTipoMovimiento(state.tipo);
        }
      } catch {
        // sin bloqueo de pantalla
      }
    };

    init();
  }, [location.state]);

  useEffect(() => {
    loadMovimientos();
  }, [fechaDesde, fechaHasta, filtroTipo, filtroProductoId]);

  useEffect(() => {
    const id = Number(rows[0]?.productoId || 0);
    if (!id) {
      setSelectedProductDetail(null);
      return;
    }

    productosService.getById(id)
      .then(response => {
        if (response.success && response.data) {
          mergeProductos([mapProductoToBusqueda(response.data)]);
          setSelectedProductDetail(response.data);
        }
      })
      .catch(() => {
        setSelectedProductDetail(null);
      });
  }, [rows[0]?.productoId]);

  const selectedProduct = useMemo(() => {
    const firstId = Number(rows[0]?.productoId || 0);
    return firstId ? productosMap[firstId] || null : null;
  }, [productosMap, rows]);

  const ultimoMovimiento = useMemo(() => selectedProductDetail?.movimientos?.[0] || null, [selectedProductDetail]);
  const precioPromedioCompra = useMemo(() => {
    const movimientosEntrada = (selectedProductDetail?.movimientos || []).filter(m => m.tipo === 'entrada' && (m.precio_compra || 0) > 0);
    if (movimientosEntrada.length === 0) return null;
    const total = movimientosEntrada.reduce((sum, m) => sum + Number(m.precio_compra || 0), 0);
    return total / movimientosEntrada.length;
  }, [selectedProductDetail]);

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);

  const removeRow = (idx: number) => {
    setRows(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
    setRowSuggestions(prev => ({ ...prev, [idx]: [] }));
    if (rowSearchTimers.current[idx]) clearTimeout(rowSearchTimers.current[idx]);
  };

  const updateRow = (idx: number, changes: Partial<MovimientoRow>) => {
    setRows(prev => prev.map((row, i) => (i === idx ? { ...row, ...changes } : row)));
  };

  const selectProductoFila = (idx: number, producto: ProductoBusqueda) => {
    updateRow(idx, {
      productoId: String(producto.id),
      productoQuery: `${producto.codigo} - ${producto.nombre}`,
    });
    setRowSuggestions(prev => ({ ...prev, [idx]: [] }));
    mergeProductos([producto]);
  };

  const resetForm = () => {
    setRows([createEmptyRow()]);
    setRowSuggestions({});
    setFacturaCompra('');
    setFechaFactura('');
    setProveedorId('');
    setMotivo('');
    setReferenciaDocumento('');
    setObservacion('');
  };

  const handleSubmit = async () => {
    const items = rows.filter(r => r.productoId && r.cantidad > 0);

    if (items.length === 0) {
      toast.error('Selecciona al menos un producto valido');
      return;
    }

    if (tipoMovimiento === 'entrada' && !facturaCompra.trim()) {
      toast.error('La factura de compra es obligatoria para entradas');
      return;
    }

    if (tipoMovimiento === 'salida' && !motivo.trim()) {
      toast.error('El motivo es obligatorio para salidas');
      return;
    }

    try {
      setSubmitting(true);
      let warnings: string[] = [];

      if (tipoMovimiento === 'entrada') {
        const response = await productosService.entradaStockLote({
          factura_compra: facturaCompra.trim(),
          fecha_factura: fechaFactura || undefined,
          proveedor_id: proveedorId ? Number(proveedorId) : undefined,
          observacion: observacion.trim() || undefined,
          productos: items.map(r => ({
            producto_id: Number(r.productoId),
            cantidad: Number(r.cantidad),
            precio_compra: r.precioCompra ? Number(r.precioCompra) : undefined,
            lote: r.lote.trim() || undefined,
            notas: r.notas.trim() || undefined,
          })),
        });
        warnings = response.warnings || [];
        toast.success(`Entrada por lote registrada (${items.length} producto(s))`);
      } else {
        const response = await productosService.salidaStockLote({
          motivo: motivo.trim(),
          referencia_documento: referenciaDocumento.trim() || undefined,
          observacion: observacion.trim() || undefined,
          productos: items.map(r => ({
            producto_id: Number(r.productoId),
            cantidad: Number(r.cantidad),
            notas: r.notas.trim() || undefined,
          })),
        });
        warnings = response.warnings || [];
        toast.success(`Salida por lote registrada (${items.length} producto(s))`);
      }

      if (warnings.length > 0) {
        toast.warning(warnings.slice(0, 2).join(' | '));
      }

      resetForm();
      await loadMovimientos();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo registrar el movimiento por lote');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!movimientos) return;
    const rowsCsv = [
      ['fecha', 'tipo', 'operacion', 'producto', 'cantidad', 'stock_anterior', 'stock_nuevo', 'usuario', 'proveedor', 'registrado_por'],
      ...movimientos.movimientos.map(m => [
        m.created_at,
        m.tipo,
        m.motivo || '',
        m.producto?.nombre || '',
        m.cantidad,
        m.stock_anterior,
        m.stock_nuevo,
        m.user?.nombre || '',
        m.proveedor?.nombre_empresa || '',
        m.recibido_por || '',
      ])
    ];
    const csv = rowsCsv
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
          <p className="text-sm text-muted-foreground">Registra lotes de uno o varios productos en una sola operacion</p>
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
            {tipoMovimiento === 'entrada' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Factura de compra *</label>
                  <input
                    value={facturaCompra}
                    onChange={e => setFacturaCompra(e.target.value)}
                    placeholder="Ej: FC-2026-00125"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fecha factura</label>
                  <input
                    type="date"
                    value={fechaFactura}
                    onChange={e => setFechaFactura(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
                <div className="md:col-span-2">
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
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Motivo salida *</label>
                  <input
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Ej: Venta mostrador"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Documento soporte</label>
                  <input
                    value={referenciaDocumento}
                    onChange={e => setReferenciaDocumento(e.target.value)}
                    placeholder="Ej: Remision 45"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Observacion general</label>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Productos del movimiento</h3>
              <button onClick={addRow} className="px-3 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1 hover:bg-muted">
                <Plus className="w-4 h-4" /> Agregar fila
              </button>
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-border rounded-lg p-3">
                <div className="md:col-span-5 relative">
                  <label className="block text-xs text-muted-foreground mb-1">Producto</label>
                  <input
                    value={row.productoQuery}
                    onChange={e => {
                      const query = e.target.value;
                      updateRow(idx, { productoQuery: query, productoId: '' });
                      buscarProductosFila(idx, query);
                    }}
                    placeholder="Escribe nombre, iniciales o codigo..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                  {rowSuggestions[idx]?.length > 0 && row.productoQuery.trim() && (
                    <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-auto">
                      {rowSuggestions[idx].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => selectProductoFila(idx, p)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-b-0"
                        >
                          <p className="font-medium text-foreground">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">{p.codigo}{p.presentacion ? ` | ${p.presentacion}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={row.cantidad}
                    onChange={e => updateRow(idx, { cantidad: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>

                {tipoMovimiento === 'entrada' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Precio compra</label>
                      <input
                        type="number"
                        min={0}
                        value={row.precioCompra}
                        onChange={e => updateRow(idx, { precioCompra: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Lote</label>
                      <input
                        value={row.lote}
                        onChange={e => updateRow(idx, { lote: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-1 flex items-end justify-end">
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-xs text-muted-foreground mb-1">Nota item</label>
                  <input
                    value={row.notas}
                    onChange={e => updateRow(idx, { notas: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : `Registrar ${tipoMovimiento === 'entrada' ? 'Entrada' : 'Salida'} por Lote`}
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
              <p><span className="text-muted-foreground">Codigo:</span> {selectedProduct.codigo}</p>
              <p><span className="text-muted-foreground">Nombre:</span> {selectedProduct.nombre}</p>
              <p><span className="text-muted-foreground">Stock:</span> {selectedProduct.stock}</p>
              <p><span className="text-muted-foreground">Stock minimo:</span> {selectedProduct.stock_minimo}</p>
              <p><span className="text-muted-foreground">Precio compra:</span> {formatCurrencyFull(selectedProduct.precio_compra)}</p>
              <p><span className="text-muted-foreground">Precio compra promedio:</span> {precioPromedioCompra ? formatCurrencyFull(precioPromedioCompra) : '-'}</p>
              <p><span className="text-muted-foreground">Precio venta:</span> {formatCurrencyFull(selectedProduct.precio_venta)}</p>
              <p><span className="text-muted-foreground">Ultimo movimiento:</span> {ultimoMovimiento ? `${ultimoMovimiento.tipo} | ${ultimoMovimiento.cantidad} u` : '-'}</p>
              <p><span className="text-muted-foreground">Fecha ultimo movimiento:</span> {ultimoMovimiento ? new Date(ultimoMovimiento.created_at).toLocaleString('es-CO') : '-'}</p>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-muted">
                <span className={`w-2 h-2 rounded-full ${getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).status === 'critical' ? 'bg-destructive' : getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).status === 'low' ? 'bg-warning' : 'bg-success'}`} />
                {getStockStatus(selectedProduct.stock, selectedProduct.stock_minimo).label}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecciona un producto en la primera fila para ver detalle.</p>
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
            <div className="relative min-w-[240px]">
              <input
                value={filtroProductoQuery}
                onChange={e => {
                  const value = e.target.value;
                  setFiltroProductoQuery(value);
                  setFiltroProductoId('');
                  buscarProductoHistorial(value);
                }}
                placeholder="Filtrar por producto..."
                className="px-2 py-1 rounded border border-input bg-card text-sm w-full"
              />
              {filtroProductoSugerencias.length > 0 && filtroProductoQuery.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-auto">
                  {filtroProductoSugerencias.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => {
                        setFiltroProductoId(String(p.id));
                        setFiltroProductoQuery(`${p.codigo} - ${p.nombre}`);
                        setFiltroProductoSugerencias([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-b-0"
                    >
                      <p className="font-medium text-foreground">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingMov ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : movimientos ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
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
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground">Neto stock</p>
                <p className={`text-lg font-semibold ${(movimientos.resumen.entradas.unidades - movimientos.resumen.salidas.unidades) < 0 ? 'text-destructive' : 'text-success'}`}>
                  {movimientos.resumen.entradas.unidades - movimientos.resumen.salidas.unidades}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Operacion</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Stock Antes</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Stock Despues</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Usuario</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Proveedor</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.movimientos.map(m => {
                    const esGrande = m.cantidad >= 20;
                    const esAjuste = m.tipo === 'ajuste';
                    const stockMinimo = Number(m.producto?.stock_minimo || 0);
                    const quedoCritico = stockMinimo > 0 && m.stock_nuevo <= stockMinimo;
                    const operacion = m.motivo || (m.tipo === 'entrada' ? 'Entrada manual' : m.tipo === 'salida' ? 'Salida manual' : 'Ajuste manual');
                    return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString('es-CO')}</td>
                      <td className="px-3 py-2 text-foreground">{m.producto?.nombre || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'entrada' ? 'bg-success/10 text-success' : m.tipo === 'salida' ? 'bg-destructive/10 text-destructive' : 'bg-info/10 text-info'}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground">{operacion}</span>
                          {esGrande && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-warning/20 text-warning-foreground flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Grande
                            </span>
                          )}
                          {esAjuste && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-info/20 text-info">Ajuste</span>
                          )}
                          {quedoCritico && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive">Stock critico</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${esGrande ? 'text-warning-foreground' : 'text-foreground'}`}>{m.cantidad}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{m.stock_anterior}</td>
                      <td className={`px-3 py-2 text-right ${quedoCritico ? 'text-destructive font-semibold' : 'text-foreground'}`}>{m.stock_nuevo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.user?.nombre || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.proveedor?.nombre_empresa || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.recibido_por || '-'}</td>
                    </tr>
                  )})}
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
