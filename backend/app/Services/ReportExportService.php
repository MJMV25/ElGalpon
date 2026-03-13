<?php

namespace App\Services;

use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\User;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ReportExportService
{
    public function __construct(private readonly SystemSettingsService $settingsService)
    {
    }

    /**
     * @return array{content:string,filename:string,mime:string}
     */
    public function export(string $tipo, string $formato, User $user, array $filters = []): array
    {
        $report = $this->buildReport($tipo, $user, $filters);

        if ($formato === 'excel') {
            return $this->buildExcel($report);
        }

        return $this->buildPdf($report);
    }

    /**
     * @return array<string,mixed>
     */
    private function buildReport(string $tipo, User $user, array $filters): array
    {
        return match ($tipo) {
            'inventario' => $this->reportInventarioCompleto($user),
            'stock' => $this->reportProductosBajoStock($user),
            'categorias' => $this->reportAnalisisCategorias($user),
            'valoracion' => $this->reportValoracionFinanciera($user),
            'movimientos' => $this->reportMovimientosInventario($user, $filters),
            'proveedores' => $this->reportProveedores($user),
            default => throw new \InvalidArgumentException('Tipo de reporte no soportado'),
        };
    }

    /**
     * @param array<string,mixed> $report
     * @return array{content:string,filename:string,mime:string}
     */
    private function buildExcel(array $report): array
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr($report['sheet_name'], 0, 31));

        $sheet->setCellValue('A1', $report['business_name']);
        $sheet->setCellValue('A2', $report['title']);
        $sheet->setCellValue('A3', 'Generado: ' . $report['generated_at']->format('Y-m-d H:i:s'));
        $sheet->setCellValue('A4', 'Usuario: ' . $report['generated_by']);

        $columnCount = count($report['columns']);
        $lastColumn = Coordinate::stringFromColumnIndex(max($columnCount, 1));
        $headerRange = "A6:{$lastColumn}6";

        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->mergeCells("A2:{$lastColumn}2");
        $sheet->mergeCells("A3:{$lastColumn}3");
        $sheet->mergeCells("A4:{$lastColumn}4");

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle('A3:A4')->getFont()->setSize(10);

        foreach ($report['columns'] as $index => $column) {
            $col = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue("{$col}6", $column['label']);
        }

        $sheet->getStyle($headerRange)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($headerRange)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()
            ->setRGB('1F4E78');

        $startRow = 7;
        foreach ($report['rows'] as $rowIndex => $rowData) {
            $currentRow = $startRow + $rowIndex;

            foreach ($report['columns'] as $index => $column) {
                $col = Coordinate::stringFromColumnIndex($index + 1);
                $value = $rowData[$column['key']] ?? null;

                $sheet->setCellValue("{$col}{$currentRow}", $value);
                $this->applyExcelCellFormat($sheet, "{$col}{$currentRow}", $column['type'] ?? 'text');
            }
        }

        $lastDataRow = max($startRow, $startRow + count($report['rows']) - 1);

        $summaryStart = $lastDataRow + 2;
        $sheet->setCellValue("A{$summaryStart}", 'Resumen');
        $sheet->getStyle("A{$summaryStart}")->getFont()->setBold(true);

        foreach ($report['summary'] as $i => $item) {
            $row = $summaryStart + 1 + $i;
            $sheet->setCellValue("A{$row}", $item['label']);
            $sheet->setCellValue("B{$row}", $item['value']);
            $this->applyExcelCellFormat($sheet, "B{$row}", $item['type'] ?? 'text');
        }

        for ($i = 1; $i <= $columnCount; $i++) {
            $col = Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->freezePane('A7');

        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        $content = (string) ob_get_clean();

        return [
            'content' => $content,
            'filename' => $this->buildFileName($report['slug'], 'xlsx', $report['generated_at']),
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
    }

    /**
     * @param array<string,mixed> $report
     * @return array{content:string,filename:string,mime:string}
     */
    private function buildPdf(array $report): array
    {
        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);

        $rowsForPdf = collect($report['rows'])->map(function (array $row) use ($report) {
            $formatted = [];
            foreach ($report['columns'] as $column) {
                $formatted[$column['key']] = $this->formatValue($row[$column['key']] ?? null, $column['type'] ?? 'text');
            }
            return $formatted;
        })->all();

        $summaryForPdf = collect($report['summary'])->map(function (array $item) {
            return [
                'label' => $item['label'],
                'value' => $this->formatValue($item['value'] ?? null, $item['type'] ?? 'text'),
            ];
        })->all();

        $html = view('reports.export-pdf', [
            'report' => $report,
            'rowsForPdf' => $rowsForPdf,
            'summaryForPdf' => $summaryForPdf,
        ])->render();

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return [
            'content' => $dompdf->output(),
            'filename' => $this->buildFileName($report['slug'], 'pdf', $report['generated_at']),
            'mime' => 'application/pdf',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function reportInventarioCompleto(User $user): array
    {
        $productos = Producto::with(['categoria:id,nombre', 'subcategoria:id,nombre', 'proveedor:id,nombre_empresa'])
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();

        $rows = $productos->map(function (Producto $p) {
            return [
                'codigo' => $p->codigo,
                'nombre' => $p->nombre,
                'categoria' => $p->categoria?->nombre,
                'subcategoria' => $p->subcategoria?->nombre,
                'proveedor' => $p->proveedor?->nombre_empresa,
                'stock' => (int) $p->stock,
                'stock_minimo' => (int) $p->stock_minimo,
                'estado_stock' => $p->estado_stock,
                'precio_compra' => (float) $p->precio_compra,
                'precio_venta' => (float) $p->precio_venta,
                'valor_inventario' => round((float) $p->stock * (float) $p->precio_compra, 2),
            ];
        })->all();

        return $this->baseReport(
            slug: 'inventario_completo',
            title: 'Inventario Completo',
            sheetName: 'Inventario',
            generatedBy: $user,
            columns: [
                ['key' => 'codigo', 'label' => 'Codigo', 'type' => 'text'],
                ['key' => 'nombre', 'label' => 'Producto', 'type' => 'text'],
                ['key' => 'categoria', 'label' => 'Categoria', 'type' => 'text'],
                ['key' => 'subcategoria', 'label' => 'Subcategoria', 'type' => 'text'],
                ['key' => 'proveedor', 'label' => 'Proveedor', 'type' => 'text'],
                ['key' => 'stock', 'label' => 'Stock', 'type' => 'number'],
                ['key' => 'stock_minimo', 'label' => 'Stock Minimo', 'type' => 'number'],
                ['key' => 'estado_stock', 'label' => 'Estado', 'type' => 'text'],
                ['key' => 'precio_compra', 'label' => 'Precio Compra', 'type' => 'currency'],
                ['key' => 'precio_venta', 'label' => 'Precio Venta', 'type' => 'currency'],
                ['key' => 'valor_inventario', 'label' => 'Valor Inventario', 'type' => 'currency'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Total productos', 'value' => $productos->count(), 'type' => 'number'],
                ['label' => 'Total unidades', 'value' => $productos->sum('stock'), 'type' => 'number'],
                ['label' => 'Valor total inventario', 'value' => $productos->sum(fn(Producto $p) => $p->stock * $p->precio_compra), 'type' => 'currency'],
            ]
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function reportProductosBajoStock(User $user): array
    {
        $productos = Producto::with(['categoria:id,nombre'])
            ->where('activo', true)
            ->where(function ($query) {
                $query->where('stock', '<=', 0)
                    ->orWhereIn('estado_stock', ['bajo', 'critico']);
            })
            ->orderBy('stock')
            ->orderBy('nombre')
            ->get();

        $rows = $productos->map(function (Producto $p) {
            $faltante = max(0, (int) $p->stock_minimo - (int) $p->stock);
            return [
                'codigo' => $p->codigo,
                'nombre' => $p->nombre,
                'categoria' => $p->categoria?->nombre,
                'stock_actual' => (int) $p->stock,
                'stock_minimo' => (int) $p->stock_minimo,
                'faltante' => $faltante,
                'estado' => $p->estado_stock,
                'costo_reposicion' => round($faltante * (float) $p->precio_compra, 2),
            ];
        })->all();

        return $this->baseReport(
            slug: 'productos_bajo_stock',
            title: 'Productos Bajo Stock',
            sheetName: 'Stock Bajo',
            generatedBy: $user,
            columns: [
                ['key' => 'codigo', 'label' => 'Codigo', 'type' => 'text'],
                ['key' => 'nombre', 'label' => 'Producto', 'type' => 'text'],
                ['key' => 'categoria', 'label' => 'Categoria', 'type' => 'text'],
                ['key' => 'stock_actual', 'label' => 'Stock Actual', 'type' => 'number'],
                ['key' => 'stock_minimo', 'label' => 'Stock Minimo', 'type' => 'number'],
                ['key' => 'faltante', 'label' => 'Faltante', 'type' => 'number'],
                ['key' => 'estado', 'label' => 'Estado', 'type' => 'text'],
                ['key' => 'costo_reposicion', 'label' => 'Costo Reposicion', 'type' => 'currency'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Total productos en alerta', 'value' => $productos->count(), 'type' => 'number'],
                ['label' => 'Productos criticos', 'value' => $productos->where('estado_stock', 'critico')->count(), 'type' => 'number'],
                ['label' => 'Inversion requerida', 'value' => collect($rows)->sum('costo_reposicion'), 'type' => 'currency'],
            ]
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function reportAnalisisCategorias(User $user): array
    {
        $categorias = DB::table('productos')
            ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->where('productos.activo', true)
            ->select(
                'categorias.nombre as categoria',
                DB::raw('COUNT(*) as total_productos'),
                DB::raw('SUM(productos.stock) as total_stock'),
                DB::raw('SUM(productos.stock * productos.precio_compra) as valor_inventario'),
                DB::raw('SUM(productos.stock * productos.precio_venta) as valor_venta')
            )
            ->groupBy('categorias.nombre')
            ->orderByDesc('valor_inventario')
            ->get();

        $rows = $categorias->map(function ($c) {
            return [
                'categoria' => $c->categoria,
                'total_productos' => (int) $c->total_productos,
                'total_stock' => (int) $c->total_stock,
                'valor_inventario' => round((float) $c->valor_inventario, 2),
                'valor_venta' => round((float) $c->valor_venta, 2),
                'utilidad_potencial' => round((float) $c->valor_venta - (float) $c->valor_inventario, 2),
            ];
        })->all();

        return $this->baseReport(
            slug: 'analisis_categorias',
            title: 'Analisis por Categoria',
            sheetName: 'Categorias',
            generatedBy: $user,
            columns: [
                ['key' => 'categoria', 'label' => 'Categoria', 'type' => 'text'],
                ['key' => 'total_productos', 'label' => 'Productos', 'type' => 'number'],
                ['key' => 'total_stock', 'label' => 'Unidades', 'type' => 'number'],
                ['key' => 'valor_inventario', 'label' => 'Valor Inventario', 'type' => 'currency'],
                ['key' => 'valor_venta', 'label' => 'Valor Venta', 'type' => 'currency'],
                ['key' => 'utilidad_potencial', 'label' => 'Utilidad Potencial', 'type' => 'currency'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Total categorias', 'value' => $categorias->count(), 'type' => 'number'],
                ['label' => 'Valor inventario total', 'value' => collect($rows)->sum('valor_inventario'), 'type' => 'currency'],
                ['label' => 'Valor venta total', 'value' => collect($rows)->sum('valor_venta'), 'type' => 'currency'],
            ]
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function reportValoracionFinanciera(User $user): array
    {
        $productos = Producto::with(['categoria:id,nombre'])
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();

        $rows = $productos->map(function (Producto $p) {
            $valorCompra = (float) $p->stock * (float) $p->precio_compra;
            $valorVenta = (float) $p->stock * (float) $p->precio_venta;

            return [
                'codigo' => $p->codigo,
                'nombre' => $p->nombre,
                'categoria' => $p->categoria?->nombre,
                'stock' => (int) $p->stock,
                'precio_compra' => (float) $p->precio_compra,
                'precio_venta' => (float) $p->precio_venta,
                'margen_pct' => round((float) $p->margen, 2),
                'valor_compra' => round($valorCompra, 2),
                'valor_venta' => round($valorVenta, 2),
                'utilidad_potencial' => round($valorVenta - $valorCompra, 2),
            ];
        })->all();

        return $this->baseReport(
            slug: 'valoracion_financiera',
            title: 'Valoracion Financiera de Inventario',
            sheetName: 'Valoracion',
            generatedBy: $user,
            columns: [
                ['key' => 'codigo', 'label' => 'Codigo', 'type' => 'text'],
                ['key' => 'nombre', 'label' => 'Producto', 'type' => 'text'],
                ['key' => 'categoria', 'label' => 'Categoria', 'type' => 'text'],
                ['key' => 'stock', 'label' => 'Stock', 'type' => 'number'],
                ['key' => 'precio_compra', 'label' => 'Precio Compra', 'type' => 'currency'],
                ['key' => 'precio_venta', 'label' => 'Precio Venta', 'type' => 'currency'],
                ['key' => 'margen_pct', 'label' => 'Margen %', 'type' => 'percentage'],
                ['key' => 'valor_compra', 'label' => 'Valor Compra', 'type' => 'currency'],
                ['key' => 'valor_venta', 'label' => 'Valor Venta', 'type' => 'currency'],
                ['key' => 'utilidad_potencial', 'label' => 'Utilidad Potencial', 'type' => 'currency'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Total productos', 'value' => $productos->count(), 'type' => 'number'],
                ['label' => 'Valor compra total', 'value' => collect($rows)->sum('valor_compra'), 'type' => 'currency'],
                ['label' => 'Valor venta total', 'value' => collect($rows)->sum('valor_venta'), 'type' => 'currency'],
                ['label' => 'Utilidad potencial total', 'value' => collect($rows)->sum('utilidad_potencial'), 'type' => 'currency'],
            ]
        );
    }

    /**
     * @param array<string,mixed> $filters
     * @return array<string,mixed>
     */
    private function reportMovimientosInventario(User $user, array $filters): array
    {
        $fechaHasta = !empty($filters['fecha_hasta'])
            ? Carbon::parse((string) $filters['fecha_hasta'])->endOfDay()
            : now()->endOfDay();

        $fechaDesde = !empty($filters['fecha_desde'])
            ? Carbon::parse((string) $filters['fecha_desde'])->startOfDay()
            : now()->copy()->subDays(30)->startOfDay();

        $query = MovimientoInventario::with([
            'producto:id,codigo,nombre',
            'user:id,nombre',
            'proveedor:id,nombre_empresa',
        ])
            ->whereBetween('created_at', [$fechaDesde, $fechaHasta])
            ->orderByDesc('created_at');

        if (!empty($filters['tipo']) && in_array($filters['tipo'], ['entrada', 'salida', 'ajuste'], true)) {
            $query->where('tipo', $filters['tipo']);
        }

        $movimientos = $query->get();

        $rows = $movimientos->map(function (MovimientoInventario $m) {
            return [
                'fecha' => optional($m->created_at)->format('Y-m-d H:i:s'),
                'tipo' => $m->tipo,
                'codigo' => $m->producto?->codigo,
                'producto' => $m->producto?->nombre,
                'cantidad' => (int) $m->cantidad,
                'stock_anterior' => (int) $m->stock_anterior,
                'stock_nuevo' => (int) $m->stock_nuevo,
                'usuario' => $m->user?->nombre,
                'proveedor' => $m->proveedor?->nombre_empresa,
                'motivo' => $m->motivo,
            ];
        })->all();

        return $this->baseReport(
            slug: 'movimientos_inventario',
            title: 'Movimientos de Inventario',
            sheetName: 'Movimientos',
            generatedBy: $user,
            columns: [
                ['key' => 'fecha', 'label' => 'Fecha', 'type' => 'text'],
                ['key' => 'tipo', 'label' => 'Tipo', 'type' => 'text'],
                ['key' => 'codigo', 'label' => 'Codigo', 'type' => 'text'],
                ['key' => 'producto', 'label' => 'Producto', 'type' => 'text'],
                ['key' => 'cantidad', 'label' => 'Cantidad', 'type' => 'number'],
                ['key' => 'stock_anterior', 'label' => 'Stock Anterior', 'type' => 'number'],
                ['key' => 'stock_nuevo', 'label' => 'Stock Nuevo', 'type' => 'number'],
                ['key' => 'usuario', 'label' => 'Usuario', 'type' => 'text'],
                ['key' => 'proveedor', 'label' => 'Proveedor', 'type' => 'text'],
                ['key' => 'motivo', 'label' => 'Motivo', 'type' => 'text'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Periodo desde', 'value' => $fechaDesde->format('Y-m-d'), 'type' => 'text'],
                ['label' => 'Periodo hasta', 'value' => $fechaHasta->format('Y-m-d'), 'type' => 'text'],
                ['label' => 'Total movimientos', 'value' => $movimientos->count(), 'type' => 'number'],
                ['label' => 'Entradas', 'value' => $movimientos->where('tipo', 'entrada')->count(), 'type' => 'number'],
                ['label' => 'Salidas', 'value' => $movimientos->where('tipo', 'salida')->count(), 'type' => 'number'],
                ['label' => 'Ajustes', 'value' => $movimientos->where('tipo', 'ajuste')->count(), 'type' => 'number'],
            ]
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function reportProveedores(User $user): array
    {
        $proveedores = Proveedor::query()
            ->orderBy('nombre_empresa')
            ->get();

        $rows = $proveedores->map(function (Proveedor $p) {
            return [
                'empresa' => $p->nombre_empresa,
                'nit' => $p->nit,
                'linea_producto' => $p->linea_producto,
                'ciudad' => $p->ciudad,
                'email_comercial' => $p->email_comercial,
                'telefono_contacto' => $p->telefono_contacto,
                'asesor' => $p->nombre_asesor,
                'deuda' => (float) $p->deuda,
                'estado' => $p->activo ? 'Activo' : 'Inactivo',
            ];
        })->all();

        return $this->baseReport(
            slug: 'reporte_proveedores',
            title: 'Reporte de Proveedores',
            sheetName: 'Proveedores',
            generatedBy: $user,
            columns: [
                ['key' => 'empresa', 'label' => 'Empresa', 'type' => 'text'],
                ['key' => 'nit', 'label' => 'NIT', 'type' => 'text'],
                ['key' => 'linea_producto', 'label' => 'Linea', 'type' => 'text'],
                ['key' => 'ciudad', 'label' => 'Ciudad', 'type' => 'text'],
                ['key' => 'email_comercial', 'label' => 'Email', 'type' => 'text'],
                ['key' => 'telefono_contacto', 'label' => 'Telefono', 'type' => 'text'],
                ['key' => 'asesor', 'label' => 'Asesor', 'type' => 'text'],
                ['key' => 'deuda', 'label' => 'Deuda', 'type' => 'currency'],
                ['key' => 'estado', 'label' => 'Estado', 'type' => 'text'],
            ],
            rows: $rows,
            summary: [
                ['label' => 'Total proveedores', 'value' => $proveedores->count(), 'type' => 'number'],
                ['label' => 'Proveedores activos', 'value' => $proveedores->where('activo', true)->count(), 'type' => 'number'],
                ['label' => 'Deuda total', 'value' => $proveedores->sum('deuda'), 'type' => 'currency'],
            ]
        );
    }

    /**
     * @param array<int,array<string,mixed>> $columns
     * @param array<int,array<string,mixed>> $rows
     * @param array<int,array<string,mixed>> $summary
     * @return array<string,mixed>
     */
    private function baseReport(
        string $slug,
        string $title,
        string $sheetName,
        User $generatedBy,
        array $columns,
        array $rows,
        array $summary
    ): array {
        $generatedAt = now();

        return [
            'slug' => $slug,
            'title' => $title,
            'sheet_name' => $sheetName,
            'business_name' => $this->settingsService->getString('businessName', 'El Galpon'),
            'generated_at' => $generatedAt,
            'generated_by' => $generatedBy->nombre,
            'columns' => $columns,
            'rows' => $rows,
            'summary' => $summary,
        ];
    }

    private function applyExcelCellFormat($sheet, string $cell, string $type): void
    {
        if ($type === 'currency') {
            $sheet->getStyle($cell)->getNumberFormat()->setFormatCode('"$"#,##0.00');
            return;
        }

        if ($type === 'number') {
            $sheet->getStyle($cell)->getNumberFormat()->setFormatCode('#,##0');
            return;
        }

        if ($type === 'percentage') {
            $sheet->getStyle($cell)->getNumberFormat()->setFormatCode('0.00"%"');
        }
    }

    private function formatValue(mixed $value, string $type): string
    {
        if ($value === null || $value === '') {
            return '-';
        }

        return match ($type) {
            'currency' => '$' . number_format((float) $value, 2, ',', '.'),
            'number' => number_format((float) $value, 0, ',', '.'),
            'percentage' => number_format((float) $value, 2, ',', '.') . '%',
            default => (string) $value,
        };
    }

    private function buildFileName(string $slug, string $extension, Carbon $date): string
    {
        return sprintf('%s_%s.%s', $slug, $date->format('Ymd_His'), $extension);
    }
}
