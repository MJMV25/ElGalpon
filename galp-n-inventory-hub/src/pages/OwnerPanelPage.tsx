import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  PackageX,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  Receipt,
  RefreshCw,
  DatabaseZap,
  ArrowUpRight,
} from 'lucide-react';
import reportesService, { OwnerPanelResponse } from '@/services/reportesService';
import { formatCurrencyFull, formatNumber } from '@/utils/formatters';

const OwnerPanelPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerPanelResponse | null>(null);

  const loadPanel = async () => {
    try {
      setLoading(true);
      const response = await reportesService.getOwnerPanel();

      if (response.success) {
        setData(response.data);
      } else {
        toast.error(response.message || 'No se pudo cargar el panel del dueno');
      }
    } catch {
      toast.error('No se pudo cargar el panel del dueno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, []);

  const cards = useMemo(() => {
    const k = data?.kpis;
    return [
      { title: 'Ventas del dia', value: formatCurrencyFull(k?.ventas_dia), icon: ShoppingBag, color: 'bg-info' },
      { title: 'Ventas del mes', value: formatCurrencyFull(k?.ventas_mes), icon: CalendarDays, color: 'bg-success' },
      { title: 'Utilidad estimada', value: formatCurrencyFull(k?.utilidad_estimada), icon: BadgeDollarSign, color: 'bg-cat-suplementos' },
      { title: 'Stock bajo', value: formatNumber(k?.productos_stock_bajo || 0), icon: AlertTriangle, color: 'bg-warning' },
      { title: 'Agotados', value: formatNumber(k?.productos_agotados || 0), icon: PackageX, color: 'bg-destructive' },
      { title: 'Valor inventario', value: formatCurrencyFull(k?.valor_total_inventario), icon: Boxes, color: 'bg-cat-accesorios' },
    ];
  }, [data]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-sidebar to-primary p-5 sm:p-6 text-primary-foreground shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Panel del Dueno</h1>
            <p className="text-primary-foreground/85 text-sm mt-1">
              Vista ejecutiva principal para controlar ventas, inventario y riesgos desde una sola pantalla.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPanel}
              className="rounded-xl bg-white/15 px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5 hover:bg-white/25"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <div className="rounded-xl bg-white/15 px-3 py-2 text-xs sm:text-sm">
              {data?.metadata?.actualizado_en ? new Date(data.metadata.actualizado_en).toLocaleString('es-CO') : '...'}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {cards.map(card => (
          <article key={card.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{loading ? '...' : card.value}</p>
              </div>
              <span className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <CircleAlert className="w-4 h-4" /> Alertas criticas resumidas
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Total alertas</p>
              <p className="font-semibold text-foreground">{formatNumber(data?.alertas_resumen?.total || 0)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-destructive/80">Criticas</p>
              <p className="font-semibold text-destructive">{formatNumber(data?.alertas_resumen?.criticas || 0)}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3">
              <p className="text-xs text-warning-foreground">Stock bajo</p>
              <p className="font-semibold text-warning-foreground">{formatNumber(data?.alertas_resumen?.stock_bajo || 0)}</p>
            </div>
            <div className="rounded-lg bg-info/10 p-3">
              <p className="text-xs text-info">Notificaciones</p>
              <p className="font-semibold text-info">{formatNumber(data?.alertas_resumen?.notificaciones_no_leidas || 0)}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(data?.alertas_activas || []).slice(0, 4).map(alerta => (
              <a
                key={alerta.id}
                href={alerta.destino || '#'}
                className="rounded-lg border border-border/80 p-3 flex items-start justify-between gap-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{alerta.titulo}</p>
                  <p className="text-xs text-muted-foreground truncate">{alerta.mensaje}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <Receipt className="w-4 h-4" /> Compras recientes
          </h2>
          <p className="text-xs text-muted-foreground mt-2">Ultimos 7 dias</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-muted-foreground">Movimientos: <strong className="text-foreground">{formatNumber(data?.resumen_compras_recientes?.data?.total_movimientos || 0)}</strong></p>
            <p className="text-muted-foreground">Unidades: <strong className="text-foreground">{formatNumber(data?.resumen_compras_recientes?.data?.total_unidades || 0)}</strong></p>
            <p className="text-muted-foreground">Valor estimado: <strong className="text-foreground">{formatCurrencyFull(data?.resumen_compras_recientes?.data?.valor_estimado || 0)}</strong></p>
            <p className="text-muted-foreground">Proveedores: <strong className="text-foreground">{formatNumber(data?.resumen_compras_recientes?.data?.proveedores_distintos || 0)}</strong></p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{data?.resumen_compras_recientes?.message}</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <DatabaseZap className="w-4 h-4" /> Sincronizacion Siigo
          </h2>
          <div className="mt-3 rounded-lg border border-dashed border-border p-3">
            <p className="text-sm text-foreground">Estado: {data?.resumen_sincronizacion_siigo?.estado || 'pendiente'}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.resumen_sincronizacion_siigo?.message}</p>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="w-4 h-4" /> Productos mas vendidos (30 dias)
          </h2>
          <div className="mt-3 space-y-2">
            {(data?.productos_mas_vendidos || []).length === 0 && <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>}
            {(data?.productos_mas_vendidos || []).map((p, idx) => (
              <div key={p.id} className="rounded-lg border border-border/80 p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate font-medium">{idx + 1}. {p.nombre}</p>
                  <p className="text-xs text-muted-foreground">{p.codigo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatNumber(p.unidades_vendidas)} u</p>
                  <p className="text-xs text-muted-foreground">{formatCurrencyFull(p.valor_estimado)}</p>
                  <p className="text-[11px] text-info mt-0.5">7d: {formatNumber(p.unidades_7_dias || 0)} u</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <TrendingDown className="w-4 h-4" /> Productos sin movimiento
          </h2>
          <div className="mt-3 space-y-2">
            {(data?.productos_poco_movimiento || []).length === 0 && <p className="text-sm text-muted-foreground">Sin datos disponibles.</p>}
            {(data?.productos_poco_movimiento || []).map((p) => (
              <div key={p.id} className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate font-medium">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.codigo}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.estado_movimiento === 'sin_movimiento' ? 'bg-destructive/15 text-destructive' : 'bg-warning/20 text-warning-foreground'}`}>
                    {p.estado_movimiento === 'sin_movimiento' ? 'Sin movimiento' : 'Poco movimiento'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Salidas 45 dias: {formatNumber(p.salidas_45_dias)} | Stock: {formatNumber(p.stock_actual)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dias sin movimiento: {formatNumber(p.dias_sin_movimiento || 0)} | Valor inmovilizado: {formatCurrencyFull(p.valor_inmovilizado || 0)}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground truncate">Categoria: {p.categoria || 'Sin categoria'}</p>
                  <a href={p.producto_url || '/productos'} className="text-[11px] text-primary hover:underline shrink-0">
                    Ver producto
                  </a>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <Clock3 className="w-4 h-4" /> Ultimos movimientos importantes de inventario
          </h2>
          <div className="mt-3 space-y-2">
            {(data?.movimientos_importantes || []).length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos para mostrar.</p>}
            {(data?.movimientos_importantes || []).map((m) => (
              <div key={m.id} className="rounded-lg border border-border/80 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.producto?.nombre || 'Producto sin referencia'} | {m.tipo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cantidad: {formatNumber(m.cantidad)} | Usuario: {m.usuario?.nombre || 'Sistema'}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(m.created_at).toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <ShieldAlert className="w-4 h-4" /> Actividad sospechosa resumida
          </h2>
          {!data?.movimientos_sospechosos.disponible && (
            <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              {data?.movimientos_sospechosos.message || 'Sin fuente de auditoria disponible.'}
            </div>
          )}
          {data?.movimientos_sospechosos.disponible && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted p-2.5 text-center">
                  <p className="text-[11px] text-muted-foreground">Sin movimiento</p>
                  <p className="font-semibold text-foreground">{formatNumber(data?.resumen_riesgos?.productos_sin_movimiento || 0)}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5 text-center">
                  <p className="text-[11px] text-destructive/80">Agotados</p>
                  <p className="font-semibold text-destructive">{formatNumber(data?.resumen_riesgos?.productos_agotados || 0)}</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-2.5 text-center">
                  <p className="text-[11px] text-warning-foreground">Criticos</p>
                  <p className="font-semibold text-warning-foreground">{formatNumber(data?.resumen_riesgos?.productos_criticos || 0)}</p>
                </div>
                <div className="rounded-lg bg-info/10 p-2.5 text-center">
                  <p className="text-[11px] text-info">Sospechosos</p>
                  <p className="font-semibold text-info">{formatNumber(data?.resumen_riesgos?.movimientos_sospechosos || 0)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-muted p-2.5 text-center">
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="font-semibold text-foreground">{formatNumber(data?.movimientos_sospechosos?.resumen?.total || 0)}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5 text-center">
                  <p className="text-[11px] text-destructive/80">Alto</p>
                  <p className="font-semibold text-destructive">{formatNumber(data?.movimientos_sospechosos?.resumen?.alto || 0)}</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-2.5 text-center">
                  <p className="text-[11px] text-warning-foreground">Medio</p>
                  <p className="font-semibold text-warning-foreground">{formatNumber(data?.movimientos_sospechosos?.resumen?.medio || 0)}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(data?.movimientos_sospechosos.items || []).slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-foreground font-medium">{item.descripcion}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.riesgo === 'alto' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning-foreground'}`}>
                        {item.riesgo}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.usuario || 'Sin usuario'}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <Wallet className="w-4 h-4" /> Resumen rapido de caja
          </h2>
          {data?.resumen_caja.disponible ? (
            <p className="text-sm text-muted-foreground mt-3">{data?.resumen_caja.message}</p>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              {data?.resumen_caja.message || 'Modulo de caja no encontrado. Espacio reservado para futura integracion.'}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
            <CircleDollarSign className="w-4 h-4" /> Lectura de utilidad
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Utilidad estimada del mes: <strong className="text-foreground">{formatCurrencyFull(data?.kpis?.utilidad_estimada)}</strong>
            {' '}({Number(data?.kpis?.margen_estimado || 0).toFixed(2)}% sobre ventas estimadas por salidas de inventario).
          </p>
        </article>
      </section>
    </div>
  );
};

export default OwnerPanelPage;
