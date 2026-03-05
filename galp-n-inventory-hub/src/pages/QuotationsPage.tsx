import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Cotizacion {
  id: number;
  numero: string;
  titulo: string;
  fecha: string;
  fecha_limite: string;
  estado: string;
  productos: any[];
  proveedores: any[];
}

const estadoColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviada: 'bg-info/10 text-info',
  en_proceso: 'bg-warning/10 text-warning',
  completada: 'bg-success/10 text-success',
  cancelada: 'bg-destructive/10 text-destructive',
};

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_proceso: 'En Proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

const QuotationsPage = () => {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCotizaciones = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/cotizaciones');

      let data: Cotizacion[] = [];
      if (response.data?.success) {
        if (Array.isArray(response.data.data?.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }

      setCotizaciones(data);
    } catch (err: any) {
      console.error('❌ Error cargando cotizaciones:', err);
      setError(err.response?.data?.message || 'Error al cargar cotizaciones');
      toast.error('Error al cargar cotizaciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCotizaciones();
  }, []);

  const filtered = cotizaciones.filter(c => {
    const matchSearch = c.numero.toLowerCase().includes(search.toLowerCase()) ||
                       c.titulo.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !estadoFilter || c.estado === estadoFilter;
    return matchSearch && matchEstado;
  });

  const getProveedoresLabel = (c: Cotizacion) => {
    const respondidas = c.proveedores?.filter(p => p.estado === 'respondida').length || 0;
    const total = c.proveedores?.length || 0;
    return `${respondidas}/${total}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">📋 Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">Gestión y comparación de cotizaciones de proveedores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCotizaciones}
            disabled={isLoading}
            className="p-2 rounded-lg border border-input hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/cotizaciones/nueva')}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nueva Cotización
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cotización..." className="pl-9 pr-4 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="enviada">Enviada</option>
          <option value="en_proceso">En Proceso</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
          {error}
          <button onClick={loadCotizaciones} className="ml-4 underline">Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">No hay cotizaciones</p>
          <button
            onClick={() => navigate('/cotizaciones/nueva')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Crear Primera Cotización
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">N° Cotización</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Productos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Proveedores</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{c.numero}</td>
                  <td className="px-4 py-3 text-foreground">{c.titulo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.productos?.length || 0} producto(s)</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">{getProveedoresLabel(c)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColors[c.estado] || ''}`}>{estadoLabels[c.estado] || c.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/cotizaciones/${c.id}`)}
                      className="p-1.5 rounded-lg hover:bg-muted text-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
