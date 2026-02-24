import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrencyFull } from '@/utils/formatters';
import { ArrowLeft, Calendar, Clock, Download, Package, Star, Users, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import cotizacionesService, { Cotizacion } from '@/services/cotizacionesService';
import { toast } from 'sonner';

const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'productos' | 'respuestas' | 'comparacion'>('productos');

  useEffect(() => {
    loadCotizacion();
  }, [id]);

  const loadCotizacion = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await cotizacionesService.getById(Number(id));
      if (response.success && response.data) {
        setCotizacion(response.data);
      } else {
        toast.error('No se pudo cargar la cotización');
        navigate('/cotizaciones');
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      toast.error('Error al cargar los datos');
      navigate('/cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
        <p className="text-foreground">Cotización no encontrada</p>
        <button onClick={() => navigate('/cotizaciones')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Volver a Cotizaciones
        </button>
      </div>
    );
  }

  const respondidas = cotizacion.proveedores.filter(p => p.ha_respondido);

  const tabs = [
    { key: 'productos' as const, label: '📦 Productos Solicitados' },
    { key: 'respuestas' as const, label: `📩 Respuestas de Proveedores (${respondidas.length}/${cotizacion.proveedores.length})` },
    { key: 'comparacion' as const, label: '📊 Comparación' },
  ];

  // Obtener estado badge
  const getEstadoBadge = (estado: string) => {
    const badges = {
      'borrador': { label: 'Borrador', class: 'bg-gray-500/10 text-gray-500' },
      'enviada': { label: 'Enviada', class: 'bg-info/10 text-info' },
      'en_proceso': { label: 'En Proceso', class: 'bg-warning/10 text-warning' },
      'completada': { label: 'Completada', class: 'bg-success/10 text-success' },
      'cancelada': { label: 'Cancelada', class: 'bg-destructive/10 text-destructive' },
    };
    const badge = badges[estado as keyof typeof badges] || badges.borrador;
    return <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge.class}`}>{badge.label}</span>;
  };

  const getEstadoProveedorBadge = (estado: string) => {
    const badges = {
      'pendiente': { label: 'Pendiente', icon: Clock, class: 'bg-gray-500/10 text-gray-500' },
      'enviada': { label: 'Enviada', icon: CheckCircle, class: 'bg-info/10 text-info' },
      'respondida': { label: 'Respondida', icon: CheckCircle, class: 'bg-success/10 text-success' },
      'sin_respuesta': { label: 'Sin Respuesta', icon: XCircle, class: 'bg-destructive/10 text-destructive' },
    };
    const badge = badges[estado as keyof typeof badges] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${badge.class}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  // Comparison logic
  const getComparisonData = () => {
    return cotizacion.productos.map(prod => {
      const ofertas = respondidas.map(r => {
        const detalle = r.productos_detalle.find(d => d.nombre_producto === prod.nombre);
        if (!detalle) return null;
        return {
          proveedorId: r.proveedor_id,
          proveedorNombre: r.proveedor_nombre,
          precioUnitario: detalle.precio_unitario,
          subtotal: detalle.subtotal,
          disponibilidad: detalle.disponibilidad,
          tiempoEntrega: detalle.tiempo_entrega,
        };
      }).filter(o => o !== null).sort((a, b) => (a?.precioUnitario || 0) - (b?.precioUnitario || 0));

      return { producto: prod, ofertas };
    });
  };

  const totalPorProveedor = respondidas.map(r => ({
    ...r,
    score: r.total_cotizado,
  })).sort((a, b) => a.score - b.score);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            📋 {cotizacion.numero}
          </h1>
          {getEstadoBadge(cotizacion.estado)}
        </div>
        <p className="text-sm text-muted-foreground mb-2">{cotizacion.titulo}</p>
        {cotizacion.descripcion && (
          <p className="text-sm text-muted-foreground mb-3">{cotizacion.descripcion}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/cotizaciones')}
            className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-muted flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-muted flex items-center gap-1">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Calendar className="w-5 h-5 text-info" />, label: 'Fecha de Solicitud', value: new Date(cotizacion.fecha).toLocaleDateString('es-CO'), bg: 'bg-info/10' },
          {
            icon: <Clock className="w-5 h-5 text-warning" />,
            label: 'Fecha Límite',
            value: new Date(cotizacion.fecha_limite).toLocaleDateString('es-CO') + (cotizacion.fecha_limite_pasada ? ' ⚠️' : ''),
            bg: cotizacion.fecha_limite_pasada ? 'bg-destructive/10' : 'bg-warning/10'
          },
          { icon: <Users className="w-5 h-5 text-success" />, label: 'Proveedores Invitados', value: cotizacion.proveedores.length, bg: 'bg-success/10' },
          { icon: <Package className="w-5 h-5 text-purple-500" />, label: 'Respuestas Recibidas', value: `${respondidas.length} de ${cotizacion.proveedores.length}`, bg: 'bg-purple-500/10' },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${card.bg} flex items-center justify-center`}>{card.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-lg font-bold text-foreground">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'productos' && (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Especificaciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizacion.productos.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{p.nombre}</td>
                  <td className="px-4 py-3 text-foreground">{p.cantidad}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.unidad}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.especificaciones || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'respuestas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {cotizacion.proveedores.map(prov => (
            <div key={prov.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{prov.proveedor_nombre}</h3>
                    {prov.proveedor_calificacion && (
                      <div className="flex items-center gap-1 text-xs text-warning">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {typeof prov.proveedor_calificacion === 'number'
                          ? prov.proveedor_calificacion.toFixed(1)
                          : Number(prov.proveedor_calificacion).toFixed(1)}/5.0
                      </div>
                    )}
                  </div>
                  {getEstadoProveedorBadge(prov.estado)}
                </div>

                {prov.ha_respondido ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Precio Total</p>
                        <p className="text-lg font-bold text-primary">{formatCurrencyFull(prov.total_cotizado)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Respondió</p>
                        <p className="text-xs font-semibold text-foreground">
                          {prov.fecha_respuesta ? new Date(prov.fecha_respuesta).toLocaleDateString('es-CO') : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">📋 Desglose por Producto</p>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-card">
                            <tr className="border-b border-border">
                              <th className="text-left py-1.5">Producto</th>
                              <th className="text-right py-1.5">Cant.</th>
                              <th className="text-right py-1.5">P. Unit.</th>
                              <th className="text-right py-1.5">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prov.productos_detalle.map((d, idx) => (
                              <tr key={idx} className={`border-b border-border last:border-0 ${d.es_producto_extra ? 'bg-warning/10' : ''}`}>
                                <td className="py-1.5 text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <span>{d.nombre_producto}</span>
                                    {d.es_producto_extra && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold whitespace-nowrap">
                                        EXTRA
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1.5 text-right text-muted-foreground">{d.cantidad}</td>
                                <td className="py-1.5 text-right">{formatCurrencyFull(d.precio_unitario)}</td>
                                <td className="py-1.5 text-right font-medium">{formatCurrencyFull(d.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {prov.observaciones && (
                      <p className="text-xs text-muted-foreground mb-3">
                        <span className="font-semibold">Observaciones:</span> {prov.observaciones}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {prov.estado === 'sin_respuesta'
                        ? 'El proveedor no respondió a tiempo'
                        : 'Esperando respuesta del proveedor...'}
                    </p>
                    {prov.fecha_envio && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enviado: {new Date(prov.fecha_envio).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'comparacion' && respondidas.length > 0 && (
        <div className="space-y-4">
          <div className="bg-info/10 border border-info/20 rounded-lg p-4 flex items-start gap-2">
            <span className="text-info">💡</span>
            <p className="text-sm text-info">
              <span className="font-semibold">Comparación por Producto:</span> Vea el mejor precio para cada producto individualmente y compare cuál proveedor le conviene más según sus necesidades.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Proveedor / Producto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Precio Unitario</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Subtotal</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {getComparisonData().map(({ producto, ofertas }) => (
                  <>
                    <tr key={`h-${producto.id}`} className="bg-primary text-primary-foreground">
                      <td colSpan={4} className="px-4 py-2.5 font-semibold">
                        📦 {producto.nombre}
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-white/20">
                          {producto.cantidad} {producto.unidad}
                        </span>
                      </td>
                    </tr>
                    {ofertas.map((o, oi) => {
                      if (!o) return null;
                      const isBest = oi === 0;
                      return (
                        <tr key={`${producto.id}-${o.proveedorId}`} className={isBest ? 'bg-success/5' : ''}>
                          <td className={`px-4 py-2.5 ${isBest ? 'font-semibold text-primary' : 'text-foreground'}`}>
                            {isBest ? '🏆' : '🏪'} {o.proveedorNombre}
                            {isBest && <span className="text-xs text-primary ml-2">Mejor Precio</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">{formatCurrencyFull(o.precioUnitario)}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrencyFull(o.subtotal)}</td>
                          <td className="px-4 py-2.5 text-center">
                            {isBest && (
                              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                RECOMENDADO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}

                {/* Total summary */}
                <tr className="bg-warning/20">
                  <td colSpan={4} className="px-4 py-2.5 font-bold text-foreground uppercase text-center">
                    📊 Resumen Total por Proveedor
                  </td>
                </tr>
                {totalPorProveedor.map((r, i) => (
                  <tr key={r.proveedor_id} className={i === 0 ? 'bg-success/5' : ''}>
                    <td className={`px-4 py-2.5 ${i === 0 ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📦'} {r.proveedor_nombre}
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-bold text-lg">
                      {formatCurrencyFull(r.total_cotizado)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {i === 0 && (
                        <span className="px-3 py-1 rounded-full bg-success text-white text-xs font-semibold">
                          MEJOR OFERTA
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comparacion' && respondidas.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-2">No hay respuestas para comparar</p>
          <p className="text-sm text-muted-foreground">
            Espera a que los proveedores respondan para ver la comparación de precios.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuotationDetailPage;
