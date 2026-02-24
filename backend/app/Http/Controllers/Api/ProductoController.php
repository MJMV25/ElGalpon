<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
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
     * Mostrar un producto específico
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
                'notas' => $validated['notas'] ?? null,
            ]);
        });

        // Verificar si el estado cambió a crítico
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
     * Obtener productos con stock bajo o crítico
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
     * Notificar stock crítico a administradores
     */
    private function notificarStockCritico(Producto $producto): void
    {
        // Crear notificación para todos los admins
        $admins = User::where('rol', 'admin')->where('activo', true)->get();

        foreach ($admins as $admin) {
            Notificacion::create([
                'user_id' => $admin->id,
                'tipo' => 'stock_critico',
                'titulo' => 'Stock Crítico: ' . $producto->nombre,
                'mensaje' => "El producto {$producto->codigo} - {$producto->nombre} ha llegado a stock crítico. Stock actual: {$producto->stock}",
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
            \Log::error('Error enviando email de stock crítico: ' . $e->getMessage());
        }
    }
}

