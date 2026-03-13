import { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Package, AlertTriangle, BarChart3, DollarSign, ArrowLeftRight, Truck } from 'lucide-react';
import reportesService, { ReporteExportFormat, ReporteExportKey } from '@/services/reportesService';

type ReportKey = ReporteExportKey;

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

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resolveDefaultParams = (report: ReportKey): Record<string, string> | undefined => {
    if (report !== 'movimientos') {
      return undefined;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    return {
      fecha_desde: start.toISOString().slice(0, 10),
      fecha_hasta: end.toISOString().slice(0, 10),
    };
  };

  const handleGenerate = async (report: typeof reports[number], format: ReporteExportFormat = 'excel') => {
    try {
      setGeneratingKey(report.key);
      const payload = await reportesService.exportarReporte(report.key, format, resolveDefaultParams(report.key));
      triggerDownload(payload.blob, payload.filename);
      toast.success(`Reporte generado: ${report.title} (${format.toUpperCase()})`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'No se pudo generar el reporte');
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
        Descarga profesional disponible en Excel y PDF con datos reales del sistema.
      </div>
    </div>
  );
};

export default ReportsPage;
