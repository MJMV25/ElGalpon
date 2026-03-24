import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import categoriasService, { Categoria } from '@/services/categoriasService';
import { formatCurrencyFull, getCategoryEmoji } from '@/utils/formatters';
import { ChevronRight, Search, Package, Wallet, Layers3, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(s => s.user?.rol === 'admin');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newCategoria, setNewCategoria] = useState({
    nombre: '',
    descripcion: '',
    color: '#2563eb',
    icono: 'fa-box',
  });

  const load = async () => {
    try {
      setLoading(true);
      const catsRes = await categoriasService.getAll({ include_metrics: true });

      if (catsRes.success) setCategorias(catsRes.data || []);
    } catch {
      toast.error('No se pudieron cargar las categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(() => {
    return categorias.map(cat => ({
      ...cat,
      totalProductos: cat.total_productos ?? cat.productos_count ?? 0,
      valorInventario: Number(cat.valor_inventario ?? 0),
      subcategoriasLista: (cat.subcategorias || []).map(s => s.nombre),
    }));
  }, [categorias]);

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

  const handleCreateCategoria = async () => {
    if (!newCategoria.nombre.trim()) {
      toast.error('El nombre de la categoria es obligatorio');
      return;
    }

    try {
      setCreating(true);
      await categoriasService.create({
        nombre: newCategoria.nombre.trim(),
        descripcion: newCategoria.descripcion.trim() || undefined,
        color: newCategoria.color.trim() || undefined,
        icono: newCategoria.icono.trim() || undefined,
      });
      toast.success('Categoria creada correctamente');
      setShowCreate(false);
      setNewCategoria({ nombre: '', descripcion: '', color: '#2563eb', icono: 'fa-box' });
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo crear la categoria');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCategoria = async (categoria: Categoria) => {
    const confirmDelete = confirm(`Eliminar la categoria "${categoria.nombre}"?`);
    if (!confirmDelete) return;

    try {
      setDeletingId(categoria.id);
      await categoriasService.delete(categoria.id);
      toast.success('Categoria eliminada correctamente');
      if (selectedId === categoria.id) setSelectedId(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la categoria');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary to-sidebar rounded-xl p-5 sm:p-6 shadow-md">
        <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground">Categorias de Productos</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Explora el inventario por categoria con una vista mas ordenada y analitica</p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nueva categoria
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Layers3 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Categorias</p><p className="text-xl font-bold text-foreground">{enriched.length}</p></div>
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
          placeholder="Buscar categoria o subcategoria..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">Cargando categorias...</div>
        )}
        {!loading && filtered.map(cat => (
          <div key={cat.id} className="w-full text-left bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-5">
              <button onClick={() => setSelectedId(cat.id)} className="flex items-center gap-5 flex-1 min-w-0 text-left">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shrink-0"
                  style={{ backgroundColor: cat.color || 'var(--primary)' }}
                >
                  {getCategoryEmoji(cat.slug || cat.nombre.toLowerCase(), cat.icono)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{cat.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{cat.descripcion || 'Sin descripcion'}</p>
                  <div className="flex items-center gap-6 mt-2">
                    <div><span className="text-lg font-bold text-foreground">{cat.totalProductos}</span><span className="text-xs text-muted-foreground ml-1">Productos</span></div>
                    <div><span className="text-lg font-bold text-foreground">{formatCurrencyFull(cat.valorInventario)}</span><span className="text-xs text-muted-foreground ml-1">Valor</span></div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleDeleteCategoria(cat)}
                  disabled={deletingId === cat.id}
                  className="p-2 rounded-lg border border-border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  title="Eliminar categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No se encontraron categorias con ese criterio.</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-1">{selected.nombre}</h3>
            <p className="text-sm text-muted-foreground mb-4">{selected.descripcion || 'Sin descripcion'}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Productos</p><p className="text-lg font-bold text-foreground">{selected.totalProductos}</p></div>
              <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Valor</p><p className="text-lg font-bold text-foreground">{formatCurrencyFull(selected.valorInventario)}</p></div>
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Subcategorias</p>
            <div className="flex flex-wrap gap-2">
              {selected.subcategoriasLista.length > 0
                ? selected.subcategoriasLista.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-muted text-xs text-foreground">{s}</span>)
                : <span className="text-xs text-muted-foreground">No hay subcategorias registradas</span>}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => navigate(`/productos?categoria_id=${selected.id}`)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Ver productos de esta categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Nueva categoria</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre *</label>
                <input
                  value={newCategoria.nombre}
                  onChange={e => setNewCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descripcion</label>
                <textarea
                  value={newCategoria.descripcion}
                  onChange={e => setNewCategoria(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Color</label>
                  <input
                    type="color"
                    value={newCategoria.color}
                    onChange={e => setNewCategoria(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Icono</label>
                  <input
                    value={newCategoria.icono}
                    onChange={e => setNewCategoria(prev => ({ ...prev, icono: e.target.value }))}
                    placeholder="fa-box"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCategoria}
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {creating ? 'Guardando...' : 'Crear categoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
