import { useEffect, useMemo, useRef, useState } from 'react';
import { getStockStatus, formatCurrencyFull, getCategoryEmoji, formatNumber } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { Search, Plus, Download, Eye, ArrowDownToLine, Pencil, Trash2, Loader2, RefreshCw, ArrowUpFromLine, FileSpreadsheet, AlertTriangle, BarChart3, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MobileTable from '@/components/ui/mobile-table';
import { toast } from 'sonner';
import productosService, { Producto } from '@/services/productosService';
import categoriasService, { Categoria } from '@/services/categoriasService';

const INACTIVIDAD_DIAS = 30;

const ProductsPage = () => {
  const isAdmin = useAuthStore(s => s.user?.rol === 'admin');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Producto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const q = params.get('q') || '';
    const categoriaId = params.get('categoria_id') || '';
    setSearch(q);
    setCatFilter(categoriaId);
    setPage(1);
  }, [params]);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const response = await categoriasService.getAll();
        if (response.success) setCategorias(response.data || []);
      } catch {
        setCategorias([]);
      }
    };
    loadCategorias();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadProductos(page, search, catFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [page, search, catFilter]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedProductDetail(null);
      return;
    }

    const loadDetalle = async () => {
      try {
        setIsLoadingDetail(true);
        const response = await productosService.getById(selectedId);
        if (response.success) {
          setSelectedProductDetail(response.data);
        }
      } catch {
        setSelectedProductDetail(null);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetalle();
  }, [selectedId]);

  const loadProductos = async (currentPage: number, term: string, categoriaId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productosService.getAll({
        page: currentPage,
        buscar: term || undefined,
        categoria_id: categoriaId ? Number(categoriaId) : undefined,
        per_page: 15,
      });
      if (response.success) {
        const pageData = response.data;
        setProductos(pageData.data || []);
        setTotal(pageData.total || 0);
        setLastPage(pageData.last_page || 1);
      } else {
        throw new Error(response.message || 'No se pudieron cargar los productos');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudieron cargar los productos');
      setProductos([]);
      setTotal(0);
      setLastPage(1);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = useMemo(() => {
    if (!selectedId) return null;
    return selectedProductDetail || productos.find(p => p.id === selectedId) || null;
  }, [productos, selectedId, selectedProductDetail]);

  const getEstadoInfo = (producto: Producto) => {
    if (producto.stock <= 0) return { label: 'Agotado', tone: 'bg-destructive/10 text-destructive' };
    const s = getStockStatus(producto.stock, producto.stock_minimo);
    if (s.status === 'critical') return { label: 'Critico', tone: 'bg-destructive/10 text-destructive' };
    if (s.status === 'low') return { label: 'Bajo', tone: 'bg-warning/10 text-warning' };
    return { label: 'Normal', tone: 'bg-success/10 text-success' };
  };

  const calcularMargen = (producto: Producto) => {
    if (producto.precio_compra <= 0) return null;
    return ((producto.precio_venta - producto.precio_compra) / producto.precio_compra) * 100;
  };

  const tieneInactividad = (fecha?: string | null) => {
    if (!fecha) return true;
    const dias = (Date.now() - new Date(fecha).getTime()) / 86400000;
    return dias >= INACTIVIDAD_DIAS;
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const header = ['codigo', 'nombre', 'categoria', 'subcategoria', 'stock', 'stock_minimo', 'estado', 'precio_compra', 'precio_venta', 'margen_pct', 'proveedor'];
    const rows = productos.map(p => [
      p.codigo,
      p.nombre,
      p.categoria?.nombre || '',
      p.subcategoria?.nombre || '',
      p.stock,
      p.stock_minimo,
      getEstadoInfo(p).label,
      p.precio_compra,
      p.precio_venta,
      calcularMargen(p)?.toFixed(1) ?? '',
      p.proveedor?.nombre_empresa || '',
    ]);
    const csv = [header, ...rows]
      .map(cols => cols.map(col => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(csv, `productos-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Exportacion completada');
  };

  const handleQuickIngreso = (codigo: string) => {
    navigate('/stock-bajo', { state: { focusCode: codigo } });
    toast.info(`Stock bajo filtrado para ${codigo}`);
  };

  const handleMoveEntry = (id: number) => {
    navigate('/movimientos-inventario', { state: { productoId: id, tipo: 'entrada' } });
  };

  const handleMoveExit = (id: number) => {
    navigate('/movimientos-inventario', { state: { productoId: id, tipo: 'salida' } });
  };

  const handleEditBase = (codigo: string) => {
    navigate('/productos/nuevo', { state: { codigoBase: codigo } });
    toast.info('Formulario abierto con codigo base');
  };

  const handleDelete = async (producto: Producto) => {
    if (!confirm(`Eliminar ${producto.nombre} (${producto.codigo})? Esta accion no se puede deshacer.`)) return;
    const confirmCode = prompt(`Escribe el codigo ${producto.codigo} para confirmar`);
    if (confirmCode !== producto.codigo) {
      toast.error('Confirmacion incorrecta. No se elimino el producto.');
      return;
    }

    try {
      await productosService.delete(producto.id);
      toast.success('Producto eliminado correctamente');
      if (selectedId === producto.id) setSelectedId(null);
      loadProductos(page, search, catFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar el producto');
    }
  };

  const handleClickImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isExcel) {
      toast.error('Selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    try {
      setImporting(true);
      const response = await productosService.importarExcel(file, {
        sobrescribir_existentes: true,
      });

      if (response.success) {
        const { creados, actualizados, omitidos, errores } = response.data;
        const resumen = `Importacion completada: ${creados} creados, ${actualizados} actualizados, ${omitidos} omitidos.`;
        if (errores?.length) {
          toast.warning(`${resumen} ${errores.length} fila(s) con error.`);
          console.error('Errores importacion productos:', errores);
        } else {
          toast.success(resumen);
        }

        await loadProductos(1, search, catFilter);
        setPage(1);
      } else {
        toast.error(response.message || 'No se pudo importar el archivo');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion de Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra todos los productos del inventario</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <button
                onClick={handleClickImport}
                disabled={importing}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span className="hidden xs:inline">Importar Excel</span>
                <span className="xs:hidden">Importar</span>
              </button>
            </>
          )}
          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Exportar</span>
          </button>
          <button
            onClick={() => loadProductos(page, search, catFilter)}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Recargar</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate('/productos/nuevo')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Nuevo</span>
              <span className="xs:hidden">Agregar</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => {
              const value = e.target.value;
              setSearch(value);
              const next = new URLSearchParams(params);
              if (value.trim()) next.set('q', value);
              else next.delete('q');
              setParams(next, { replace: true });
              setPage(1);
            }}
            placeholder="Buscar por nombre o codigo..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => {
            const value = e.target.value;
            setCatFilter(value);
            const next = new URLSearchParams(params);
            if (value) next.set('categoria_id', value);
            else next.delete('categoria_id');
            setParams(next, { replace: true });
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
        >
          <option value="">Todas las categorias</option>
          {categorias.map(cat => (
            <option key={cat.id} value={String(cat.id)}>{getCategoryEmoji(cat.slug || cat.nombre.toLowerCase(), cat.icono)} {cat.nombre}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/movimientos-inventario')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted">Entradas y Salidas</button>
        <button onClick={() => navigate('/stock-bajo')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Stock Bajo</button>
        <button onClick={() => navigate('/reportes')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Reportes</button>
        {isAdmin && (
          <button onClick={() => navigate('/auditoria?modulo=inventario')} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Auditoria</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
          {error}
          <button onClick={() => loadProductos(page, search, catFilter)} className="ml-4 underline">Reintentar</button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Codigo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">P.Compra</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">P.Venta</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Margen</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Inv.</th>
                  {isAdmin && <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {productos.map(p => {
                  const estado = getEstadoInfo(p);
                  const margen = calcularMargen(p);
                  const sinMovimiento = tieneInactividad(p.ultimo_movimiento_at);

                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{getCategoryEmoji(p.categoria?.nombre?.toLowerCase() || '', p.categoria?.icono)} {p.nombre}</div>
                        <div className="text-xs text-muted-foreground">{p.categoria?.nombre || '-'}{p.subcategoria?.nombre ? ` / ${p.subcategoria.nombre}` : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${estado.tone}`}>{estado.label}</span>
                          {sinMovimiento && <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Sin mov.</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-medium text-foreground">{p.stock}</div>
                        <div className="text-xs text-muted-foreground">min {p.stock_minimo}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrencyFull(p.precio_compra)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{formatCurrencyFull(p.precio_venta)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${margen !== null && margen < 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {margen !== null ? `${margen.toFixed(1)}%` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCurrencyFull(p.stock * p.precio_compra)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setSelectedId(p.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Ver detalle de producto"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleMoveEntry(p.id)} className="p-1.5 rounded-md hover:bg-muted text-success hover:text-success" title="Registrar entrada de inventario"><ArrowDownToLine className="w-4 h-4" /></button>
                            <button onClick={() => handleMoveExit(p.id)} className="p-1.5 rounded-md hover:bg-muted text-destructive hover:text-destructive" title="Registrar salida de inventario"><ArrowUpFromLine className="w-4 h-4" /></button>
                            <button onClick={() => handleQuickIngreso(p.codigo)} className="p-1.5 rounded-md hover:bg-muted text-warning hover:text-warning" title="Ir al modulo Stock Bajo"><AlertTriangle className="w-4 h-4" /></button>
                            <button onClick={() => handleEditBase(p.codigo)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Abrir Agregar Producto con codigo base"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(p)} className="p-1.5 rounded-md hover:bg-muted text-destructive hover:text-destructive" title="Eliminar producto (accion sensible)"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <MobileTable
            data={productos}
            keyExtractor={(p) => String(p.id)}
            columns={[
              {
                key: 'producto',
                label: 'Producto',
                render: (p) => (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{getCategoryEmoji(p.categoria?.nombre?.toLowerCase() || '', p.categoria?.icono)}</span>
                      <span className="font-medium">{p.nombre}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.categoria?.nombre || '-'}</div>
                  </div>
                )
              },
              {
                key: 'stock',
                label: 'Stock',
                render: (p) => {
                  const estado = getEstadoInfo(p);
                  return (
                    <div className="space-y-1">
                      <div className="font-medium">{p.stock} / min {p.stock_minimo}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${estado.tone}`}>{estado.label}</span>
                    </div>
                  );
                }
              },
              {
                key: 'precios',
                label: 'Precios',
                render: (p) => (
                  <div className="text-xs">
                    <div>C: {formatCurrencyFull(p.precio_compra)}</div>
                    <div>V: {formatCurrencyFull(p.precio_venta)}</div>
                  </div>
                )
              },
              {
                key: 'valorTotal',
                label: 'Valor Inv.',
                render: (p) => formatCurrencyFull(p.stock * p.precio_compra)
              }
            ]}
            onItemClick={(p) => setSelectedId(p.id)}
            emptyMessage="No se encontraron productos"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
            <p>Mostrando {productos.length} de {formatNumber(total)} productos</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-border disabled:opacity-50"
              >
                Anterior
              </button>
              <span>Pagina {page} de {lastPage}</span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="px-3 py-1 rounded border border-border disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/45 p-4 flex items-center justify-center" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-foreground">Detalle de producto</h3>
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSelectedId(null)}>Cerrar</button>
            </div>

            {isLoadingDetail ? (
              <div className="py-8 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Codigo:</span> <span className="font-medium">{selectedProduct.codigo}</span></p>
                  <p><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{getEstadoInfo(selectedProduct).label}</span></p>
                  <p><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{selectedProduct.nombre}</span></p>
                  <p><span className="text-muted-foreground">Proveedor:</span> {selectedProduct.proveedor?.nombre_empresa || '-'}</p>
                  <p><span className="text-muted-foreground">Stock:</span> {selectedProduct.stock}</p>
                  <p><span className="text-muted-foreground">Stock minimo:</span> {selectedProduct.stock_minimo}</p>
                  <p><span className="text-muted-foreground">Compra:</span> {formatCurrencyFull(selectedProduct.precio_compra)}</p>
                  <p><span className="text-muted-foreground">Venta:</span> {formatCurrencyFull(selectedProduct.precio_venta)}</p>
                  <p><span className="text-muted-foreground">Margen:</span> {calcularMargen(selectedProduct)?.toFixed(1) ?? '-'}%</p>
                  <p><span className="text-muted-foreground">Valor inventario:</span> {formatCurrencyFull(selectedProduct.stock * selectedProduct.precio_compra)}</p>
                  <p className="sm:col-span-2"><span className="text-muted-foreground">Ultimo movimiento:</span> {selectedProduct.movimientos?.[0] ? `${selectedProduct.movimientos[0].tipo} (${selectedProduct.movimientos[0].cantidad}) - ${new Date(selectedProduct.movimientos[0].created_at).toLocaleString('es-CO')}` : 'Sin movimientos'}</p>
                </div>

                {tieneInactividad(selectedProduct.ultimo_movimiento_at || selectedProduct.movimientos?.[0]?.created_at) && (
                  <div className="mt-3 text-xs rounded-lg px-3 py-2 bg-warning/15 text-warning-foreground">
                    Producto sin movimiento reciente ({INACTIVIDAD_DIAS}+ dias).
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleMoveEntry(selectedProduct.id)}
                    className="px-3 py-2 rounded-lg bg-success text-white text-xs font-medium"
                  >
                    Entrada
                  </button>
                  <button
                    onClick={() => handleMoveExit(selectedProduct.id)}
                    className="px-3 py-2 rounded-lg bg-destructive text-white text-xs font-medium"
                  >
                    Salida
                  </button>
                  <button
                    onClick={() => navigate('/auditoria?referencia=' + encodeURIComponent(selectedProduct.codigo))}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-medium"
                  >
                    Auditoria
                  </button>
                  <button
                    onClick={() => navigate('/reportes')}
                    className="px-3 py-2 rounded-lg border border-border text-xs font-medium"
                  >
                    Reportes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
