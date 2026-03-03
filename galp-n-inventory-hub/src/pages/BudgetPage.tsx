import { useMemo, useState, useEffect } from 'react';
import reportesService, { InventarioValorizadoResponse, ProductoPorCategoria, StockAlertaResponse } from '@/services/reportesService';
import { formatCurrencyFull, formatNumber } from '@/utils/formatters';
import { Wallet, ShoppingCart, TrendingUp, Package, Download } from 'lucide-react';
import { toast } from 'sonner';

const BudgetPage = () => {
  const [range, setRange] = useState<'mes' | 'trimestre' | 'anio'>('mes');
  const [resumen, setResumen] = useState<InventarioValorizadoResponse['resumen'] | null>(null);
  const [detalle, setDetalle] = useState<InventarioValorizadoResponse['detalle']>([]);
  const [categorias, setCategorias] = useState<ProductoPorCategoria[]>([]);
  const [stockAlerta, setStockAlerta] = useState<StockAlertaResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, catRes, stockRes] = await Promise.all([
          reportesService.getInventarioValorizado(),
          reportesService.getProductosPorCategoria(),
          reportesService.getStockAlerta(),
        ]);

        if (invRes.success) {
          setResumen(invRes.data.resumen);
          setDetalle(invRes.data.detalle);
        }
        if (catRes.success) setCategorias(catRes.data || []);
        if (stockRes.success) setStockAlerta(stockRes.data);
      } catch {
        toast.error('No se pudo cargar el presupuesto');
      }
    };
    load();
  }, []);

  const factor = range === 'mes' ? 1 : range === 'trimestre' ? 3 : 12;
  const valorCompra = resumen?.valor_compra ?? 0;
  const valorVenta = resumen?.valor_venta ?? 0;
  const ganancia = resumen?.ganancia_potencial ?? (valorVenta - valorCompra);
  const scaledTotal = valorCompra * factor;

  const metrics = useMemo(() => [
    { icon: ShoppingCart, label: 'Costo de Adquisición', value: formatCurrencyFull(Math.round(valorCompra * factor)) },
    { icon: TrendingUp, label: 'Ganancia Potencial', value: formatCurrencyFull(Math.round(ganancia * factor)) },
    { icon: Package, label: 'Total de Productos', value: `${resumen?.total_productos ?? 0}` },
  ], [valorCompra, ganancia, factor, resumen]);

  const exportSummary = () => {
    const text = [
      'EL GALPON - RESUMEN PRESUPUESTAL',
      `Periodo: ${range}`,
      `Valor total proyectado: ${formatCurrencyFull(scaledTotal)}`,
      `Productos totales: ${resumen?.total_productos ?? 0}`,
      `Ganancia potencial: ${formatCurrencyFull(ganancia * factor)}`,
      `Generado: ${new Date().toLocaleString('es-CO')}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuesto-${range}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Resumen presupuestal exportado');
  };

  const topProducto = useMemo(() => {
    return detalle.reduce((acc, p) => (p.valor_inventario > (acc?.valor_inventario || 0) ? p : acc), detalle[0]);
  }, [detalle]);

  const topCategoria = useMemo(() => {
    return categorias.reduce((acc, c) => (c.valor_venta > (acc?.valor_venta || 0) ? c : acc), categorias[0]);
  }, [categorias]);

  const stockCritico = stockAlerta?.criticos.cantidad ?? 0;
  const stockBajo = stockAlerta?.bajos.cantidad ?? 0;
  const totalProductos = resumen?.total_productos ?? 0;
  const stockNormal = Math.max(totalProductos - stockCritico - stockBajo, 0);

  const inversionReabastecer = useMemo(() => {
    if (!stockAlerta) return 0;
    const productos = [...stockAlerta.criticos.productos, ...stockAlerta.bajos.productos];
    return productos.reduce((sum, p) => {
      const faltante = Math.max(p.stock_minimo - p.stock, 0);
      return sum + faltante * p.precio_compra;
    }, 0);
  }, [stockAlerta]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Presupuesto del Inventario</h1>
          <p className="text-sm text-muted-foreground">Análisis financiero consolidado del inventario</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-card border border-border rounded-lg p-1 flex">
            {(['mes', 'trimestre', 'anio'] as const).map(option => (
              <button
                key={option}
                onClick={() => setRange(option)}
                className={`px-3 py-1.5 rounded text-xs font-medium ${range === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {option === 'mes' ? 'Mes' : option === 'trimestre' ? 'Trimestre' : 'Año'}
              </button>
            ))}
          </div>
          <button onClick={exportSummary} className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted inline-flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary to-sidebar rounded-xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary-foreground/80 text-sm">Valor Total Proyectado ({range})</p>
            <p className="text-3xl font-bold text-primary-foreground">{formatCurrencyFull(scaledTotal)}</p>
            <p className="text-primary-foreground/70 text-xs">COP - Pesos Colombianos</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4 text-primary-foreground/80" />
                <p className="text-sm font-bold text-primary-foreground">{m.value}</p>
              </div>
              <p className="text-xs text-primary-foreground/70">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Valor por Categoría</h3>
          <div className="space-y-5">
            {categorias.map(cat => {
              const total = categorias.reduce((sum, c) => sum + c.valor_inventario, 0) || 1;
              const pct = Math.round((cat.valor_inventario / total) * 100);
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground">{cat.nombre}</span>
                    <span className="font-medium text-foreground">{formatCurrencyFull(cat.valor_inventario * factor)}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color || 'var(--primary)' }}>
                      <span className="text-[10px] font-bold text-white pl-2">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Resumen Financiero</h3>
          <div className="space-y-4">
            {[
              { label: 'Productos en stock normal', value: formatNumber(stockNormal) },
              { label: 'Productos con bajo stock', value: `${stockBajo + stockCritico}`, highlight: true },
              { label: 'Margen promedio de ganancia', value: `${(resumen?.margen_promedio ?? 0).toFixed(1)}%`, green: true },
              { label: 'Producto más valioso', value: topProducto?.nombre || 'Sin datos', bold: true },
              { label: 'Categoría más rentable', value: topCategoria ? `${topCategoria.nombre}` : 'Sin datos', green: true },
              { label: 'Inversión para reabastecer', value: formatCurrencyFull(inversionReabastecer), green: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-medium ${item.highlight ? 'text-destructive' : item.green ? 'text-primary' : item.bold ? 'text-foreground font-semibold' : 'text-foreground'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
