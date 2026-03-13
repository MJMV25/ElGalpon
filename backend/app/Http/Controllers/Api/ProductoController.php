<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Subcategoria;
use App\Models\Proveedor;
use App\Models\MovimientoInventario;
use App\Models\LogActividad;
use App\Services\AlertService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use App\Support\ClasificadorCategoriaProducto;

class ProductoController extends Controller
{
    public function __construct(private readonly AlertService $alertService)
    {
    }

    /**
     * Listar todos los productos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'subcategoria', 'proveedor'])
            ->withMax('movimientos as ultimo_movimiento_at', 'created_at');

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
     * Busqueda rapida de productos para autocompletados.
     */
    public function buscarRapido(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'nullable|string|max:100',
            'limit' => 'nullable|integer|min:5|max:100',
        ]);

        $termino = trim((string) ($validated['q'] ?? ''));
        $limit = (int) ($validated['limit'] ?? 30);

        $query = Producto::query()
            ->select([
                'id',
                'codigo',
                'nombre',
                'presentacion',
                'stock',
                'stock_minimo',
                'precio_compra',
                'precio_venta',
            ])
            ->where('activo', true);

        if ($termino !== '') {
            $prefix = "{$termino}%";
            $wordPrefix = "% {$termino}%";
            $contains = "%{$termino}%";

            $query->where(function ($q) use ($prefix, $wordPrefix, $contains) {
                $q->where('codigo', 'like', $prefix)
                    ->orWhere('nombre', 'like', $prefix)
                    ->orWhere('nombre', 'like', $wordPrefix)
                    ->orWhere('nombre', 'like', $contains)
                    ->orWhere('presentacion', 'like', $contains);
            })->orderByRaw(
                "CASE
                    WHEN codigo LIKE ? THEN 0
                    WHEN nombre LIKE ? THEN 1
                    WHEN nombre LIKE ? THEN 2
                    ELSE 3
                END",
                [$prefix, $prefix, $wordPrefix]
            );
        }

        $productos = $query
            ->orderBy('nombre')
            ->limit($limit)
            ->get();

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

        $warnings = [];
        if ((float) $validated['precio_venta'] < (float) $validated['precio_compra']) {
            $warnings[] = 'El precio de venta quedo por debajo del precio de compra.';
        }
        if ((int) $validated['stock'] > 0 && (int) $validated['stock_minimo'] > (int) $validated['stock']) {
            $warnings[] = 'El stock minimo es mayor que el stock inicial.';
        }

        $producto = DB::transaction(function () use ($validated) {
            $nuevoProducto = Producto::create($validated);

            if ($nuevoProducto->stock > 0) {
                MovimientoInventario::create([
                    'producto_id' => $nuevoProducto->id,
                    'user_id' => auth()->id(),
                    'proveedor_id' => $nuevoProducto->proveedor_id,
                    'tipo' => 'entrada',
                    'cantidad' => $nuevoProducto->stock,
                    'stock_anterior' => 0,
                    'stock_nuevo' => $nuevoProducto->stock,
                    'precio_compra' => $nuevoProducto->precio_compra,
                    'lote' => $nuevoProducto->lote,
                    'motivo' => 'Stock inicial',
                ]);
            }

            LogActividad::registrarAuditoria([
                'accion' => 'crear_producto',
                'user_id' => auth()->id(),
                'modulo' => 'inventario',
                'modelo' => 'Producto',
                'modelo_id' => $nuevoProducto->id,
                'referencia' => $nuevoProducto->codigo,
                'datos_nuevos' => $nuevoProducto->toArray(),
                'observacion' => 'Creacion de producto',
            ]);

            return $nuevoProducto;
        });
        $this->alertService->notifyStockState($producto->fresh(), 'crear_producto');

        return response()->json([
            'success' => true,
            'message' => 'Producto creado exitosamente',
            'data' => $producto->load(['categoria', 'subcategoria', 'proveedor']),
            'warnings' => $warnings,
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
        $datosNuevos = $producto->fresh()->toArray();

        $precioCompraCambio = array_key_exists('precio_compra', $validated)
            && (float) $datosAnteriores['precio_compra'] !== (float) $datosNuevos['precio_compra'];
        $precioVentaCambio = array_key_exists('precio_venta', $validated)
            && (float) $datosAnteriores['precio_venta'] !== (float) $datosNuevos['precio_venta'];

        if ($precioCompraCambio || $precioVentaCambio) {
            LogActividad::registrarAuditoria([
                'accion' => 'cambio_precio_producto',
                'user_id' => auth()->id(),
                'modulo' => 'inventario',
                'modelo' => 'Producto',
                'modelo_id' => $producto->id,
                'referencia' => $producto->codigo,
                'datos_anteriores' => [
                    'precio_compra' => $datosAnteriores['precio_compra'],
                    'precio_venta' => $datosAnteriores['precio_venta'],
                ],
                'datos_nuevos' => [
                    'precio_compra' => $datosNuevos['precio_compra'],
                    'precio_venta' => $datosNuevos['precio_venta'],
                ],
                'observacion' => 'Actualizacion de precios del producto',
            ]);

            if ($precioVentaCambio) {
                $this->alertService->notifyStrongPriceChange(
                    $producto->fresh(),
                    (float) $datosAnteriores['precio_venta'],
                    (float) $datosNuevos['precio_venta']
                );
            }
        }

        // Registrar actividad
        LogActividad::registrarAuditoria([
            'accion' => 'actualizar_producto',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'Producto',
            'modelo_id' => $producto->id,
            'referencia' => $producto->codigo,
            'datos_anteriores' => $datosAnteriores,
            'datos_nuevos' => $datosNuevos,
        ]);

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

        LogActividad::registrarAuditoria([
            'accion' => 'eliminar_producto',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'Producto',
            'modelo_id' => $producto->id,
            'referencia' => $datosAnteriores['codigo'] ?? null,
            'datos_anteriores' => $datosAnteriores,
            'observacion' => 'Accion sensible: eliminacion de producto',
        ]);

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
            'notas' => 'nullable|string',
        ]);

        $stockAnterior = $producto->stock;
        $warnings = [];
        $precioAnterior = (float) $producto->precio_compra;
        $precioNuevoSolicitado = isset($validated['precio_compra']) ? (float) $validated['precio_compra'] : null;

        if ($precioNuevoSolicitado !== null && $precioAnterior > 0) {
            $variacion = (($precioNuevoSolicitado - $precioAnterior) / $precioAnterior) * 100;
            if (abs($variacion) >= 20) {
                $warnings[] = sprintf(
                    'El precio de compra cambio %.1f%% respecto al ultimo registrado.',
                    $variacion
                );
            }
        }

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
                'motivo' => 'Entrada manual',
                'recibido_por' => auth()->user()?->nombre ?? 'Sistema',
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
        LogActividad::registrarAuditoria([
            'accion' => 'entrada_stock',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'Producto',
            'modelo_id' => $producto->id,
            'referencia' => $producto->codigo,
            'datos_anteriores' => ['stock' => $stockAnterior],
            'datos_nuevos' => ['stock' => $producto->stock, 'cantidad_entrada' => $validated['cantidad']],
            'observacion' => $validated['notas'] ?? 'Entrada manual de inventario',
        ]);

        $productoActualizado = $producto->fresh();
        $this->alertService->notifyStockState($productoActualizado, 'entrada_manual');
        if ($productoActualizado->estado_stock === 'critico') {
            $warnings[] = "El producto {$productoActualizado->codigo} quedo en stock critico.";
        } elseif ($productoActualizado->estado_stock === 'bajo') {
            $warnings[] = "El producto {$productoActualizado->codigo} quedo con stock bajo.";
        }

        return response()->json([
            'success' => true,
            'message' => 'Entrada de stock registrada exitosamente',
            'data' => $productoActualizado,
            'warnings' => $warnings,
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
        $warnings = [];

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
                'recibido_por' => auth()->user()?->nombre ?? 'Sistema',
                'notas' => $validated['notas'] ?? null,
            ]);
        });

        // Verificar si el estado cambiÃ³ a crÃ­tico
        $producto->refresh();
        if ($producto->estado_stock === 'critico' && $estadoAnterior !== 'critico') {
            $warnings[] = "El producto {$producto->codigo} quedo en stock critico.";
        } elseif ($producto->estado_stock === 'bajo' && $estadoAnterior !== 'bajo') {
            $warnings[] = "El producto {$producto->codigo} quedo con stock bajo.";
        }
        $this->alertService->notifyStockState($producto, 'salida_manual');

        $cantidadSalida = (int) $validated['cantidad'];
        if ($cantidadSalida >= 30) {
            $this->alertService->notifySuspiciousMovement(
                "Salida inusual de {$cantidadSalida} unidades en {$producto->codigo}",
                [
                    'producto_id' => $producto->id,
                    'codigo' => $producto->codigo,
                    'cantidad' => $cantidadSalida,
                    'motivo' => $validated['motivo'],
                ],
                $cantidadSalida >= 60 ? 'alto' : 'medio'
            );
        }

        // Registrar actividad
        LogActividad::registrarAuditoria([
            'accion' => 'salida_stock',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'Producto',
            'modelo_id' => $producto->id,
            'referencia' => $producto->codigo,
            'datos_anteriores' => ['stock' => $stockAnterior],
            'datos_nuevos' => [
                'stock' => $producto->stock,
                'cantidad_salida' => $validated['cantidad'],
                'motivo' => $validated['motivo'],
            ],
            'observacion' => $validated['notas'] ?? $validated['motivo'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Salida de stock registrada exitosamente',
            'data' => $producto->fresh(),
            'warnings' => $warnings,
        ]);
    }

    /**
     * Registrar entrada de stock para multiples productos en un solo movimiento (factura de compra).
     */
    public function entradaStockLote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'factura_compra' => 'required|string|max:100',
            'proveedor_id' => 'nullable|exists:proveedores,id',
            'fecha_factura' => 'nullable|date',
            'observacion' => 'nullable|string|max:1500',
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_compra' => 'nullable|numeric|min:0',
            'productos.*.lote' => 'nullable|string|max:50',
            'productos.*.notas' => 'nullable|string|max:1500',
        ]);

        $productosIds = collect($validated['productos'])->pluck('producto_id')->unique()->values();
        $productos = Producto::whereIn('id', $productosIds)->get()->keyBy('id');
        $usuarioNombre = auth()->user()?->nombre ?? 'Sistema';

        $resultados = [];
        $totalItems = 0;
        $montoTotalCompra = 0;
        $warnings = [];

        DB::transaction(function () use ($validated, $productos, $usuarioNombre, &$resultados, &$totalItems, &$montoTotalCompra, &$warnings) {
            foreach ($validated['productos'] as $item) {
                /** @var Producto $producto */
                $producto = $productos[$item['producto_id']];
                $stockAnterior = $producto->stock;
                $cantidad = (int) $item['cantidad'];
                $precioAnterior = (float) $producto->precio_compra;

                $producto->stock += $cantidad;
                if (array_key_exists('precio_compra', $item) && $item['precio_compra'] !== null) {
                    $producto->precio_compra = $item['precio_compra'];
                }
                if (!empty($item['lote'])) {
                    $producto->lote = $item['lote'];
                }
                $producto->save();

                $precioCompra = $item['precio_compra'] ?? $producto->precio_compra;
                $montoItem = (float) $precioCompra * $cantidad;
                $montoTotalCompra += $montoItem;
                $variacionPrecio = $precioAnterior > 0
                    ? ((($precioCompra - $precioAnterior) / $precioAnterior) * 100)
                    : 0;

                if ($precioAnterior > 0 && abs($variacionPrecio) >= 20) {
                    $warnings[] = sprintf(
                        '[%s] Precio de compra con variacion %.1f%%.',
                        $producto->codigo,
                        $variacionPrecio
                    );
                }
                if ($producto->estado_stock === 'critico') {
                    $warnings[] = "[{$producto->codigo}] quedo en stock critico.";
                } elseif ($producto->estado_stock === 'bajo') {
                    $warnings[] = "[{$producto->codigo}] quedo con stock bajo.";
                }
                $this->alertService->notifyStockState($producto, 'entrada_lote');

                MovimientoInventario::create([
                    'producto_id' => $producto->id,
                    'user_id' => auth()->id(),
                    'proveedor_id' => $validated['proveedor_id'] ?? $producto->proveedor_id,
                    'tipo' => 'entrada',
                    'cantidad' => $cantidad,
                    'stock_anterior' => $stockAnterior,
                    'stock_nuevo' => $producto->stock,
                    'precio_compra' => $precioCompra,
                    'lote' => $item['lote'] ?? null,
                    'motivo' => 'Entrada por factura de compra',
                    'recibido_por' => $usuarioNombre,
                    'notas' => $this->buildNotaLote(
                        $validated['factura_compra'],
                        $validated['fecha_factura'] ?? null,
                        $item['notas'] ?? null,
                        $validated['observacion'] ?? null
                    ),
                ]);

                LogActividad::registrarAuditoria([
                    'accion' => 'entrada_stock_lote_item',
                    'user_id' => auth()->id(),
                    'modulo' => 'inventario',
                    'modelo' => 'Producto',
                    'modelo_id' => $producto->id,
                    'referencia' => $producto->codigo,
                    'datos_anteriores' => ['stock' => $stockAnterior],
                    'datos_nuevos' => ['stock' => $producto->stock, 'cantidad_entrada' => $cantidad],
                    'observacion' => "Factura {$validated['factura_compra']}",
                ]);

                $totalItems++;
                $resultados[] = [
                    'producto_id' => $producto->id,
                    'codigo' => $producto->codigo,
                    'nombre' => $producto->nombre,
                    'cantidad' => $cantidad,
                    'stock_anterior' => $stockAnterior,
                    'stock_nuevo' => $producto->stock,
                ];
            }

            if (!empty($validated['proveedor_id']) && $montoTotalCompra > 0) {
                $proveedor = Proveedor::find($validated['proveedor_id']);
                if ($proveedor) {
                    $proveedor->incrementarDeuda($montoTotalCompra);
                }
            }
        });

        LogActividad::registrarAuditoria([
            'accion' => 'entrada_stock_lote',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'MovimientoInventario',
            'modelo_id' => null,
            'referencia' => $validated['factura_compra'],
            'datos_nuevos' => [
                'factura_compra' => $validated['factura_compra'],
                'fecha_factura' => $validated['fecha_factura'] ?? null,
                'proveedor_id' => $validated['proveedor_id'] ?? null,
                'total_items' => $totalItems,
                'monto_total_compra' => round($montoTotalCompra, 2),
            ],
            'observacion' => $validated['observacion'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Entrada por lote registrada ({$totalItems} producto(s))",
            'data' => [
                'tipo_operacion' => 'entrada_lote_factura_compra',
                'factura_compra' => $validated['factura_compra'],
                'total_items' => $totalItems,
                'monto_total_compra' => round($montoTotalCompra, 2),
                'productos' => $resultados,
            ],
            'warnings' => array_values(array_unique($warnings)),
        ]);
    }

    /**
     * Registrar salida de stock para multiples productos en un solo movimiento.
     */
    public function salidaStockLote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'motivo' => 'required|string|max:255',
            'referencia_documento' => 'nullable|string|max:100',
            'observacion' => 'nullable|string|max:1500',
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.notas' => 'nullable|string|max:1500',
        ]);

        $productosIds = collect($validated['productos'])->pluck('producto_id')->unique()->values();
        $productos = Producto::whereIn('id', $productosIds)->get()->keyBy('id');
        $usuarioNombre = auth()->user()?->nombre ?? 'Sistema';

        foreach ($validated['productos'] as $item) {
            $producto = $productos[$item['producto_id']] ?? null;
            if (!$producto || $producto->stock < (int) $item['cantidad']) {
                return response()->json([
                    'success' => false,
                    'message' => "Stock insuficiente para producto ID {$item['producto_id']}",
                ], 400);
            }
        }

        $resultados = [];
        $totalItems = 0;
        $warnings = [];

        DB::transaction(function () use ($validated, $productos, $usuarioNombre, &$resultados, &$totalItems, &$warnings) {
            foreach ($validated['productos'] as $item) {
                /** @var Producto $producto */
                $producto = $productos[$item['producto_id']];
                $stockAnterior = $producto->stock;
                $cantidad = (int) $item['cantidad'];

                $producto->stock -= $cantidad;
                $producto->save();
                if ($producto->estado_stock === 'critico') {
                    $warnings[] = "[{$producto->codigo}] quedo en stock critico.";
                } elseif ($producto->estado_stock === 'bajo') {
                    $warnings[] = "[{$producto->codigo}] quedo con stock bajo.";
                }
                $this->alertService->notifyStockState($producto, 'salida_lote');
                if ($cantidad >= 30) {
                    $this->alertService->notifySuspiciousMovement(
                        "Salida por lote inusual de {$cantidad} unidades en {$producto->codigo}",
                        [
                            'producto_id' => $producto->id,
                            'codigo' => $producto->codigo,
                            'cantidad' => $cantidad,
                            'motivo' => $validated['motivo'],
                        ],
                        $cantidad >= 60 ? 'alto' : 'medio'
                    );
                }

                MovimientoInventario::create([
                    'producto_id' => $producto->id,
                    'user_id' => auth()->id(),
                    'tipo' => 'salida',
                    'cantidad' => $cantidad,
                    'stock_anterior' => $stockAnterior,
                    'stock_nuevo' => $producto->stock,
                    'motivo' => $validated['motivo'],
                    'recibido_por' => $usuarioNombre,
                    'notas' => $this->buildNotaLote(
                        $validated['referencia_documento'] ?? null,
                        null,
                        $item['notas'] ?? null,
                        $validated['observacion'] ?? null
                    ),
                ]);

                LogActividad::registrarAuditoria([
                    'accion' => 'salida_stock_lote_item',
                    'user_id' => auth()->id(),
                    'modulo' => 'inventario',
                    'modelo' => 'Producto',
                    'modelo_id' => $producto->id,
                    'referencia' => $producto->codigo,
                    'datos_anteriores' => ['stock' => $stockAnterior],
                    'datos_nuevos' => ['stock' => $producto->stock, 'cantidad_salida' => $cantidad],
                    'observacion' => $validated['motivo'],
                ]);

                $totalItems++;
                $resultados[] = [
                    'producto_id' => $producto->id,
                    'codigo' => $producto->codigo,
                    'nombre' => $producto->nombre,
                    'cantidad' => $cantidad,
                    'stock_anterior' => $stockAnterior,
                    'stock_nuevo' => $producto->stock,
                ];
            }
        });

        LogActividad::registrarAuditoria([
            'accion' => 'salida_stock_lote',
            'user_id' => auth()->id(),
            'modulo' => 'inventario',
            'modelo' => 'MovimientoInventario',
            'modelo_id' => null,
            'referencia' => $validated['referencia_documento'] ?? $validated['motivo'],
            'datos_nuevos' => [
                'motivo' => $validated['motivo'],
                'referencia_documento' => $validated['referencia_documento'] ?? null,
                'total_items' => $totalItems,
            ],
            'observacion' => $validated['observacion'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Salida por lote registrada ({$totalItems} producto(s))",
            'data' => [
                'tipo_operacion' => 'salida_lote',
                'motivo' => $validated['motivo'],
                'referencia_documento' => $validated['referencia_documento'] ?? null,
                'total_items' => $totalItems,
                'productos' => $resultados,
            ],
            'warnings' => array_values(array_unique($warnings)),
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
                            $ajusteCantidad = abs($stockInt - $stockAnterior);
                            MovimientoInventario::create([
                                'producto_id' => $existente->id,
                                'user_id' => auth()->id(),
                                'tipo' => 'ajuste',
                                'cantidad' => $ajusteCantidad,
                                'stock_anterior' => $stockAnterior,
                                'stock_nuevo' => $stockInt,
                                'motivo' => 'ImportaciÃ³n masiva de Excel',
                                'recibido_por' => auth()->user()?->nombre ?? 'Sistema',
                                'notas' => 'Ajuste automÃ¡tico por importaciÃ³n masiva',
                            ]);
                            $this->alertService->notifyLargeAdjustment(
                                $existente->fresh(),
                                $ajusteCantidad,
                                'Importacion masiva de Excel'
                            );
                        }

                        $this->alertService->notifyStockState($existente->fresh(), 'importacion_excel');
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
                    $this->alertService->notifyStockState($producto->fresh(), 'importacion_excel');
                }
            });

            LogActividad::registrarAuditoria([
                'accion' => 'importar_productos_excel',
                'user_id' => auth()->id(),
                'modulo' => 'inventario',
                'modelo' => 'Producto',
                'datos_nuevos' => [
                    'creados' => $creados,
                    'actualizados' => $actualizados,
                    'omitidos' => $omitidos,
                    'errores' => count($errores),
                ],
                'observacion' => 'Importacion masiva desde archivo Excel',
            ]);

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
            ->withMax('movimientos as ultimo_movimiento_at', 'created_at')
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


    private function buildNotaLote(?string $referencia, ?string $fecha, ?string $notaItem, ?string $notaGeneral): ?string
    {
        $partes = [];
        if (!empty($referencia)) {
            $partes[] = "Ref: {$referencia}";
        }
        if (!empty($fecha)) {
            $partes[] = "Fecha doc: {$fecha}";
        }
        if (!empty($notaGeneral)) {
            $partes[] = "General: {$notaGeneral}";
        }
        if (!empty($notaItem)) {
            $partes[] = "Item: {$notaItem}";
        }

        if (empty($partes)) {
            return null;
        }

        return implode(' | ', $partes);
    }
}



