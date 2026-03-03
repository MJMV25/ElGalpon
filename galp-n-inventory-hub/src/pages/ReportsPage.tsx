import { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Package, AlertTriangle, BarChart3, DollarSign, ArrowLeftRight, Truck } from 'lucide-react';
import reportesService from '@/services/reportesService';
import proveedoresService from '@/services/proveedoresService';

type ReportKey = 'inventario' | 'stock' | 'categorias' | 'valoracion' | 'movimientos' | 'proveedores';

const reports: Array<{ key: ReportKey; title: string; desc: string; icon: any; color: string }> = [
  { key: 'inventario', title: 'Inventario Completo', desc: 'Listado detallado de todos los productos con stock, precios y valores', icon: Package, color: 'bg-info' },
  { key: 'stock', title: 'Productos Bajo Stock', desc: 'Lista de productos que requieren reabastecimiento urgente', icon: AlertTriangle, color: 'bg-warning' },
  { key: 'categorias', title: 'Análisis por Categoría', desc: 'Distribución de productos y valores por cada categoría', icon: BarChart3, color: 'bg-cat-accesorios' },
  { key: 'valoracion', title: 'Valoración Financiera', desc: 'Análisis de costos, precios de venta y márgenes de ganancia', icon: DollarSign, color: 'bg-success' },
  { key: 'movimientos', title: 'Movimientos de Inventario', desc: 'Historial de entradas y salidas de productos', icon: ArrowLeftRight, color: 'bg-info' },
  { key: 'proveedores', title: 'Reporte de Proveedores', desc: 'Lista de proveedores con información de contacto', icon: Truck, color: 'bg-cat-suplementos' },
];

const ReportsPage = () => {
  const [generatingKey, setGeneratingKey] = useState<ReportKey | null>(null);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toCsv = (rows: Array<Array<string | number | null>>) => {
    return rows
      .map(cols => cols.map(col => `"${String(col ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  const handleGenerate = async (report: typeof reports[number], format: 'excel' | 'pdf' = 'excel') => {
    try {
      setGeneratingKey(report.key);
      const today = new Date().toISOString().slice(0, 10);

      if (report.key === 'inventario') {
        const response = await reportesService.getInventarioValorizado();
        if (!response.success) throw new Error(response.message);
        const rows = [
          ['codigo', 'nombre', 'categoria', 'subcategoria', 'proveedor', 'stock', 'stock_minimo', 'precio_compra', 'precio_venta', 'valor_inventario'],
          ...response.data.detalle.map(p => [
            p.codigo,
            p.nombre,
            p.categoria,
            p.subcategoria || '',
            p.proveedor || '',
            p.stock,
            p.stock_minimo,
            p.precio_compra,
            p.precio_venta,
            p.valor_inventario,
          ])
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `inventario-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (report.key === 'stock') {
        const response = await reportesService.getStockAlerta();
        if (!response.success) throw new Error(response.message);
        const productos = [...response.data.criticos.productos, ...response.data.bajos.productos];
        const rows = [
          ['codigo', 'producto', 'categoria', 'stock_actual', 'stock_minimo', 'estado'],
          ...productos.map(p => [p.codigo, p.nombre, p.categoria?.nombre || '', p.stock, p.stock_minimo, p.estado_stock])
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `stock-bajo-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (report.key === 'categorias') {
        const response = await reportesService.getProductosPorCategoria();
        if (!response.success) throw new Error(response.message);
        const rows = [
          ['categoria', 'total_productos', 'total_stock', 'valor_inventario', 'valor_venta'],
          ...response.data.map(c => [c.nombre, c.total_productos, c.total_stock, c.valor_inventario, c.valor_venta])
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `categorias-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (report.key === 'valoracion') {
        const response = await reportesService.getInventarioValorizado();
        if (!response.success) throw new Error(response.message);
        const resumen = response.data.resumen;
        const rows = [
          ['metrico', 'valor'],
          ['total_productos', resumen.total_productos],
          ['total_unidades', resumen.total_unidades],
          ['valor_compra', resumen.valor_compra],
          ['valor_venta', resumen.valor_venta],
          ['ganancia_potencial', resumen.ganancia_potencial],
          ['margen_promedio', resumen.margen_promedio],
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `valoracion-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (report.key === 'movimientos') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        const response = await reportesService.getMovimientos({
          fecha_desde: start.toISOString().slice(0, 10),
          fecha_hasta: end.toISOString().slice(0, 10),
        });
        if (!response.success) throw new Error(response.message);
        const rows = [
          ['fecha', 'tipo', 'producto', 'cantidad', 'usuario', 'proveedor'],
          ...response.data.movimientos.map(m => [
            m.created_at,
            m.tipo,
            m.producto?.nombre || '',
            m.cantidad,
            m.user?.nombre || '',
            m.proveedor?.nombre_empresa || '',
          ])
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `movimientos-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (report.key === 'proveedores') {
        const response = await proveedoresService.getAll({ per_page: 'all' });
        if (!response.success) throw new Error(response.message);
        const rows = [
          ['empresa', 'nit', 'ciudad', 'email_comercial', 'telefono_contacto', 'asesor'],
          ...response.data.map(p => [
            p.nombre_empresa,
            p.nit,
            p.ciudad,
            p.email_comercial,
            p.telefono_contacto,
            p.nombre_asesor,
          ])
        ];
        const csv = toCsv(rows);
        downloadFile(csv, `proveedores-${today}.csv`, 'text/csv;charset=utf-8;');
      }

      if (format === 'pdf') {
        const txt = [
          `EL GALPON - ${report.title}`,
          `Generado: ${new Date().toLocaleString('es-CO')}`,
          '',
          'Este archivo es un resumen exportado desde el sistema.',
          'Si necesitas un PDF real, podemos integrarlo en el próximo paso.',
        ].join('\n');
        downloadFile(txt, `${report.title.toLowerCase().replace(/\s+/g, '-')}.txt`, 'text/plain;charset=utf-8;');
      }

      toast.success(`Reporte generado: ${report.title}`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo generar el reporte');
    } finally {
      setGeneratingKey(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Centro de Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">Genera y descarga reportes del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.title} className="bg-card rounded-xl border border-border p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${r.color} flex items-center justify-center mb-4 shrink-0`}>
              <r.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">{r.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">{r.desc}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <button onClick={() => handleGenerate(r, 'excel')} className="flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted">
                <FileSpreadsheet className="w-3 h-3" /> Excel
              </button>
              <button onClick={() => handleGenerate(r, 'pdf')} className="flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted">
                <FileText className="w-3 h-3" /> PDF
              </button>
            </div>
            <button
              onClick={() => handleGenerate(r, 'excel')}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
              disabled={generatingKey === r.key}
            >
              {generatingKey === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Generar
            </button>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Consejo: si necesitas PDF real o plantillas Excel formateadas, dime y lo dejamos listo hoy mismo.
      </div>
    </div>
  );
};

export default ReportsPage;
