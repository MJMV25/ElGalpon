import { useState } from 'react';
import { MOCK_PRODUCTOS, CATEGORIAS } from '@/data/mockData';
import { getStockStatus, formatCurrencyFull, getCategoryEmoji } from '@/utils/formatters';
import { useAuthStore } from '@/store/authStore';
import { Search, Plus, Download, Eye, ArrowDownToLine, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileTable from '@/components/ui/mobile-table';

const ProductsPage = () => {
  const isAdmin = useAuthStore(s => s.user?.rol === 'admin');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const filtered = MOCK_PRODUCTOS.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra todos los productos del inventario</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-1.5 hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Exportar</span>
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.nombre}</option>
          ))}
        </select>
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Categoría</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">P.Compra</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">P.Venta</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Valor Total</th>
              {isAdmin && <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const s = getStockStatus(p.stock, p.stockMin);
              return (
                <tr key={p.codigo} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{getCategoryEmoji(p.categoria)} {p.nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{CATEGORIAS[p.categoria as keyof typeof CATEGORIAS]?.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'critical' ? 'bg-destructive/10 text-destructive' :
                      s.status === 'low' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    }`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrencyFull(p.precioCompra)}</td>
                  <td className="px-4 py-3 text-right text-foreground font-medium">{formatCurrencyFull(p.precioVenta)}</td>
                  <td className="px-4 py-3 text-right text-foreground">{formatCurrencyFull(p.stock * p.precioVenta)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><ArrowDownToLine className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-md hover:bg-muted text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <MobileTable
        data={filtered}
        keyExtractor={(p) => p.codigo}
        columns={[
          {
            key: 'producto',
            label: 'Producto',
            render: (p) => (
              <div className="flex items-center gap-2">
                <span>{getCategoryEmoji(p.categoria)}</span>
                <span className="font-medium">{p.nombre}</span>
              </div>
            )
          },
          {
            key: 'codigo',
            label: 'Código',
            render: (p) => <code className="text-xs bg-muted px-2 py-0.5 rounded">{p.codigo}</code>
          },
          {
            key: 'stock',
            label: 'Stock',
            render: (p) => {
              const s = getStockStatus(p.stock, p.stockMin);
              return (
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  s.status === 'critical' ? 'bg-destructive/10 text-destructive' :
                  s.status === 'low' ? 'bg-warning/10 text-warning' :
                  'bg-success/10 text-success'
                }`}>
                  {p.stock}
                </span>
              );
            }
          },
          {
            key: 'categoria',
            label: 'Categoría',
            render: (p) => CATEGORIAS[p.categoria as keyof typeof CATEGORIAS]?.nombre
          },
          {
            key: 'precioVenta',
            label: 'Precio Venta',
            render: (p) => <span className="font-semibold text-primary">{formatCurrencyFull(p.precioVenta)}</span>
          },
          {
            key: 'valorTotal',
            label: 'Valor Total',
            render: (p) => formatCurrencyFull(p.stock * p.precioVenta)
          }
        ]}
        onItemClick={(p) => {
          // Navegar a detalles del producto
          console.log('Ver producto:', p);
        }}
        emptyMessage="No se encontraron productos"
      />
      <p className="text-xs text-muted-foreground text-center">Mostrando {filtered.length} de 1,247 productos</p>
    </div>
  );
};

export default ProductsPage;
