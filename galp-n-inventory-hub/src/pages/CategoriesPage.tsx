import { useMemo, useState, useEffect } from 'react';
import categoriasService, { Categoria } from '@/services/categoriasService';
import reportesService, { ProductoPorCategoria } from '@/services/reportesService';
import { formatCurrencyFull, getCategoryEmoji } from '@/utils/formatters';
import { ChevronRight, Search, Package, Wallet, Layers3 } from 'lucide-react';
import { toast } from 'sonner';

const CategoriesPage = () => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [reportData, setReportData] = useState<ProductoPorCategoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [catsRes, reportRes] = await Promise.all([
          categoriasService.getAll(),
          reportesService.getProductosPorCategoria(),
        ]);

        if (catsRes.success) setCategorias(catsRes.data || []);
        if (reportRes.success) setReportData(reportRes.data || []);
      } catch {
        toast.error('No se pudieron cargar las categorías');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const enriched = useMemo(() => {
    const map = new Map(reportData.map(r => [r.id, r]));
    return categorias.map(cat => {
      const report = map.get(cat.id);
      return {
        ...cat,
        totalProductos: report?.total_productos ?? cat.productos_count ?? 0,
        valorInventario: report?.valor_inventario ?? 0,
        subcategoriasLista: (cat.subcategorias || []).map(s => s.nombre),
      };
    });
  }, [categorias, reportData]);

  const filtered = useMemo(
    () => enriched.filter(cat => {
      const term = search.toLowerCase();
      return (
        cat.nombre.toLowerCase().includes(term) ||
        cat.subcategoriasLista.some(s => s.toLowerCase().includes(term))
      );
    }),
    [enriched, search]
  );

  const totalProducts = enriched.reduce((sum, cat) => sum + cat.totalProductos, 0);
  const totalValue = enriched.reduce((sum, cat) => sum + cat.valorInventario, 0);
  const selected = selectedId ? enriched.find(c => c.id === selectedId) : null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-sidebar rounded-xl p-5 sm:p-6 shadow-md">
        <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground">Categorías de Productos</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Explora el inventario por categoría con una vista más ordenada y analítica</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Layers3 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Categorías</p><p className="text-xl font-bold text-foreground">{enriched.length}</p></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center"><Package className="w-5 h-5 text-info" /></div>
            <div><p className="text-xs text-muted-foreground">Productos Totales</p><p className="text-xl font-bold text-foreground">{totalProducts}</p></div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-xl font-bold text-foreground">{formatCurrencyFull(totalValue)}</p></div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar categoría o subcategoría..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">Cargando categorías...</div>
        )}
        {!loading && filtered.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedId(cat.id)}
            className="w-full text-left bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shrink-0"
                style={{ backgroundColor: cat.color || 'var(--primary)' }}
              >
                {getCategoryEmoji(cat.slug || cat.nombre.toLowerCase(), cat.icono)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{cat.nombre}</h3>
                <p className="text-sm text-muted-foreground">{cat.descripcion || 'Sin descripción'}</p>
                <div className="flex items-center gap-6 mt-2">
                  <div><span className="text-lg font-bold text-foreground">{cat.totalProductos}</span><span className="text-xs text-muted-foreground ml-1">Productos</span></div>
                  <div><span className="text-lg font-bold text-foreground">{formatCurrencyFull(cat.valorInventario)}</span><span className="text-xs text-muted-foreground ml-1">Valor</span></div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </div>
          </button>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No se encontraron categorías con ese criterio.</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-1">{selected.nombre}</h3>
            <p className="text-sm text-muted-foreground mb-4">{selected.descripcion || 'Sin descripción'}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Productos</p><p className="text-lg font-bold text-foreground">{selected.totalProductos}</p></div>
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Valor</p><p className="text-lg font-bold text-foreground">{formatCurrencyFull(selected.valorInventario)}</p></div>
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Subcategorías</p>
            <div className="flex flex-wrap gap-2">
              {selected.subcategoriasLista.length > 0
                ? selected.subcategoriasLista.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-muted text-xs text-foreground">{s}</span>)
                : <span className="text-xs text-muted-foreground">No hay subcategorías registradas</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
