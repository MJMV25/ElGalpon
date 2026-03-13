<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cotizacion;
use App\Models\CotizacionProducto;
use App\Models\CotizacionProveedor;
use App\Models\CotizacionRespuesta;
use App\Models\Proveedor;
use App\Models\LogActividad;
use App\Models\Notificacion;
use App\Models\User;
use App\Mail\CotizacionSolicitudMail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class CotizacionController extends Controller
{
    /**
     * Listar todas las cotizaciones
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cotizacion::with(['user', 'productos', 'proveedores.proveedor']);

        // Filtros
        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha', '<=', $request->fecha_hasta);
        }

        if ($request->has('buscar')) {
            $termino = $request->buscar;
            $query->where(function ($q) use ($termino) {
                $q->where('numero', 'like', "%{$termino}%")
                  ->orWhere('titulo', 'like', "%{$termino}%");
            });
        }

        $cotizaciones = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $cotizaciones,
        ]);
    }

    /**
     * Crear una nueva cotización
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'fecha' => 'required|date',
            'fecha_limite' => 'required|date|after_or_equal:fecha',
            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'nullable|exists:productos,id',
            'productos.*.nombre_producto' => 'required|string|max:255',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.especificaciones' => 'nullable|string',
            'proveedores' => 'required|array|min:1',
            'proveedores.*' => 'exists:proveedores,id',
        ]);

        $cotizacion = DB::transaction(function () use ($validated) {
            // Crear cotización
            $cotizacion = Cotizacion::create([
                'user_id' => auth()->id(),
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'fecha' => $validated['fecha'],
                'fecha_limite' => $validated['fecha_limite'],
                'estado' => 'borrador',
            ]);

            // Agregar productos
            foreach ($validated['productos'] as $producto) {
                $cotizacion->productos()->create([
                    'producto_id' => $producto['producto_id'] ?? null,
                    'nombre_producto' => $producto['nombre_producto'],
                    'cantidad' => $producto['cantidad'],
                    'especificaciones' => $producto['especificaciones'] ?? null,
                ]);
            }

            // Agregar proveedores
            foreach ($validated['proveedores'] as $proveedorId) {
                $cotizacion->proveedores()->create([
                    'proveedor_id' => $proveedorId,
                    'estado' => 'pendiente',
                ]);
            }

            return $cotizacion;
        });

        LogActividad::registrarAuditoria([
            'accion' => 'crear_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'datos_nuevos' => [
                'titulo' => $cotizacion->titulo,
                'fecha_limite' => $cotizacion->fecha_limite,
            ],
            'observacion' => 'Creacion de cotizacion',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cotización creada exitosamente',
            'data' => $cotizacion->load(['productos', 'proveedores.proveedor']),
        ], 201);
    }

    /**
     * Mostrar una cotización específica
     */
    public function show(Cotizacion $cotizacion): JsonResponse
    {
        $cotizacion->load([
            'user',
            'productos',
            'proveedores.proveedor',
            'proveedores.respuestas.cotizacionProducto',
        ]);

        // Verificar si la fecha límite ya pasó
        $fechaLimitePasada = $cotizacion->fecha_limite < now();

        // Formatear información de proveedores con estado real
        $proveedoresFormateados = $cotizacion->proveedores->map(function ($cp) use ($fechaLimitePasada) {
            $proveedor = $cp->proveedor;

            // Calcular el total cotizado por este proveedor
            $totalCotizado = 0;
            $productosDetalle = [];

            if ($cp->respuestas->count() > 0) {
                foreach ($cp->respuestas as $respuesta) {
                    $producto = $respuesta->cotizacionProducto;
                    $cantidad = $respuesta->es_producto_extra ? ($respuesta->cantidad_disponible ?? 1) : $producto->cantidad;
                    $subtotal = $respuesta->precio_unitario * $cantidad;
                    $totalCotizado += $subtotal;

                    $productosDetalle[] = [
                        'cotizacion_producto_id' => $producto?->id,
                        'nombre_producto' => $respuesta->es_producto_extra
                            ? $respuesta->nombre_producto_extra
                            : $producto->nombre_producto,
                        'cantidad' => $cantidad,
                        'unidad' => $producto?->unidad ?? 'unidad',
                        'precio_unitario' => (float) $respuesta->precio_unitario,
                        'subtotal' => (float) $subtotal,
                        'disponibilidad' => $respuesta->cantidad_disponible,
                        'tiempo_entrega' => $respuesta->tiempo_entrega_dias,
                        'observaciones' => $respuesta->notas,
                        'es_producto_extra' => (bool) $respuesta->es_producto_extra,
                    ];
                }
            }

            // Determinar el estado visual
            $estadoReal = $cp->estado;
            if ($estadoReal === 'pendiente' && $fechaLimitePasada) {
                $estadoReal = 'sin_respuesta';
            }

            return [
                'id' => $cp->id,
                'proveedor_id' => $proveedor->id,
                'proveedor_nombre' => $proveedor->nombre_empresa,
                'proveedor_email' => $proveedor->email_comercial,
                'proveedor_telefono' => $proveedor->telefono_contacto,
                'proveedor_calificacion' => $proveedor->calificacion,
                'estado' => $estadoReal, // 'pendiente', 'enviada', 'respondida', 'sin_respuesta'
                'fecha_envio' => $cp->fecha_envio?->format('Y-m-d H:i:s'),
                'fecha_respuesta' => $cp->fecha_respuesta?->format('Y-m-d H:i:s'),
                'total_cotizado' => (float) $totalCotizado,
                'productos_detalle' => $productosDetalle,
                'observaciones' => $cp->notas,
                'ha_respondido' => $cp->estado === 'respondida',
            ];
        });

        // Contar respuestas
        $totalProveedores = $cotizacion->proveedores->count();
        $proveedoresRespondidos = $cotizacion->proveedores->where('estado', 'respondida')->count();

        $data = [
            'id' => $cotizacion->id,
            'numero' => $cotizacion->numero,
            'titulo' => $cotizacion->titulo,
            'descripcion' => $cotizacion->descripcion,
            'fecha' => $cotizacion->fecha->format('Y-m-d'),
            'fecha_limite' => $cotizacion->fecha_limite->format('Y-m-d'),
            'fecha_limite_pasada' => $fechaLimitePasada,
            'estado' => $cotizacion->estado,
            'user_id' => $cotizacion->user_id,
            'user_nombre' => $cotizacion->user->nombre,
            'created_at' => $cotizacion->created_at->format('Y-m-d H:i:s'),
            'productos' => $cotizacion->productos->map(function ($p) {
                return [
                    'id' => $p->id,
                    'nombre' => $p->nombre_producto,
                    'cantidad' => $p->cantidad,
                    'unidad' => $p->unidad,
                    'especificaciones' => $p->especificaciones,
                ];
            }),
            'proveedores' => $proveedoresFormateados,
            'resumen' => [
                'total_proveedores' => $totalProveedores,
                'proveedores_respondidos' => $proveedoresRespondidos,
                'proveedores_pendientes' => $totalProveedores - $proveedoresRespondidos,
                'progreso' => $totalProveedores > 0 ? round(($proveedoresRespondidos / $totalProveedores) * 100) : 0,
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Actualizar una cotización
     */
    public function update(Request $request, Cotizacion $cotizacion): JsonResponse
    {
        // Solo permitir editar cotizaciones en borrador
        if ($cotizacion->estado !== 'borrador') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden editar cotizaciones en estado borrador',
            ], 400);
        }

        $validated = $request->validate([
            'titulo' => 'sometimes|required|string|max:255',
            'descripcion' => 'nullable|string',
            'fecha' => 'sometimes|required|date',
            'fecha_limite' => 'sometimes|required|date|after_or_equal:fecha',
        ]);

        $datosAnteriores = $cotizacion->toArray();
        $cotizacion->update($validated);

        LogActividad::registrarAuditoria([
            'accion' => 'actualizar_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'datos_anteriores' => $datosAnteriores,
            'datos_nuevos' => $cotizacion->fresh()->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cotización actualizada exitosamente',
            'data' => $cotizacion->fresh()->load(['productos', 'proveedores.proveedor']),
        ]);
    }

    /**
     * Enviar cotización a proveedores
     */
    public function enviar(Cotizacion $cotizacion): JsonResponse
    {
        if ($cotizacion->estado !== 'borrador') {
            return response()->json([
                'success' => false,
                'message' => 'La cotización ya ha sido enviada',
            ], 400);
        }

        $productosData = $cotizacion->productos->map(function ($p) {
            return [
                'nombre' => $p->nombre_producto,
                'cantidad' => $p->cantidad,
                'especificaciones' => $p->especificaciones,
            ];
        })->toArray();

        $errores = [];
        $enviados = 0;

        foreach ($cotizacion->proveedores as $cotizacionProveedor) {
            $proveedor = $cotizacionProveedor->proveedor;

            if (!$proveedor->email) {
                $errores[] = "El proveedor {$proveedor->nombre} no tiene email";
                continue;
            }

            try {
                // Generar token único para este proveedor
                $token = $cotizacionProveedor->generarToken();
                $urlRespuesta = $cotizacionProveedor->getUrlRespuestaPublica();

                // Usar queue() en lugar de send() para no bloquear la respuesta
                Mail::to($proveedor->email)->queue(new CotizacionSolicitudMail(
                    $proveedor->nombre,
                    $cotizacion->numero,
                    $productosData,
                    $cotizacion->fecha_limite->format('d/m/Y'),
                    $cotizacion->descripcion,
                    $urlRespuesta // Agregar URL pública
                ));

                $cotizacionProveedor->marcarComoEnviada();
                $enviados++;
            } catch (\Exception $e) {
                \Log::warning("Error enviando cotización a {$proveedor->nombre}: " . $e->getMessage());
                $errores[] = "Error enviando a {$proveedor->nombre}: " . $e->getMessage();
            }
        }

        // Actualizar estado de la cotización
        $cotizacion->update(['estado' => 'enviada']);

        // Registrar actividad
        LogActividad::registrarAuditoria([
            'accion' => 'enviar_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'datos_nuevos' => ['proveedores_enviados' => $enviados, 'errores' => $errores],
            'observacion' => "Cotizacion enviada a {$enviados} proveedor(es)",
        ]);

        $mensaje = "Cotización enviada a {$enviados} proveedor(es)";
        if (count($errores) > 0) {
            $mensaje .= ". Errores: " . count($errores);
        }

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => [
                'enviados' => $enviados,
                'errores' => $errores,
            ],
        ]);
    }

    /**
     * Registrar respuesta de proveedor
     */
    public function registrarRespuesta(Request $request, CotizacionProveedor $cotizacionProveedor): JsonResponse
    {
        $validated = $request->validate([
            'respuestas' => 'required|array|min:1',
            'respuestas.*.cotizacion_producto_id' => 'required|exists:cotizacion_productos,id',
            'respuestas.*.precio_unitario' => 'required|numeric|min:0',
            'respuestas.*.cantidad_disponible' => 'nullable|integer|min:0',
            'respuestas.*.tiempo_entrega_dias' => 'nullable|integer|min:0',
            'respuestas.*.notas' => 'nullable|string',
            'notas_generales' => 'nullable|string',
        ]);

        DB::transaction(function () use ($cotizacionProveedor, $validated) {
            // Eliminar respuestas anteriores si existen
            $cotizacionProveedor->respuestas()->delete();

            // Crear nuevas respuestas
            foreach ($validated['respuestas'] as $respuesta) {
                CotizacionRespuesta::create([
                    'cotizacion_proveedor_id' => $cotizacionProveedor->id,
                    'cotizacion_producto_id' => $respuesta['cotizacion_producto_id'],
                    'precio_unitario' => $respuesta['precio_unitario'],
                    'cantidad_disponible' => $respuesta['cantidad_disponible'] ?? null,
                    'tiempo_entrega_dias' => $respuesta['tiempo_entrega_dias'] ?? null,
                    'notas' => $respuesta['notas'] ?? null,
                ]);
            }

            // Actualizar estado y notas
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

        foreach ($admins as $admin) {
            Notificacion::create([
                'user_id' => $admin->id,
                'tipo' => 'cotizacion_respuesta',
                'titulo' => 'Respuesta de cotización recibida',
                'mensaje' => "El proveedor {$proveedor->nombre} ha respondido a la cotización {$cotizacion->numero}",
                'enlace' => "/cotizaciones/{$cotizacion->id}",
                'datos' => [
                    'cotizacion_id' => $cotizacion->id,
                    'proveedor_id' => $proveedor->id,
                ],
            ]);
        }

        LogActividad::registrarAuditoria([
            'accion' => 'registrar_respuesta_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'datos_nuevos' => [
                'cotizacion_proveedor_id' => $cotizacionProveedor->id,
                'proveedor_id' => $proveedor->id,
                'total_respuestas' => count($validated['respuestas']),
            ],
            'observacion' => $validated['notas_generales'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Respuesta registrada exitosamente',
            'data' => $cotizacionProveedor->fresh()->load('respuestas'),
        ]);
    }

    /**
     * Comparar respuestas de proveedores
     */
    public function compararRespuestas(Cotizacion $cotizacion): JsonResponse
    {
        $cotizacion->load([
            'productos.respuestas.cotizacionProveedor.proveedor',
        ]);

        $comparacion = [];

        foreach ($cotizacion->productos as $producto) {
            $respuestasProducto = [];
            $mejorPrecio = null;
            $mejorProveedor = null;

            foreach ($producto->respuestas as $respuesta) {
                $proveedor = $respuesta->cotizacionProveedor->proveedor;

                $respuestasProducto[] = [
                    'proveedor_id' => $proveedor->id,
                    'proveedor_nombre' => $proveedor->nombre_empresa,
                    'precio_unitario' => $respuesta->precio_unitario,
                    'cantidad_disponible' => $respuesta->cantidad_disponible,
                    'tiempo_entrega_dias' => $respuesta->tiempo_entrega_dias,
                    'total' => $respuesta->precio_unitario * $producto->cantidad,
                    'calificacion_proveedor' => $proveedor->calificacion,
                ];

                // Determinar mejor opción (menor precio)
                if ($mejorPrecio === null || $respuesta->precio_unitario < $mejorPrecio) {
                    $mejorPrecio = $respuesta->precio_unitario;
                    $mejorProveedor = $proveedor->id;
                }
            }

            $comparacion[] = [
                'producto_id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'cantidad_solicitada' => $producto->cantidad,
                'respuestas' => $respuestasProducto,
                'mejor_precio' => $mejorPrecio,
                'mejor_proveedor_id' => $mejorProveedor,
            ];
        }

        // Calcular resumen por proveedor
        $resumenProveedores = [];
        foreach ($cotizacion->proveedores()->with('proveedor', 'respuestas')->get() as $cp) {
            $total = $cp->respuestas->sum(function ($r) {
                $producto = CotizacionProducto::find($r->cotizacion_producto_id);
                return $r->precio_unitario * ($producto ? $producto->cantidad : 1);
            });

            $resumenProveedores[] = [
                'proveedor_id' => $cp->proveedor->id,
                'proveedor_nombre' => $cp->proveedor->nombre_empresa,
                'estado' => $cp->estado,
                'total_cotizado' => $total,
                'calificacion' => $cp->proveedor->calificacion,
                'tiempo_promedio_entrega' => $cp->respuestas->avg('tiempo_entrega_dias'),
            ];
        }

        // Ordenar por total
        usort($resumenProveedores, fn($a, $b) => $a['total_cotizado'] <=> $b['total_cotizado']);

        return response()->json([
            'success' => true,
            'data' => [
                'cotizacion' => [
                    'numero' => $cotizacion->numero,
                    'titulo' => $cotizacion->titulo,
                    'fecha_limite' => $cotizacion->fecha_limite,
                ],
                'comparacion_productos' => $comparacion,
                'resumen_proveedores' => $resumenProveedores,
                'recomendacion' => $resumenProveedores[0] ?? null,
            ],
        ]);
    }

    /**
     * Completar/Cerrar cotización
     */
    public function completar(Cotizacion $cotizacion): JsonResponse
    {
        if (!in_array($cotizacion->estado, ['enviada', 'en_proceso'])) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden completar cotizaciones enviadas o en proceso',
            ], 400);
        }

        $cotizacion->update(['estado' => 'completada']);

        LogActividad::registrarAuditoria([
            'accion' => 'completar_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'observacion' => 'Accion sensible de cierre de cotizacion',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cotización completada exitosamente',
            'data' => $cotizacion->fresh(),
        ]);
    }

    /**
     * Cancelar cotización
     */
    public function cancelar(Cotizacion $cotizacion): JsonResponse
    {
        if ($cotizacion->estado === 'completada') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede cancelar una cotización completada',
            ], 400);
        }

        $cotizacion->update(['estado' => 'cancelada']);

        LogActividad::registrarAuditoria([
            'accion' => 'cancelar_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'observacion' => 'Accion sensible de anulacion',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cotización cancelada exitosamente',
            'data' => $cotizacion->fresh(),
        ]);
    }

    /**
     * Eliminar cotización
     */
    public function destroy(Cotizacion $cotizacion): JsonResponse
    {
        if ($cotizacion->estado !== 'borrador') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden eliminar cotizaciones en borrador',
            ], 400);
        }

        $datosAnteriores = $cotizacion->toArray();
        $cotizacion->delete();

        LogActividad::registrarAuditoria([
            'accion' => 'eliminar_cotizacion',
            'user_id' => auth()->id(),
            'modulo' => 'compras',
            'modelo' => 'Cotizacion',
            'modelo_id' => $cotizacion->id,
            'referencia' => $cotizacion->numero,
            'datos_anteriores' => $datosAnteriores,
            'observacion' => 'Accion sensible de eliminacion',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cotización eliminada exitosamente',
        ]);
    }
}
