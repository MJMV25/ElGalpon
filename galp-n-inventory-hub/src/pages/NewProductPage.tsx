import { useMemo, useState, useEffect } from 'react';
import categoriasService, { Categoria } from '@/services/categoriasService';
import proveedoresService, { Proveedor } from '@/services/proveedoresService';
import productosService from '@/services/productosService';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';

const NewProductPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    codigo: location.state?.codigoBase || '',
    nombre: '',
    categoria_id: '',
    subcategoria_id: '',
    stock: 0,
    stock_minimo: 10,
    precio_compra: 0,
    precio_venta: 0,
    proveedor_id: '',
    ubicacion: '',
    descripcion: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [catsRes, provRes] = await Promise.all([
          categoriasService.getAll(),
          proveedoresService.getAll({ per_page: 'all' })
        ]);
        if (catsRes.success) setCategorias(catsRes.data || []);
        if (provRes.success) setProveedores(provRes.data || []);
      } catch {
        toast.error('No se pudieron cargar categorías o proveedores');
      }
    };
    load();
  }, []);

  const categoriaSeleccionada = categorias.find(c => c.id === Number(form.categoria_id));
  const subcategorias = categoriaSeleccionada?.subcategorias || [];

  const margen = form.precio_compra > 0
    ? (((form.precio_venta - form.precio_compra) / form.precio_compra) * 100).toFixed(1)
    : '0';
  const ganancia = form.precio_venta - form.precio_compra;

  const isFromBase = useMemo(() => Boolean(location.state?.codigoBase), [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria_id: Number(form.categoria_id),
        subcategoria_id: form.subcategoria_id ? Number(form.subcategoria_id) : null,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        ubicacion: form.ubicacion.trim() || null,
      };

      const response = await productosService.create(payload);
      if (response.success) {
        toast.success('Producto guardado exitosamente');
        navigate('/productos');
      } else {
        toast.error(response.message || 'No se pudo crear el producto');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Agregar Nuevo Producto</h1>
        <p className="text-sm text-muted-foreground">Complete el formulario para registrar un nuevo producto</p>
        {isFromBase && (
          <p className="text-xs text-primary mt-1">Se detectó código base desde el listado. Puedes usarlo como referencia y ajustarlo.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-xl p-5 sm:p-6">
        <section>
          <h2 className="text-sm font-semibold text-primary mb-3">Información Básica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Código del Producto *</label>
              <input
                value={form.codigo}
                onChange={e => setForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                placeholder="Ej: ALI-001"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nombre del Producto *</label>
              <input
                value={form.nombre}
                onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre completo del producto"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoría *</label>
              <select
                value={form.categoria_id}
                onChange={e => setForm(prev => ({ ...prev, categoria_id: e.target.value, subcategoria_id: '' }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subcategoría</label>
              <select
                value={form.subcategoria_id}
                onChange={e => setForm(prev => ({ ...prev, subcategoria_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
                disabled={!form.categoria_id}
              >
                <option value="">Seleccionar subcategoría...</option>
                {subcategorias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-primary mb-3">Inventario y Precios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Stock Inicial *</label>
              <input
                type="number"
                value={form.stock}
                onChange={e => setForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                min={0}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Stock Mínimo *</label>
              <input
                type="number"
                value={form.stock_minimo}
                onChange={e => setForm(prev => ({ ...prev, stock_minimo: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                min={0}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Precio de Compra</label>
              <div className="flex">
                <span className="px-2 py-2 rounded-l-lg border border-r-0 border-input bg-muted text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  value={form.precio_compra}
                  onChange={e => setForm(prev => ({ ...prev, precio_compra: Number(e.target.value) }))}
                  className="flex-1 px-3 py-2 rounded-r-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Precio de Venta *</label>
              <div className="flex">
                <span className="px-2 py-2 rounded-l-lg border border-r-0 border-input bg-muted text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  value={form.precio_venta}
                  onChange={e => setForm(prev => ({ ...prev, precio_venta: Number(e.target.value) }))}
                  className="flex-1 px-3 py-2 rounded-r-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  min={0}
                  required
                />
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-muted text-sm">
            Margen de ganancia: <strong className="text-primary">{margen}%</strong> <span className="text-muted-foreground">(${ganancia.toLocaleString()} por unidad)</span>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-primary mb-3">Proveedor y Ubicación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Proveedor</label>
              <select
                value={form.proveedor_id}
                onChange={e => setForm(prev => ({ ...prev, proveedor_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ubicación en Bodega</label>
              <input
                value={form.ubicacion}
                onChange={e => setForm(prev => ({ ...prev, ubicacion: e.target.value }))}
                placeholder="Ej: Estante A-3"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-primary mb-3">Descripción</h2>
          <textarea
            value={form.descripcion}
            onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Descripción detallada del producto..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </section>

        <div className="flex gap-3 justify-center">
          <button type="button" onClick={() => navigate('/productos')} className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Cancelar</button>
          <button type="reset" onClick={() => setForm(prev => ({ ...prev, nombre: '', descripcion: '', ubicacion: '' }))} className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted">Limpiar</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">Guardar Producto</button>
        </div>
      </form>
    </div>
  );
};

export default NewProductPage;
