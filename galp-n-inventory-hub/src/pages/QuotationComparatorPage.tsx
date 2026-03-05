import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import cotizacionesService, { ComparacionResponse } from '@/services/cotizacionesService';
import { formatCurrencyFull } from '@/utils/formatters';
import { ArrowLeft, Award, Check, Package, Star, Truck, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const QuotationComparatorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ComparacionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await cotizacionesService.compararRespuestas(Number(id));
        if (response.success) {
          setData(response.data);
        } else {
          toast.error('No se pudo cargar la comparación');
        }
      } catch (error) {
        toast.error('No se pudo cargar la comparación');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const ranked = useMemo(() => {
    if (!data) return [];
    const totals = data.resumen_proveedores.map(p => p.total_cotizado);
    const maxTotal = Math.max(...totals, 1);
    return data.resumen_proveedores.map(r => {
      const precioScore = 100 - (r.total_cotizado / maxTotal) * 50;
      const calidadScore = ((r.calificacion || 0) / 5) * 40;
      const score = Math.max(0, precioScore + calidadScore + 10);
      return { ...r, score };
    }).sort((a, b) => b.score - a.score);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
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

  const winner = ranked[0];

  const handleAdjudicar = () => {
    toast.success(`Cotización adjudicada a ${winner?.proveedor_nombre}`);
    setTimeout(() => navigate('/cotizaciones'), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/cotizaciones/${id}`)} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-primary">Comparador Inteligente</h1>
      </div>

      {winner ? (
        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border-2 border-warning rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-warning text-white text-sm font-semibold flex items-center gap-1">
              <Award className="w-4 h-4" /> MEJOR OPCIÓN RECOMENDADA
            </span>
          </div>

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl">🏪</div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{winner.proveedor_nombre}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 text-warning"><Star className="w-4 h-4 fill-current" /> {(winner.calificacion || 0).toFixed(1)}/5.0</span>
                  <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Score {winner.score.toFixed(1)}</span>
                  <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> {winner.tiempo_promedio_entrega ? `${winner.tiempo_promedio_entrega.toFixed(0)} días` : 'Sin dato'}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Precio Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrencyFull(winner.total_cotizado || 0)}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="font-semibold text-foreground mb-3 flex items-center gap-1">❓ ¿Por qué esta opción?</p>
            <div className="space-y-3">
              {[
                { title: 'Mejor relación precio-calidad', desc: 'Precio competitivo con buen historial de calidad' },
                { title: 'Tiempo de entrega estimado', desc: winner.tiempo_promedio_entrega ? `Promedio de entrega: ${winner.tiempo_promedio_entrega.toFixed(0)} días` : 'Sin datos de entrega' },
                { title: 'Proveedor con buena reputación', desc: 'Historial de respuestas y calificación' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="w-3 h-3" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleAdjudicar} className="w-full py-3 rounded-xl bg-success text-white font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2">
            <Award className="w-4 h-4" /> Adjudicar Cotización a este Proveedor
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No hay respuestas para comparar.</div>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">📊 Comparación Detallada por Producto</h2>
        <div className="bg-info/10 border border-info/20 rounded-lg p-3 mb-4 flex items-start gap-2">
          <span className="text-info">ℹ️</span>
          <p className="text-sm text-info"><span className="font-semibold">Análisis Producto por Producto:</span> Compare precios unitarios para cada producto y vea cuál proveedor le conviene más.</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Producto / Proveedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Precio Unitario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Subtotal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Mejor Opción</th>
              </tr>
            </thead>
            <tbody>
              {data.comparacion_productos.map(prod => (
                <>
                  <tr key={`h-${prod.producto_id}`} className="bg-primary text-primary-foreground">
                    <td colSpan={4} className="px-4 py-2.5 font-semibold">
                      📦 {prod.nombre_producto} <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-white/20">{prod.cantidad_solicitada}</span>
                    </td>
                  </tr>
                  {prod.respuestas.map((o, oi) => {
                    const isBest = o.proveedor_id === prod.mejor_proveedor_id;
                    return (
                      <tr key={`${prod.producto_id}-${o.proveedor_id}`} className={isBest ? 'bg-success/5' : ''}>
                        <td className={`px-4 py-2.5 ${isBest ? 'font-semibold text-primary' : 'text-foreground'}`}>
                          {isBest ? '🏆' : '🏪'} {o.proveedor_nombre} {isBest && <span className="text-xs text-primary">Mejor Precio</span>}
                        </td>
                        <td className="px-4 py-2.5">{formatCurrencyFull(o.precio_unitario)}</td>
                        <td className="px-4 py-2.5">{formatCurrencyFull(o.total)}</td>
                        <td className="px-4 py-2.5">
                          {isBest && <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 w-fit"><Check className="w-3 h-3" /> MEJOR PRECIO</span>}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}

              <tr className="bg-warning/20">
                <td colSpan={4} className="px-4 py-2.5 font-bold text-foreground text-center uppercase">📧 Resumen Total por Proveedor</td>
              </tr>
              {ranked.map((r, i) => (
                <tr key={r.proveedor_id} className={i === 0 ? 'bg-success/5' : ''}>
                  <td className={`px-4 py-2.5 ${i === 0 ? 'font-semibold text-primary' : 'text-foreground'}`}>
                    {i === 0 ? '🏆' : '🏪'} {r.proveedor_nombre} {i === 0 && <span className="text-xs text-primary">Mejor Opción Global</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrencyFull(r.total_cotizado || 0)}</td>
                  <td colSpan={2} className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.score >= 85 ? 'bg-success/10 text-success' : r.score >= 70 ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>
                      Score: {r.score.toFixed(1)}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">📋 Ofertas Recibidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ranked.map((r, i) => (
            <div key={r.proveedor_id} className={`bg-card rounded-xl border-2 p-4 ${i === 0 ? 'border-primary' : 'border-border'}`}>
              {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium mb-2 inline-block">🏆 #{i + 1} MEJOR OPCIÓN</span>}
              {i > 0 && <span className="text-xs text-muted-foreground mb-2 inline-block">#{i + 1}</span>}
              <h3 className="font-semibold text-foreground">{r.proveedor_nombre}</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Precio Total</span><p className="font-bold text-primary">{formatCurrencyFull(r.total_cotizado || 0)}</p></div>
                <div><span className="text-muted-foreground">Calidad</span><p className="flex items-center gap-1 text-warning"><Star className="w-3.5 h-3.5 fill-current" /> {(r.calificacion || 0).toFixed(1)}/5.0</p></div>
                <div><span className="text-muted-foreground">Tiempo Entrega</span><p className="flex items-center gap-1 text-foreground"><Truck className="w-3.5 h-3.5" /> {r.tiempo_promedio_entrega ? `${r.tiempo_promedio_entrega.toFixed(0)} días` : 'Sin dato'}</p></div>
                <div>
                  <span className="text-muted-foreground">Score Final</span>
                  <p><span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.score >= 85 ? 'bg-success/10 text-success' : r.score >= 70 ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>{r.score.toFixed(1)}/100</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuotationComparatorPage;
