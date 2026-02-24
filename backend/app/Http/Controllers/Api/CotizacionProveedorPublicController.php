<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CotizacionProveedor;
use App\Models\CotizacionRespuesta;
use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CotizacionProveedorPublicController extends Controller
{
    /**
     * Obtener información de la cotización con token público
     */
    public function obtenerCotizacion(string $token): JsonResponse
    {
        $cotizacionProveedor = CotizacionProveedor::where('token', $token)
            ->with([
                'cotizacion.productos',
                'proveedor',
                'cotizacion.user',
            ])
            ->first();

        if (!$cotizacionProveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido o cotización no encontrada',
            ], 404);
        }

        if (!$cotizacionProveedor->tokenEsValido()) {
            return response()->json([
                'success' => false,
                'message' => 'El enlace ha expirado. Contacte a El Galpón para solicitar uno nuevo.',
            ], 410);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'cotizacion' => [
                    'numero' => $cotizacionProveedor->cotizacion->numero,
                    'titulo' => $cotizacionProveedor->cotizacion->titulo,
                    'descripcion' => $cotizacionProveedor->cotizacion->descripcion,
                    'fecha_limite' => $cotizacionProveedor->cotizacion->fecha_limite->format('Y-m-d'),
                ],
                'proveedor' => [
                    'nombre_empresa' => $cotizacionProveedor->proveedor->nombre_empresa,
                    'nit' => $cotizacionProveedor->proveedor->nit,
                    'nombre_asesor' => $cotizacionProveedor->proveedor->nombre_asesor,
                ],
                'productos' => $cotizacionProveedor->cotizacion->productos->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'nombre' => $p->nombre_producto,
                        'cantidad' => $p->cantidad,
                        'especificaciones' => $p->especificaciones,
                    ];
                }),
                'ya_respondida' => $cotizacionProveedor->estado === 'respondida',
            ],
        ]);
    }

    /**
     * Descargar plantilla Excel con los productos de la cotización
     */
    public function descargarPlantilla(string $token)
    {
        $cotizacionProveedor = CotizacionProveedor::where('token', $token)
            ->with(['cotizacion.productos', 'proveedor'])
            ->first();

        if (!$cotizacionProveedor || !$cotizacionProveedor->tokenEsValido()) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido o expirado',
            ], 404);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Información de la cotización
        $sheet->setCellValue('A1', 'COTIZACIÓN EL GALPÓN');
        $sheet->setCellValue('A2', 'Número: ' . $cotizacionProveedor->cotizacion->numero);
        $sheet->setCellValue('A3', 'Proveedor: ' . $cotizacionProveedor->proveedor->nombre_empresa);
        $sheet->setCellValue('A4', 'Fecha límite: ' . $cotizacionProveedor->cotizacion->fecha_limite->format('d/m/Y'));

        // Estilos para el encabezado
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A2:A4')->getFont()->setItalic(true);

        // Encabezados de la tabla
        $sheet->setCellValue('A6', 'ID');
        $sheet->setCellValue('B6', 'Producto');
        $sheet->setCellValue('C6', 'Cantidad');
        $sheet->setCellValue('D6', 'Especificaciones');
        $sheet->setCellValue('E6', 'Precio Unitario');
        $sheet->setCellValue('F6', 'Disponible (unidades)');
        $sheet->setCellValue('G6', 'Tiempo Entrega (días)');
        $sheet->setCellValue('H6', 'Observaciones');

        // Estilo del encabezado
        $sheet->getStyle('A6:H6')->getFont()->setBold(true);
        $sheet->getStyle('A6:H6')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF10B981');
        $sheet->getStyle('A6:H6')->getFont()->getColor()->setARGB('FFFFFFFF');

        // Datos de productos
        $row = 7;
        foreach ($cotizacionProveedor->cotizacion->productos as $producto) {
            $sheet->setCellValue('A' . $row, $producto->id);
            $sheet->setCellValue('B' . $row, $producto->nombre_producto);
            $sheet->setCellValue('C' . $row, $producto->cantidad);
            $sheet->setCellValue('D' . $row, $producto->especificaciones ?? '-');
            $sheet->setCellValue('E' . $row, ''); // Para que el proveedor llene
            $sheet->setCellValue('F' . $row, ''); // Para que el proveedor llene
            $sheet->setCellValue('G' . $row, ''); // Para que el proveedor llene
            $sheet->setCellValue('H' . $row, ''); // Para que el proveedor llene
            $row++;
        }

        // Instrucciones
        $row += 2;
        $sheet->setCellValue('A' . $row, 'INSTRUCCIONES:');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;
        $sheet->setCellValue('A' . $row, '1. Complete SOLO las columnas E, F, G y H (marcadas en amarillo)');
        $row++;
        $sheet->setCellValue('A' . $row, '2. NO modifique las columnas A, B, C y D');
        $row++;
        $sheet->setCellValue('A' . $row, '3. Precio Unitario: Ingrese el precio por unidad en pesos colombianos');
        $row++;
        $sheet->setCellValue('A' . $row, '4. Disponible: Cantidad de unidades que puede suministrar');
        $row++;
        $sheet->setCellValue('A' . $row, '5. Tiempo Entrega: Días hábiles para entregar el producto');
        $row++;
        $sheet->setCellValue('A' . $row, '6. Guarde el archivo y súbalo en la página web');

        // Marcar columnas editables en amarillo
        $lastRow = 6 + $cotizacionProveedor->cotizacion->productos->count();
        $sheet->getStyle('E7:H' . $lastRow)->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFFFFF00');

        // Ajustar anchos de columna
        $sheet->getColumnDimension('A')->setWidth(10);
        $sheet->getColumnDimension('B')->setWidth(30);
        $sheet->getColumnDimension('C')->setWidth(12);
        $sheet->getColumnDimension('D')->setWidth(25);
        $sheet->getColumnDimension('E')->setWidth(18);
        $sheet->getColumnDimension('F')->setWidth(20);
        $sheet->getColumnDimension('G')->setWidth(20);
        $sheet->getColumnDimension('H')->setWidth(25);

        // Generar archivo
        $writer = new Xlsx($spreadsheet);
        $fileName = 'Cotizacion_' . $cotizacionProveedor->cotizacion->numero . '_' . str_replace(' ', '_', $cotizacionProveedor->proveedor->nombre) . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'cotizacion_');
        $writer->save($tempFile);

        return response()->download($tempFile, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Subir Excel con respuesta de proveedor
     */
    public function subirExcel(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:xlsx,xls|max:10240', // Máximo 10MB
            'notas_generales' => 'nullable|string|max:1000',
        ]);

        $cotizacionProveedor = CotizacionProveedor::where('token', $token)
            ->with(['cotizacion.productos'])
            ->first();

        if (!$cotizacionProveedor || !$cotizacionProveedor->tokenEsValido()) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido o expirado',
            ], 404);
        }

        try {
            $file = $request->file('archivo');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();

            $respuestas = [];
            $errores = [];

            // Leer desde la fila 7 (donde empiezan los productos)
            $row = 7;
            foreach ($cotizacionProveedor->cotizacion->productos as $producto) {
                $productoId = $sheet->getCell('A' . $row)->getValue();
                $precioUnitario = $sheet->getCell('E' . $row)->getValue();
                $disponible = $sheet->getCell('F' . $row)->getValue();
                $tiempoEntrega = $sheet->getCell('G' . $row)->getValue();
                $observaciones = $sheet->getCell('H' . $row)->getValue();

                // Validar que el ID coincida
                if ($productoId != $producto->id) {
                    $errores[] = "Error en fila {$row}: El ID del producto no coincide";
                    continue;
                }

                // Validar precio
                if (empty($precioUnitario) || !is_numeric($precioUnitario) || $precioUnitario < 0) {
                    $errores[] = "Error en fila {$row} ({$producto->nombre_producto}): Precio inválido";
                    continue;
                }

                $respuestas[] = [
                    'cotizacion_producto_id' => $producto->id,
                    'precio_unitario' => (float) $precioUnitario,
                    'cantidad_disponible' => is_numeric($disponible) ? (int) $disponible : null,
                    'tiempo_entrega_dias' => is_numeric($tiempoEntrega) ? (int) $tiempoEntrega : null,
                    'notas' => $observaciones ? (string) $observaciones : null,
                ];

                $row++;
            }

            if (!empty($errores)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo contiene errores',
                    'errores' => $errores,
                ], 422);
            }

            if (empty($respuestas)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron respuestas válidas en el archivo',
                ], 422);
            }

            // Guardar respuestas en la base de datos
            DB::transaction(function () use ($cotizacionProveedor, $respuestas, $request) {
                // Eliminar respuestas anteriores si existen
                $cotizacionProveedor->respuestas()->delete();

                // Crear nuevas respuestas
                foreach ($respuestas as $respuesta) {
                    CotizacionRespuesta::create([
                        'cotizacion_proveedor_id' => $cotizacionProveedor->id,
                        'cotizacion_producto_id' => $respuesta['cotizacion_producto_id'],
                        'precio_unitario' => $respuesta['precio_unitario'],
                        'cantidad_disponible' => $respuesta['cantidad_disponible'],
                        'tiempo_entrega_dias' => $respuesta['tiempo_entrega_dias'],
                        'notas' => $respuesta['notas'],
                    ]);
                }

                // Actualizar estado
                $cotizacionProveedor->update([
                    'estado' => 'respondida',
                    'fecha_respuesta' => now(),
                    'notas' => $request->input('notas_generales'),
                ]);

                // Actualizar estado de la cotización
                $cotizacion = $cotizacionProveedor->cotizacion;
                if ($cotizacion->estado === 'enviada') {
                    $cotizacion->update(['estado' => 'en_proceso']);
                }
            });

            // Notificar a los admins
            $admins = User::where('rol', 'admin')->where('activo', true)->get();
            $proveedor = $cotizacionProveedor->proveedor;
            $cotizacion = $cotizacionProveedor->cotizacion;

            foreach ($admins as $admin) {
                Notificacion::create([
                    'user_id' => $admin->id,
                    'tipo' => 'cotizacion_respuesta',
                    'titulo' => '✅ Nueva respuesta de cotización',
                    'mensaje' => "El proveedor {$proveedor->nombre} respondió la cotización {$cotizacion->numero} mediante Excel",
                    'enlace' => "/cotizaciones/{$cotizacion->id}",
                    'datos' => [
                        'cotizacion_id' => $cotizacion->id,
                        'proveedor_id' => $proveedor->id,
                        'metodo' => 'excel',
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => '¡Cotización enviada exitosamente! Gracias por su respuesta.',
                'data' => [
                    'productos_procesados' => count($respuestas),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el archivo: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar respuesta mediante formulario web (alternativa al Excel)
     */
    public function enviarRespuestaWeb(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'respuestas' => 'required|array|min:1',
            'respuestas.*.cotizacion_producto_id' => 'nullable|exists:cotizacion_productos,id',
            'respuestas.*.precio_unitario' => 'required|numeric|min:0',
            'respuestas.*.cantidad_disponible' => 'nullable|integer|min:0',
            'respuestas.*.tiempo_entrega_dias' => 'nullable|integer|min:0',
            'respuestas.*.notas' => 'nullable|string',
            'respuestas.*.es_producto_extra' => 'nullable|boolean',
            'respuestas.*.nombre_producto_extra' => 'nullable|string|max:255',
            'notas_generales' => 'nullable|string',
        ]);

        $cotizacionProveedor = CotizacionProveedor::where('token', $token)->first();

        if (!$cotizacionProveedor || !$cotizacionProveedor->tokenEsValido()) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido o expirado',
            ], 404);
        }

        DB::transaction(function () use ($cotizacionProveedor, $validated) {
            // Eliminar respuestas anteriores si existen
            $cotizacionProveedor->respuestas()->delete();

            // Crear nuevas respuestas
            foreach ($validated['respuestas'] as $respuesta) {
                $esProductoExtra = $respuesta['es_producto_extra'] ?? false;

                CotizacionRespuesta::create([
                    'cotizacion_proveedor_id' => $cotizacionProveedor->id,
                    'cotizacion_producto_id' => $esProductoExtra ? null : $respuesta['cotizacion_producto_id'],
                    'precio_unitario' => $respuesta['precio_unitario'],
                    'cantidad_disponible' => $respuesta['cantidad_disponible'] ?? null,
                    'tiempo_entrega_dias' => $respuesta['tiempo_entrega_dias'] ?? null,
                    'notas' => $respuesta['notas'] ?? null,
                    'es_producto_extra' => $esProductoExtra,
                    'nombre_producto_extra' => $esProductoExtra ? $respuesta['nombre_producto_extra'] : null,
                ]);
            }

            // Actualizar estado
            $cotizacionProveedor->update([
                'estado' => 'respondida',
                'fecha_respuesta' => now(),
                'notas' => $validated['notas_generales'] ?? null,
            ]);

            // Actualizar estado de la cotización
            $cotizacion = $cotizacionProveedor->cotizacion;
            if ($cotizacion->estado === 'enviada') {
                $cotizacion->update(['estado' => 'en_proceso']);
            }
        });

        // Notificar a los admins
        $admins = User::where('rol', 'admin')->where('activo', true)->get();
        $proveedor = $cotizacionProveedor->proveedor;
        $cotizacion = $cotizacionProveedor->cotizacion;

        // Contar productos extra
        $productosExtra = collect($validated['respuestas'])->where('es_producto_extra', true)->count();
        $mensajeExtra = $productosExtra > 0 ? " (incluye {$productosExtra} producto(s) extra)" : "";

        foreach ($admins as $admin) {
            Notificacion::create([
                'user_id' => $admin->id,
                'tipo' => 'cotizacion_respuesta',
                'titulo' => '✅ Nueva respuesta de cotización',
                'mensaje' => "El proveedor {$proveedor->nombre} respondió la cotización {$cotizacion->numero} mediante formulario web{$mensajeExtra}",
                'enlace' => "/cotizaciones/{$cotizacion->id}",
                'datos' => [
                    'cotizacion_id' => $cotizacion->id,
                    'proveedor_id' => $proveedor->id,
                    'metodo' => 'web',
                    'productos_extra' => $productosExtra,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => '¡Cotización enviada exitosamente! Gracias por su respuesta.',
            'data' => $cotizacionProveedor->fresh()->load('respuestas'),
        ]);
    }
}
