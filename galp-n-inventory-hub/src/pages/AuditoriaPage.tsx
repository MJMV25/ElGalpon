import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Shield, Filter, AlertTriangle, Rows3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import auditoriaService, { AuditoriaFiltros, AuditoriaItem, AuditoriaMetaFiltros } from '@/services/auditoriaService';

const AuditoriaPage = () => {
  const [searchParams] = useSearchParams();
  const referenciaParam = searchParams.get('referencia') || undefined;
  const moduloParam = searchParams.get('modulo') || undefined;
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditoriaItem[]>([]);
  const [metaFiltros, setMetaFiltros] = useState<AuditoriaMetaFiltros>({
    usuarios: [],
    modulos: [],
    acciones: [],
    modelos: [],
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20,
  });
  const [resumen, setResumen] = useState({
    total_filtrado: 0,
    sensibles_filtrado: 0,
  });

  const [filters, setFilters] = useState<AuditoriaFiltros>({
    referencia: referenciaParam,
    modulo: moduloParam,
    per_page: 20,
    page: 1,
  });

  const loadAuditoria = async (params: AuditoriaFiltros) => {
    try {
      setLoading(true);
      const response = await auditoriaService.getAll(params);
      if (!response.success) {
        throw new Error(response.message || 'No se pudo cargar auditoria');
      }

      const paginated = response.data;

      setItems(paginated.data || []);
      setPagination({
        current_page: paginated.current_page,
        last_page: paginated.last_page,
        total: paginated.total,
        per_page: paginated.per_page,
      });
      setMetaFiltros(response.meta?.filtros || {
        usuarios: [],
        modulos: [],
        acciones: [],
        modelos: [],
      });
      setResumen(response.meta?.resumen || {
        total_filtrado: paginated.total || 0,
        sensibles_filtrado: 0,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditoria(filters);
  }, [filters.page, filters.user_id, filters.modulo, filters.accion, filters.modelo, filters.referencia, filters.solo_sensibles, filters.fecha_desde, filters.fecha_hasta, filters.q]);

  const onFilterChange = <K extends keyof AuditoriaFiltros>(key: K, value: AuditoriaFiltros[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
      page: 1,
    }));
  };

  const formatJson = (data: Record<string, any> | null) => {
    if (!data) return '-';
    const entries = Object.entries(data).slice(0, 4);
    if (entries.length === 0) return '-';
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' | ');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-xl border border-border bg-gradient-to-r from-primary to-sidebar p-4 sm:p-6 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Auditoria del Sistema</h1>
            <p className="text-primary-foreground/85 text-sm">
              Trazabilidad completa de cambios sensibles para control y deteccion de anomalias.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Rows3 className="w-3.5 h-3.5" /> Registros filtrados</p>
            <p className="text-xl font-semibold text-foreground mt-1">{resumen.total_filtrado}</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-xs text-destructive/80 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Acciones sensibles</p>
            <p className="text-xl font-semibold text-destructive mt-1">{resumen.sensibles_filtrado}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <select
            value={filters.user_id || ''}
            onChange={e => onFilterChange('user_id', e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Todos los usuarios</option>
            {metaFiltros.usuarios.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>

          <select
            value={filters.modulo || ''}
            onChange={e => onFilterChange('modulo', e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Todos los modulos</option>
            {metaFiltros.modulos.map(modulo => (
              <option key={modulo} value={modulo}>{modulo}</option>
            ))}
          </select>

          <select
            value={filters.accion || ''}
            onChange={e => onFilterChange('accion', e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Todas las acciones</option>
            {metaFiltros.acciones.map(accion => (
              <option key={accion} value={accion}>{accion}</option>
            ))}
          </select>

          <select
            value={filters.modelo || ''}
            onChange={e => onFilterChange('modelo', e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="">Todos los modelos</option>
            {metaFiltros.modelos.map(modelo => (
              <option key={modelo} value={modelo}>{modelo}</option>
            ))}
          </select>

          <input
            value={filters.referencia || ''}
            onChange={e => onFilterChange('referencia', e.target.value || undefined)}
            placeholder="Referencia (codigo, email, numero...)"
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />

          <label className="px-3 py-2 rounded-lg border border-input bg-background text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(filters.solo_sensibles)}
              onChange={e => onFilterChange('solo_sensibles', e.target.checked || undefined)}
            />
            Solo sensibles
          </label>

          <input
            type="date"
            value={filters.fecha_desde || ''}
            onChange={e => onFilterChange('fecha_desde', e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />

          <input
            type="date"
            value={filters.fecha_hasta || ''}
            onChange={e => onFilterChange('fecha_hasta', e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />

          <div className="xl:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.q || ''}
              onChange={e => onFilterChange('q', e.target.value || undefined)}
              placeholder="Buscar por accion, observacion o IP..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Usuario</th>
                <th className="text-left px-3 py-2">Riesgo</th>
                <th className="text-left px-3 py-2">Modulo</th>
                <th className="text-left px-3 py-2">Accion</th>
                <th className="text-left px-3 py-2">Registro</th>
                <th className="text-left px-3 py-2">Referencia</th>
                <th className="text-left px-3 py-2">Antes</th>
                <th className="text-left px-3 py-2">Despues</th>
                <th className="text-left px-3 py-2">Origen</th>
                <th className="text-left px-3 py-2">Observacion</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={11}>Cargando auditoria...</td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={11}>No hay registros con los filtros actuales.</td>
                </tr>
              )}
              {!loading && items.map(item => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(item.created_at).toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2">{item.user?.nombre || 'Sistema'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.nivel_riesgo === 'alto' ? 'bg-destructive/15 text-destructive' : item.nivel_riesgo === 'medio' ? 'bg-warning/20 text-warning-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {item.nivel_riesgo || 'bajo'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{item.modulo || '-'}</td>
                  <td className="px-3 py-2">{item.accion}</td>
                  <td className="px-3 py-2">{item.modelo || '-'} #{item.modelo_id || '-'}</td>
                  <td className="px-3 py-2">{item.referencia || '-'}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={formatJson(item.datos_anteriores)}>{formatJson(item.datos_anteriores)}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={formatJson(item.datos_nuevos)}>{formatJson(item.datos_nuevos)}</td>
                  <td className="px-3 py-2">{item.ip_address || '-'}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate" title={item.observacion || ''}>{item.observacion || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Total registros: <span className="font-medium text-foreground">{pagination.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded border border-border disabled:opacity-50"
              disabled={pagination.current_page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              Anterior
            </button>
            <span className="text-muted-foreground">
              Pagina {pagination.current_page} de {pagination.last_page}
            </span>
            <button
              className="px-3 py-1.5 rounded border border-border disabled:opacity-50"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditoriaPage;
