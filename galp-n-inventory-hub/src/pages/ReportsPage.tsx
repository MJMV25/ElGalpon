import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Package, AlertTriangle, BarChart3, DollarSign, ArrowLeftRight, Truck } from 'lucide-react';

const reports = [
  { title: 'Inventario Completo', desc: 'Listado detallado de todos los productos con stock, precios y valores', icon: Package, color: 'bg-info' },
  { title: 'Productos Bajo Stock', desc: 'Lista de productos que requieren reabastecimiento urgente', icon: AlertTriangle, color: 'bg-warning' },
  { title: 'Análisis por Categoría', desc: 'Distribución de productos y valores por cada categoría', icon: BarChart3, color: 'bg-cat-accesorios' },
  { title: 'Valoración Financiera', desc: 'Análisis de costos, precios de venta y márgenes de ganancia', icon: DollarSign, color: 'bg-success' },
  { title: 'Movimientos de Inventario', desc: 'Historial de entradas y salidas de productos', icon: ArrowLeftRight, color: 'bg-info' },
  { title: 'Reporte de Proveedores', desc: 'Lista de proveedores con productos y montos de compra', icon: Truck, color: 'bg-cat-suplementos' },
];

const ReportsPage = () => {
  const handleGenerate = (title: string) => {
    toast.success(`Generando reporte: ${title}...`);
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
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> Excel</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
            </div>
            <button
              onClick={() => handleGenerate(r.title)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" /> Generar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
