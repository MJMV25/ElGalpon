import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { formatCurrencyFull, getInitials } from '@/utils/formatters';
import { Search, Plus, RefreshCw, Eye, Pencil, Phone, Truck, CheckCircle, X, Loader2, Trash2, Building2, Mail, MapPin, User, Briefcase, Star } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Proveedor {
  id: number;
  nombre_empresa: string;
  nit: string;
  linea_producto: string;
  ciudad: string;
  direccion: string;
  email_administrativo: string;
  telefono_administrativo: string;
  nombre_asesor: string;
  cargo_asesor: string;
  telefono_contacto: string;
  email_comercial: string;
  notas: string | null;
  calificacion: number | null;
  activo: boolean;
}

const provColors = ['bg-cat-accesorios', 'bg-cat-alimentos', 'bg-primary', 'bg-cat-medicamentos', 'bg-cat-insumos', 'bg-cat-suplementos'];

const SuppliersPage = () => {
  const isAdmin = useAuthStore(s => s.user?.rol === 'admin');
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null);
  const [viewingProveedor, setViewingProveedor] = useState<Proveedor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nombre_empresa: '',
    nit: '',
    linea_producto: '',
    ciudad: '',
    direccion: '',
    email_administrativo: '',
    telefono_administrativo: '',
    nombre_asesor: '',
    cargo_asesor: '',
    telefono_contacto: '',
    email_comercial: '',
    notas: '',
  });

  // Cargar proveedores desde el backend
  const loadProveedores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/proveedores');

      console.log('📦 Respuesta completa proveedores:', response.data);

      // Backend devuelve: { success: true, data: [...] } o { success: true, data: { data: [...], ... } }
      let data;
      if (response.data?.success) {
        // Si data.data es un array, usarlo directamente
        if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        // Si data.data es un objeto con data (paginado), extraer data.data.data
        else if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        }
        // Fallback
        else {
          data = [];
        }
      } else {
        data = [];
      }

      console.log('👥 Proveedores procesados:', data.length, data);
      setProveedores(data);
    } catch (err: any) {
      console.error('❌ Error cargando proveedores:', err);
      setError(err.response?.data?.message || 'Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProveedores();
  }, []);

  const filtered = proveedores.filter(p => {
    const matchSearch = p.nombre_empresa.toLowerCase().includes(search.toLowerCase()) ||
                       p.nit.toLowerCase().includes(search.toLowerCase()) ||
                       p.email_administrativo.toLowerCase().includes(search.toLowerCase()) ||
                       p.email_comercial.toLowerCase().includes(search.toLowerCase()) ||
                       p.telefono_administrativo?.includes(search) ||
                       p.telefono_contacto?.includes(search) ||
                       p.nombre_asesor.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const handleOpenNewModal = () => {
    setEditingProveedor(null);
    setFormData({
      nombre_empresa: '',
      nit: '',
      linea_producto: '',
      ciudad: '',
      direccion: '',
      email_administrativo: '',
      telefono_administrativo: '',
      nombre_asesor: '',
      cargo_asesor: '',
      telefono_contacto: '',
      email_comercial: '',
      notas: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prov: Proveedor) => {
    setEditingProveedor(prov);
    setFormData({
      nombre_empresa: prov.nombre_empresa,
      nit: prov.nit,
      linea_producto: prov.linea_producto,
      ciudad: prov.ciudad,
      direccion: prov.direccion,
      email_administrativo: prov.email_administrativo,
      telefono_administrativo: prov.telefono_administrativo,
      nombre_asesor: prov.nombre_asesor,
      cargo_asesor: prov.cargo_asesor,
      telefono_contacto: prov.telefono_contacto,
      email_comercial: prov.email_comercial,
      notas: prov.notas || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (prov: Proveedor) => {
    setDeletingProveedor(prov);
    setIsDeleteModalOpen(true);
  };

  const handleOpenViewModal = (prov: Proveedor) => {
    setViewingProveedor(prov);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProveedor(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingProveedor(null);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProveedor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProveedor) {
        await api.put(`/proveedores/${editingProveedor.id}`, formData);
        toast.success('Proveedor actualizado correctamente');
      } else {
        await api.post('/proveedores', formData);
        toast.success('Proveedor creado correctamente');
      }
      handleCloseModal();
      loadProveedores();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProveedor) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/proveedores/${deletingProveedor.id}`);
      toast.success('Proveedor eliminado correctamente');
      loadProveedores();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar proveedor');
    } finally {
      setIsSubmitting(false);
      handleCloseDeleteModal();
    }
  };

  const resetFilters = () => {
    setSearch('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra tus proveedores, compras y relaciones comerciales
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={loadProveedores}
            disabled={isLoading}
            className="p-2 sm:p-2.5 rounded-lg border border-input hover:bg-muted disabled:opacity-50 transition-colors"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenNewModal}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Nuevo Proveedor</span>
              <span className="xs:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{proveedores.length}</p>
              <p className="text-xs text-muted-foreground">Total Proveedores</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Proveedores Activos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={resetFilters} className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground flex items-center gap-1.5 hover:bg-muted">
          <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
          {error}
          <button onClick={loadProveedores} className="ml-4 underline">Reintentar</button>
        </div>
      )}

      {/* Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${provColors[i % provColors.length]} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                  {getInitials(p.nombre_empresa)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate" title={p.nombre_empresa}>{p.nombre_empresa}</p>
                  <p className="text-xs text-muted-foreground truncate" title={p.nit}>NIT: {p.nit}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs mb-3">
                <p className="text-muted-foreground truncate" title={p.linea_producto}>
                  <span className="font-medium">Línea:</span> {p.linea_producto}
                </p>
                <p className="text-muted-foreground truncate" title={p.ciudad}>
                  <span className="font-medium">Ciudad:</span> {p.ciudad}
                </p>
                <p className="text-muted-foreground truncate" title={p.nombre_asesor}>
                  <span className="font-medium">Asesor:</span> {p.nombre_asesor}
                </p>
                <p className="text-muted-foreground truncate" title={p.telefono_contacto}>
                  <span className="font-medium">Teléfono:</span> {p.telefono_contacto}
                </p>
              </div>
              <div className="flex items-center gap-1 border-t border-border pt-3">
                <button onClick={() => handleOpenViewModal(p)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Ver detalles"><Eye className="w-4 h-4" /></button>
                {isAdmin && (
                  <>
                    <button onClick={() => handleOpenEditModal(p)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleOpenDeleteModal(p)} className="p-2 rounded-lg hover:bg-muted text-destructive" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
                {p.telefono_contacto && <a href={`tel:${p.telefono_contacto}`} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Llamar"><Phone className="w-4 h-4" /></a>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No se encontraron proveedores
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información de la Empresa */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Información de la Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombre de la Empresa *</label>
                    <input
                      type="text"
                      value={formData.nombre_empresa}
                      onChange={e => setFormData({...formData, nombre_empresa: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Purina Colombia S.A."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">NIT *</label>
                    <input
                      type="text"
                      value={formData.nit}
                      onChange={e => setFormData({...formData, nit: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: 860123456-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Línea de Producto (Categoría) *</label>
                    <input
                      type="text"
                      value={formData.linea_producto}
                      onChange={e => setFormData({...formData, linea_producto: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Alimentos para Mascotas, Medicamentos Veterinarios"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ciudad *</label>
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={e => setFormData({...formData, ciudad: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Bogotá, Medellín"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Dirección *</label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={e => setFormData({...formData, direccion: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Calle 26 # 68-40"
                    />
                  </div>
                </div>
              </div>

              {/* Información Administrativa */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Información Administrativa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Correo Electrónico Administrativo *</label>
                    <input
                      type="email"
                      value={formData.email_administrativo}
                      onChange={e => setFormData({...formData, email_administrativo: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Teléfono Administrativo *</label>
                    <input
                      type="tel"
                      value={formData.telefono_administrativo}
                      onChange={e => setFormData({...formData, telefono_administrativo: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="+57 310 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Información del Asesor Comercial */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                  Información del Asesor Comercial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombre del Asesor Comercial *</label>
                    <input
                      type="text"
                      value={formData.nombre_asesor}
                      onChange={e => setFormData({...formData, nombre_asesor: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Juan Pérez Gómez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Cargo *</label>
                    <input
                      type="text"
                      value={formData.cargo_asesor}
                      onChange={e => setFormData({...formData, cargo_asesor: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="Ej: Asesor Comercial Senior"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Teléfono de Contacto *</label>
                    <input
                      type="tel"
                      value={formData.telefono_contacto}
                      onChange={e => setFormData({...formData, telefono_contacto: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="+57 310 123 4568"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Correo Electrónico Comercial *</label>
                    <input
                      type="email"
                      value={formData.email_comercial}
                      onChange={e => setFormData({...formData, email_comercial: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                      placeholder="asesor@empresa.com"
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notas (Opcional)</label>
                <textarea
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  placeholder="Información adicional sobre el proveedor..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-input rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {isDeleteModalOpen && deletingProveedor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-lg font-bold">Eliminar Proveedor</h2>
              <p className="text-sm text-muted-foreground mt-2">
                ¿Eliminar a <strong>{deletingProveedor.nombre_empresa}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCloseDeleteModal} className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted">Cancelar</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver detalles */}
      {isViewModalOpen && viewingProveedor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${provColors[viewingProveedor.id % provColors.length]} flex items-center justify-center text-lg font-bold text-white`}>
                  {getInitials(viewingProveedor.nombre_empresa)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{viewingProveedor.nombre_empresa}</h2>
                  <p className="text-sm text-muted-foreground">NIT: {viewingProveedor.nit}</p>
                </div>
              </div>
              <button onClick={handleCloseViewModal} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Información de la Empresa */}
              <div>
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Información de la Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nombre de la Empresa</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.nombre_empresa}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">NIT</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.nit}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Línea de Producto</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.linea_producto}</p>
                  </div>
                  <div className="space-y-1 flex items-start gap-2">
                    <Star className="w-4 h-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Calificación</p>
                      <p className="text-sm font-medium text-foreground">
                        {viewingProveedor.calificacion ? `${Number(viewingProveedor.calificacion).toFixed(1)} / 5.0` : 'Sin calificación'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Ubicación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ciudad</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.ciudad}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.direccion}</p>
                  </div>
                </div>
              </div>

              {/* Información Administrativa */}
              <div>
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Información Administrativa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email Administrativo</p>
                    <a href={`mailto:${viewingProveedor.email_administrativo}`} className="text-sm font-medium text-primary hover:underline">
                      {viewingProveedor.email_administrativo}
                    </a>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Teléfono Administrativo</p>
                    <a href={`tel:${viewingProveedor.telefono_administrativo}`} className="text-sm font-medium text-primary hover:underline">
                      {viewingProveedor.telefono_administrativo}
                    </a>
                  </div>
                </div>
              </div>

              {/* Información del Asesor Comercial */}
              <div>
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Asesor Comercial
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nombre del Asesor</p>
                    <p className="text-sm font-medium text-foreground">{viewingProveedor.nombre_asesor}</p>
                  </div>
                  <div className="space-y-1 flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cargo</p>
                      <p className="text-sm font-medium text-foreground">{viewingProveedor.cargo_asesor}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Teléfono de Contacto</p>
                    <a href={`tel:${viewingProveedor.telefono_contacto}`} className="text-sm font-medium text-primary hover:underline">
                      {viewingProveedor.telefono_contacto}
                    </a>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email Comercial</p>
                    <a href={`mailto:${viewingProveedor.email_comercial}`} className="text-sm font-medium text-primary hover:underline">
                      {viewingProveedor.email_comercial}
                    </a>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viewingProveedor.notas && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
                    Notas Adicionales
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewingProveedor.notas}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border p-4 flex justify-end gap-3">
              <button onClick={handleCloseViewModal} className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors">
                Cerrar
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleOpenEditModal(viewingProveedor);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
