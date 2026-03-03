<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Subcategoria;
use App\Models\Proveedor;
use App\Models\MovimientoInventario;
use App\Models\LogActividad;
use App\Models\Notificacion;
use App\Models\User;
use App\Mail\StockCriticoMail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use App\Support\ClasificadorCategoriaProducto;

class ProductoController extends Controller
{
    /**
     * Listar todos los productos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'subcategoria', 'proveedor']);

        // Filtros
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }

        if ($request->has('subcategoria_id')) {
            $query->where('subcategoria_id', $request->subcategoria_id);
        }

        if ($request->has('proveedor_id')) {
            $query->where('proveedor_id', $request->proveedor_id);
        }

        if ($request->has('estado_stock')) {
            $query->where('estado_stock', $request->estado_stock);
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }

        if ($request->has('buscar')) {
            $query->buscar($request->buscar);
        }

        // Ordenamiento
        $orderBy = $request->get('order_by', 'nombre');
        $orderDir = $request->get('order_dir', 'asc');
        $query->orderBy($orderBy, $orderDir);

        $productos = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $productos,
        ]);
    }

    /**
     * Crear un nuevo producto
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo' => 'required|string|unique:productos,codigo',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'required|exists:categorias,id',
            'subcategoria_id' => 'nullable|exists:subcategorias,id',
            'proveedor_id' => 'nullable|exists:proveedores,id',
            'precio_compra' => 'required|numeric|min:0',
            'precio_venta' => 'required|numeric|gt:0',
            'stock' => 'required|integer|min:0',
            'stock_minimo' => 'required|integer|min:0',
            'unidad_medida' => 'nullable|string|max:50',
            'ubicacion' => 'nullable|string|max:100',
            'marca' => 'nullable|string|max:100',
            'presentacion' => 'nullable|string|max:100',
            'fecha_vencimiento' => 'nullable|date',
            'lote' => 'nullable|string|max:50',
        ]);

        $producto = Producto::create($validated);

        // Registrar movimiento inicial si hay stock
        if ($producto->stock > 0) {
            MovimientoInventario::create([
                'producto_id' => $producto->id,
                'user_id' => auth()->id(),
                'proveedor_id' => $producto->proveedor_id,
                'tipo' => 'entrada',
                'cantidad' => $producto->stock,
                'stock_anterior' => 0,
                'stock_nuevo' => $producto->stock,
                'precio_compra' => $producto->precio_compra,
                'lote' => $producto->lote,
                'motivo' => 'Stock inicial',
            ]);
        }

        // Registrar actividad
        LogActividad::registrar(
            'crear_producto',
            auth()->id(),
            'Producto',
            $producto->id,
            null,
            $producto->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Producto creado exitosamente',
            'data' => $producto->load(['categoria', 'subcategoria', 'proveedor']),
        ], 201);
    }

    /**
     * Mostrar un producto especÃ­fico
     */
    public function show(Producto $producto): JsonResponse
    {
        $producto->load(['categoria', 'subcategoria', 'proveedor', 'movimientos' => function ($q) {
            $q->with('user')->orderBy('created_at', 'desc')->limit(10);
        }]);

        return response()->json([
            'success' => true,
            'data' => $producto,
        ]);
    }

    /**
     * Actualizar un producto
     */
    public function update(Request $request, Producto $producto): JsonResponse
    {
        $validated = $request->validate([
            'codigo' => 'sometimes|required|string|unique:productos,codigo,' . $producto->id,
            'nombre' => 'sometimes|required|string|max:255',
            'descripcion' => 'nullable|string',
            'categoria_id' => 'sometimes|required|exists:categorias,id',
            'subcategoria_id' => 'nullable|exists:subcategorias,id',
            'proveedor_id' => 'nullable|exists:proveedores,id',
            'precio_compra' => 'sometimes|required|numeric|min:0',
            'precio_venta' => 'sometimes|required|numeric|gt:0',
            'stock_minimo' => 'sometimes|required|integer|min:0',
            'unidad_medida' => 'nullable|string|max:50',
            'ubicacion' => 'nullable|string|max:100',
            'marca' => 'nullable|string|max:100',
            'presentacion' => 'nullable|string|max:100',
            'fecha_vencimiento' => 'nullable|date',
            'lote' => 'nullable|string|max:50',
            'activo' => 'sometimes|boolean',
        ]);

        $datosAnteriores = $producto->toArray();
        $producto->update($validated);

        // Registrar actividad
        LogActividad::registrar(
            'actualizar_producto',
            auth()->id(),
            'Producto',
            $producto->id,
            $datosAnteriores,
            $producto->fresh()->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado exitosamente',
            'data' => $producto->fresh()->load(['categoria', 'subcategoria', 'proveedor']),
        ]);
    }

    /**
     * Eliminar un producto
     */
    public function destroy(Producto $producto): JsonResponse
    {
        $datosAnteriores = $producto->toArray();
        $producto->delete();

        // Registrar actividad
        LogActividad::registrar(
            'eliminar_producto',
            auth()->id(),
            'Producto',
            $producto->id,
            $datosAnteriores,
            null
        );

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado exitosamente',
        ]);
    }

    /**
     * Registrar entrada de stock
     */
    public function entradaStock(Request $request, Producto $producto): JsonResponse
    {
        $validated = $request->validate([
            'cantidad' => 'required|integer|min:1',
            'precio_compra' => 'nullable|numeric|min:0',
            'proveedor_id' => 'nullable|exists:proveedores,id',
            'lote' => 'nullable|string|max:50',
            'recibido_por' => 'required|string|max:120',
            'notas' => 'nullable|string',
        ]);

        $stockAnterior = $producto->stock;

        DB::transaction(function () use ($producto, $validated, $stockAnterior) {
            // Actualizar stock y precio si se proporciona
            $producto->stock += $validated['cantidad'];
            if (isset($validated['precio_compra'])) {
                $producto->precio_compra = $validated['precio_compra'];
            }
            if (isset($validated['lote'])) {
                $producto->lote = $validated['lote'];
            }
            $producto->save();

            // Registrar movimiento
            $precioCompra = $validated['precio_compra'] ?? $producto->precio_compra;
            MovimientoInventario::create([
                'producto_id' => $producto->id,
                'user_id' => auth()->id(),
                'proveedor_id' => $validated['proveedor_id'] ?? $producto->proveedor_id,
                'tipo' => 'entrada',
                'cantidad' => $validated['cantidad'],
                'stock_anterior' => $stockAnterior,
                'stock_nuevo' => $producto->stock,
                'precio_compra' => $precioCompra,
                'lote' => $validated['lote'] ?? null,
                'recibido_por' => $validated['recibido_por'],
                'notas' => $validated['notas'] ?? null,
            ]);

            // Incrementar deuda del proveedor si hay proveedor y precio de compra
            $proveedorId = $validated['proveedor_id'] ?? $producto->proveedor_id;
            if ($proveedorId && $precioCompra > 0) {
                $montoTotal = $precioCompra * $validated['cantidad'];
                $proveedor = Proveedor::find($proveedorId);
                if ($proveedor) {
                    $proveedor->incrementarDeuda($montoTotal);
                }
            }
        });

        // Registrar actividad
        LogActividad::registrar(
            'entrada_stock',
            auth()->id(),
            'Producto',
            $producto->id,
            ['stock' => $stockAnterior],
            ['stock' => $producto->stock, 'cantidad_entrada' => $validated['cantidad']]
        );

        return response()->json([
            'success' => true,
            'message' => 'Entrada de stock registrada exitosamente',
            'data' => $producto->fresh(),
        ]);
    }

    /**
     * Registrar salida de stock
     */
    public function salidaStock(Request $request, Producto $producto): JsonResponse
    {
        $validated = $request->validate([
            'cantidad' => 'required|integer|min:1',
            'motivo' => 'required|string|max:255',
            'recibido_por' => 'required|string|max:120',
            'notas' => 'nullable|string',
        ]);

        // Validar que haya suficiente stock
        if ($producto->stock < $validated['cantidad']) {
            return response()->json([
                'success' => false,
                'message' => 'Stock insuficiente. Stock actual: ' . $producto->stock,
            ], 400);
        }

        $stockAnterior = $producto->stock;
        $estadoAnterior = $producto->estado_stock;

        DB::transaction(function () use ($producto, $validated, $stockAnterior) {
            $producto->stock -= $validated['cantidad'];
            $producto->save();

            // Registrar movimiento
            MovimientoInventario::create([
                'producto_id' => $producto->id,
                'user_id' => auth()->id(),
                'tipo' => 'salida',
                'cantidad' => $validated['cantidad'],
                'stock_anterior' => $stockAnterior,
                'stock_nuevo' => $producto->stock,
                'motivo' => $validated['motivo'],
                'recibido_por' => $validated['recibido_por'],
                'notas' => $validated['notas'] ?? null,
            ]);
        });

        // Verificar si el estado cambiÃ³ a crÃ­tico
        $producto->refresh();
        if ($producto->estado_stock === 'critico' && $estadoAnterior !== 'critico') {
            $this->notificarStockCritico($producto);
        }

        // Registrar actividad
        LogActividad::registrar(
            'salida_stock',
            auth()->id(),
            'Producto',
            $producto->id,
            ['stock' => $stockAnterior],
            ['stock' => $producto->stock, 'cantidad_salida' => $validated['cantidad'], 'motivo' => $validated['motivo']]
        );

        return response()->json([
            'success' => true,
            'message' => 'Salida de stock registrada exitosamente',
            'data' => $producto->fresh(),
        ]);
    }

    /**
     * Importar productos desde archivo Excel (SIIGO)
     */
    public function importarExcel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'archivo' => 'required|file|mimes:xlsx,xls|max:51200',
            'sobrescribir_existentes' => 'nullable|boolean',
            'stock_minimo_default' => 'nullable|integer|min:0|max:10000',
        ]);

        $sobrescribir = (bool) ($validated['sobrescribir_existentes'] ?? true);
        $stockMinimoDefault = (int) ($validated['stock_minimo_default'] ?? 5);

        try {
            $spreadsheet = IOFactory::load($request->file('archivo')->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $highestRow = $sheet->getHighestDataRow();

            if ($highestRow < 5) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo no contiene filas de productos vÃ¡lidas.',
                ], 422);
            }

            $categoriasBase = $this->obtenerCategoriasBaseParaImportacion();

            $errores = [];
            $creados = 0;
            $actualizados = 0;
            $omitidos = 0;

            DB::transaction(function () use (
                $sheet,
                $highestRow,
                $categoriasBase,
                $sobrescribir,
                $stockMinimoDefault,
                &$errores,
                &$creados,
                &$actualizados,
                &$omitidos
            ) {
                for ($row = 5; $row <= $highestRow; $row++) {
                    $tipo = trim((string) $sheet->getCell("A{$row}")->getFormattedValue());
                    $codigo = trim((string) $sheet->getCell("B{$row}")->getFormattedValue());
                    $nombre = trim((string) $sheet->getCell("C{$row}")->getFormattedValue());
                    $unidad = trim((string) $sheet->getCell("D{$row}")->getFormattedValue());
                    $precioBase = $sheet->getCell("E{$row}")->getCalculatedValue();
                    $impuestos = trim((string) $sheet->getCell("F{$row}")->getFormattedValue());
                    $stock = $sheet->getCell("G{$row}")->getCalculatedValue();
                    $estado = trim((string) $sheet->getCell("H{$row}")->getFormattedValue());

                    if ($codigo === '' && $nombre === '') {
                        continue;
                    }

                    if ($codigo === '' || $nombre === '') {
                        $errores[] = "Fila {$row}: cÃ³digo o nombre vacÃ­o.";
                        continue;
                    }

                    if ($tipo !== '' && mb_strtolower($tipo) !== 'producto') {
                        $omitidos++;
                        continue;
                    }

                    $precio = is_numeric($precioBase) ? (float) $precioBase : 0;
                    $stockInt = is_numeric($stock) ? max((int) $stock, 0) : 0;
                    $activo = $estado === '' || mb_strtolower($estado) === 'active';

                    [$categoriaDestino, $subcategoriaNombre] = ClasificadorCategoriaProducto::resolver($nombre, $categoriasBase);
                    $subcategoria = $subcategoriaNombre
                        ? Subcategoria::firstOrCreate(
                            [
                                'categoria_id' => $categoriaDestino->id,
                                'slug' => Str::slug($subcategoriaNombre),
                            ],
                            [
                                'nombre' => $subcategoriaNombre,
                                'activo' => true,
                            ]
                        )
                        : null;

                    $payload = [
                        'codigo' => $codigo,
                        'nombre' => $nombre,
                        'descripcion' => $impuestos !== '' ? "Impuesto: {$impuestos}" : null,
                        'categoria_id' => $categoriaDestino->id,
                        'subcategoria_id' => $subcategoria?->id,
                        'precio_compra' => max($precio, 0),
                        'precio_venta' => max($precio, 0),
                        'stock' => $stockInt,
                        'stock_minimo' => $stockMinimoDefault,
                        'unidad_medida' => $unidad !== '' ? $unidad : 'unidad',
                        'activo' => $activo,
                    ];

                    $existente = Producto::where('codigo', $codigo)->first();
                    if ($existente) {
                        if (!$sobrescribir) {
                            $omitidos++;
                            continue;
                        }

                        $stockAnterior = $existente->stock;
                        $existente->update($payload);
                        $actualizados++;

                        if ($stockInt !== $stockAnterior) {
                            MovimientoInventario::create([
                                'producto_id' => $existente->id,
                                'user_id' => auth()->id(),
                                'tipo' => 'ajuste',
                                'cantidad' => abs($stockInt - $stockAnterior),
                                'stock_anterior' => $stockAnterior,
                                'stock_nuevo' => $stockInt,
                                'motivo' => 'ImportaciÃ³n masiva de Excel',
                                'recibido_por' => auth()->user()?->nombre ?? 'Sistema',
                                'notas' => 'Ajuste automÃ¡tico por importaciÃ³n masiva',
                            ]);
                        }

                        continue;
                    }

                    $producto = Producto::create($payload);
                    $creados++;

                    if ($stockInt > 0) {
                        MovimientoInventario::create([
                            'producto_id' => $producto->id,
                            'user_id' => auth()->id(),
                            'tipo' => 'entrada',
                            'cantidad' => $stockInt,
                            'stock_anterior' => 0,
                            'stock_nuevo' => $stockInt,
                            'precio_compra' => max($precio, 0),
                            'motivo' => 'Stock inicial por importaciÃ³n',
                            'recibido_por' => auth()->user()?->nombre ?? 'Sistema',
                            'notas' => 'ImportaciÃ³n masiva de productos',
                        ]);
                    }
                }
            });

            LogActividad::registrar(
                'importar_productos_excel',
                auth()->id(),
                'Producto',
                null,
                null,
                [
                    'creados' => $creados,
                    'actualizados' => $actualizados,
                    'omitidos' => $omitidos,
                    'errores' => count($errores),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'ImportaciÃ³n de productos completada',
                'data' => [
                    'creados' => $creados,
                    'actualizados' => $actualizados,
                    'omitidos' => $omitidos,
                    'errores' => $errores,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error procesando el archivo Excel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener categorÃ­as estÃ¡ndar usadas en la clasificaciÃ³n automÃ¡tica.
     */
    private function obtenerCategoriasBaseParaImportacion(): array
    {
        $definiciones = [
            'alimentos' => ['nombre' => 'Alimentos para Mascotas', 'icono' => 'fa-bone', 'color' => '#3B82F6'],
            'medicamentos' => ['nombre' => 'Medicamentos Veterinarios', 'icono' => 'fa-pills', 'color' => '#F59E0B'],
            'suplementos' => ['nombre' => 'Suplementos Animales', 'icono' => 'fa-capsules', 'color' => '#EC4899'],
            'insumos' => ['nombre' => 'Insumos AgrÃ­colas', 'icono' => 'fa-tractor', 'color' => '#10B981'],
            'accesorios' => ['nombre' => 'Accesorios para Mascotas', 'icono' => 'fa-paw', 'color' => '#8B5CF6'],
        ];

        $categorias = [];
        foreach ($definiciones as $slug => $data) {
            $categorias[$slug] = Categoria::firstOrCreate(
                ['slug' => $slug],
                [
                    'nombre' => $data['nombre'],
                    'icono' => $data['icono'],
                    'color' => $data['color'],
                    'activo' => true,
                ]
            );
        }

        return $categorias;
    }
    /**
     * Obtener productos con stock bajo o crÃ­tico
     */
    public function stockBajo(): JsonResponse
    {
        $productos = Producto::with(['categoria', 'proveedor'])
            ->activos()
            ->stockBajo()
            ->orderBy('estado_stock', 'desc')
            ->orderBy('stock')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $productos,
        ]);
    }

    /**
     * Obtener movimientos de un producto
     */
    public function movimientos(Request $request, Producto $producto): JsonResponse
    {
        $query = $producto->movimientos()->with(['user', 'proveedor']);

        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        $movimientos = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $movimientos,
        ]);
    }

    /**
     * Notificar stock crÃ­tico a administradores
     */
    private function notificarStockCritico(Producto $producto): void
    {
        // Crear notificaciÃ³n para todos los admins
        $admins = User::where('rol', 'admin')->where('activo', true)->get();

        foreach ($admins as $admin) {
            Notificacion::create([
                'user_id' => $admin->id,
                'tipo' => 'stock_critico',
                'titulo' => 'Stock CrÃ­tico: ' . $producto->nombre,
                'mensaje' => "El producto {$producto->codigo} - {$producto->nombre} ha llegado a stock crÃ­tico. Stock actual: {$producto->stock}",
                'enlace' => "/productos/{$producto->id}",
                'datos' => [
                    'producto_id' => $producto->id,
                    'codigo' => $producto->codigo,
                    'stock' => $producto->stock,
                    'stock_minimo' => $producto->stock_minimo,
                ],
            ]);
        }

        // Enviar email a admins (opcional, puede ser pesado)
        try {
            $productosData = [[
                'codigo' => $producto->codigo,
                'nombre' => $producto->nombre,
                'stock' => $producto->stock,
                'stock_minimo' => $producto->stock_minimo,
            ]];

            foreach ($admins as $admin) {
                Mail::to($admin->email)->queue(new StockCriticoMail($productosData));
            }
        } catch (\Exception $e) {
            \Log::error('Error enviando email de stock crÃ­tico: ' . $e->getMessage());
        }
    }
}

