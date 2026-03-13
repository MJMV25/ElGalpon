<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\MovimientoInventario;
use App\Models\Cotizacion;
use App\Models\Notificacion;
use App\Models\LogActividad;
use App\Models\User;
use App\Services\AlertService;
use App\Services\ReportExportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReporteController extends Controller
{
    /**
     * Dashboard - Resumen general
     */
    public function dashboard(): JsonResponse
    {
        // Valor del inventario
        $productos = Producto::activos()->get();
        $valorInventario = $productos->sum(fn($p) => $p->stock * $p->precio_compra);
        $valorVenta = $productos->sum(fn($p) => $p->stock * $p->precio_venta);
        $gananciaPotencial = $valorVenta - $valorInventario;
        $margenPromedio = $valorInventario > 0 ? ($gananciaPotencial / $valorInventario) * 100 : 0;

        // Stock
        $stockCritico = Producto::activos()->where('estado_stock', 'critico')->count();
        $stockBajo = Producto::activos()->where('estado_stock', 'bajo')->count();
        $totalProductos = $productos->count();

        // Proveedores
        $totalProveedores = Proveedor::activos()->count();
        $proveedoresConDeuda = Proveedor::activos()->conDeuda()->count();
        $totalDeuda = Proveedor::activos()->sum('deuda');

        // Movimientos del día
        $movimientosHoy = MovimientoInventario::hoy()->count();
        $entradasHoy = MovimientoInventario::hoy()->entradas()->sum('cantidad');
        $salidasHoy = MovimientoInventario::hoy()->salidas()->sum('cantidad');

        // Cotizaciones activas
        $cotizacionesActivas = Cotizacion::activas()->count();
        $cotizacionesPendientes = Cotizacion::where('estado', 'enviada')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'inventario' => [
                    'total_productos' => $totalProductos,
                    'valor_inventario' => round($valorInventario, 2),
                    'valor_potencial_venta' => round($valorVenta, 2),
                    'ganancia_potencial' => round($gananciaPotencial, 2),
                    'margen_promedio' => round($margenPromedio, 2),
                    'stock_critico' => $stockCritico,
                    'stock_bajo' => $stockBajo,
                ],
                'proveedores' => [
                    'total' => $totalProveedores,
                    'con_deuda' => $proveedoresConDeuda,
                    'total_deuda' => round($totalDeuda, 2),
                ],
                'movimientos_hoy' => [
                    'total' => $movimientosHoy,
                    'entradas' => $entradasHoy,
                    'salidas' => $salidasHoy,
                ],
                'cotizaciones' => [
                    'activas' => $cotizacionesActivas,
                    'pendientes_respuesta' => $cotizacionesPendientes,
                ],
            ],
        ]);
    }

    /**
     * Panel ejecutivo para administracion remota del negocio.
     */
    public function panelDueno(Request $request, AlertService $alertService): JsonResponse
    {
        $limiteTop = (int) $request->get('limite_top', 8);
        $limitePocoMovimiento = (int) $request->get('limite_poco_movimiento', 8);
        $limiteMovimientos = (int) $request->get('limite_movimientos', 12);
        $limiteAlertas = (int) $request->get('limite_alertas', 10);
        $limiteSospechosos = (int) $request->get('limite_sospechosos', 10);

        $limiteTop = max(3, min($limiteTop, 20));
        $limitePocoMovimiento = max(3, min($limitePocoMovimiento, 20));
        $limiteMovimientos = max(5, min($limiteMovimientos, 30));
        $limiteAlertas = max(5, min($limiteAlertas, 30));
        $limiteSospechosos = max(5, min($limiteSospechosos, 30));

        $cacheKey = sprintf(
            'panel_dueno:%d:%d:%d:%d:%d:user:%d',
            $limiteTop,
            $limitePocoMovimiento,
            $limiteMovimientos,
            $limiteAlertas,
            $limiteSospechosos,
            (int) auth()->id()
        );

        $cached = Cache::get($cacheKey);
        $this->triggerAlertMaintenance($alertService);
        if ($cached) {
            return response()->json([
                'success' => true,
                'data' => $cached,
            ]);
        }

        $ahora = now();
        $inicioDia = $ahora->copy()->startOfDay();
        $inicioMes = $ahora->copy()->startOfMonth();
        $inicio7Dias = $ahora->copy()->subDays(7);
        $inicio30Dias = $ahora->copy()->subDays(30);
        $inicio45Dias = $ahora->copy()->subDays(45);

        $ventasResumen = DB::table('movimientos_inventario as m')
            ->join('productos as p', 'm.producto_id', '=', 'p.id')
            ->where('m.tipo', 'salida')
            ->where('m.created_at', '>=', $inicioMes)
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN m.created_at >= ? THEN m.cantidad * p.precio_venta ELSE 0 END), 0) as ventas_dia',
                [$inicioDia]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN m.created_at >= ? THEN m.cantidad * COALESCE(m.precio_compra, p.precio_compra) ELSE 0 END), 0) as costo_dia',
                [$inicioDia]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN m.created_at >= ? THEN m.cantidad ELSE 0 END), 0) as unidades_dia',
                [$inicioDia]
            )
            ->selectRaw('COALESCE(SUM(m.cantidad * p.precio_venta), 0) as ventas_mes')
            ->selectRaw('COALESCE(SUM(m.cantidad * COALESCE(m.precio_compra, p.precio_compra)), 0) as costo_mes')
            ->selectRaw('COALESCE(SUM(m.cantidad), 0) as unidades_mes')
            ->first();

        $utilidadEstimada = (float) $ventasResumen->ventas_mes - (float) $ventasResumen->costo_mes;
        $margenEstimado = (float) $ventasResumen->ventas_mes > 0
            ? ($utilidadEstimada / (float) $ventasResumen->ventas_mes) * 100
            : 0;

        $stockBajo = Producto::activos()->whereIn('estado_stock', ['bajo', 'critico'])->count();
        $stockCritico = Producto::activos()->where('estado_stock', 'critico')->count();
        $stockAgotado = Producto::activos()->where('stock', '<=', 0)->count();
        $valorInventario = Producto::activos()->where('stock', '>', 0)->sum(DB::raw('stock * precio_compra'));

        $productosMasVendidos = DB::table('movimientos_inventario as m')
            ->join('productos as p', 'm.producto_id', '=', 'p.id')
            ->where('m.tipo', 'salida')
            ->where('m.created_at', '>=', $inicio30Dias)
            ->where('p.activo', true)
            ->select(
                'p.id',
                'p.codigo',
                'p.nombre'
            )
            ->selectRaw('COALESCE(SUM(m.cantidad), 0) as unidades_vendidas')
            ->selectRaw('COALESCE(SUM(m.cantidad * p.precio_venta), 0) as valor_estimado')
            ->selectRaw('COALESCE(SUM(CASE WHEN m.created_at >= ? THEN m.cantidad ELSE 0 END), 0) as unidades_7_dias', [$inicio7Dias])
            ->selectRaw('COALESCE(SUM(CASE WHEN m.created_at >= ? THEN m.cantidad * p.precio_venta ELSE 0 END), 0) as valor_7_dias', [$inicio7Dias])
            ->groupBy('p.id', 'p.codigo', 'p.nombre')
            ->orderByDesc('unidades_vendidas')
            ->limit($limiteTop)
            ->get();

        $salidas45Sub = DB::table('movimientos_inventario as m45')
            ->select('m45.producto_id')
            ->selectRaw('COALESCE(SUM(m45.cantidad), 0) as salidas_45_dias')
            ->where('m45.tipo', 'salida')
            ->where('m45.created_at', '>=', $inicio45Dias)
            ->groupBy('m45.producto_id');

        $ultimaSalidaSub = DB::table('movimientos_inventario as mmax')
            ->select('mmax.producto_id')
            ->selectRaw('MAX(mmax.created_at) as ultima_salida')
            ->where('mmax.tipo', 'salida')
            ->groupBy('mmax.producto_id');

        $productosPocoMovimiento = DB::table('productos as p')
            ->leftJoinSub($salidas45Sub, 'sal45', fn($join) => $join->on('p.id', '=', 'sal45.producto_id'))
            ->leftJoinSub($ultimaSalidaSub, 'last_out', fn($join) => $join->on('p.id', '=', 'last_out.producto_id'))
            ->leftJoin('categorias as c', 'p.categoria_id', '=', 'c.id')
            ->where('p.activo', true)
            ->select(
                'p.id',
                'p.codigo',
                'p.nombre',
                'p.stock',
                'p.precio_compra',
                'p.created_at',
                'c.nombre as categoria_nombre',
                DB::raw('COALESCE(sal45.salidas_45_dias, 0) as salidas_45_dias'),
                'last_out.ultima_salida'
            )
            ->orderBy('salidas_45_dias')
            ->orderByDesc('p.stock')
            ->limit($limitePocoMovimiento)
            ->get()
            ->map(function ($item) use ($ahora) {
                $ultimaSalida = $item->ultima_salida ? \Illuminate\Support\Carbon::parse($item->ultima_salida) : null;
                $diasSinMovimiento = $ultimaSalida
                    ? $ultimaSalida->diffInDays($ahora)
                    : \Illuminate\Support\Carbon::parse($item->created_at)->diffInDays($ahora);

                return [
                    'id' => $item->id,
                    'codigo' => $item->codigo,
                    'nombre' => $item->nombre,
                    'stock_actual' => (int) $item->stock,
                    'salidas_45_dias' => (int) $item->salidas_45_dias,
                    'dias_sin_movimiento' => (int) $diasSinMovimiento,
                    'valor_inmovilizado' => round(((float) $item->stock) * ((float) $item->precio_compra), 2),
                    'categoria' => $item->categoria_nombre,
                    'estado_movimiento' => (int) $item->salidas_45_dias === 0 ? 'sin_movimiento' : 'poco_movimiento',
                    'ultima_salida' => $item->ultima_salida,
                    'producto_url' => '/productos',
                ];
            });

        $movimientosImportantes = MovimientoInventario::with(['producto:id,nombre,codigo', 'user:id,nombre'])
            ->where(function ($query) {
                $query->where('tipo', 'ajuste')
                    ->orWhere('cantidad', '>=', 10);
            })
            ->orderBy('created_at', 'desc')
            ->limit($limiteMovimientos)
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'tipo' => $m->tipo,
                    'cantidad' => (int) $m->cantidad,
                    'motivo' => $m->motivo,
                    'notas' => $m->notas,
                    'created_at' => $m->created_at,
                    'producto' => $m->producto ? [
                        'id' => $m->producto->id,
                        'codigo' => $m->producto->codigo,
                        'nombre' => $m->producto->nombre,
                    ] : null,
                    'usuario' => $m->user ? [
                        'id' => $m->user->id,
                        'nombre' => $m->user->nombre,
                    ] : null,
                ];
            });

        $alertasStock = Producto::activos()
            ->where(function ($query) {
                $query->where('stock', '<=', 0)
                    ->orWhereIn('estado_stock', ['bajo', 'critico']);
            })
            ->orderBy('stock')
            ->limit($limiteAlertas)
            ->get(['id', 'codigo', 'nombre', 'stock', 'stock_minimo', 'estado_stock'])
            ->map(function ($p) use ($ahora) {
                return [
                    'id' => "stock-{$p->id}",
                    'tipo' => $p->stock <= 0 ? 'agotado' : 'stock_bajo',
                    'titulo' => $p->nombre,
                    'mensaje' => "Stock actual: {$p->stock} / minimo: {$p->stock_minimo}",
                    'created_at' => $ahora->toDateTimeString(),
                    'destino' => $p->stock <= 0 ? '/stock-bajo' : '/productos',
                    'modulo' => $p->stock <= 0 ? 'stock_bajo' : 'productos',
                    'meta' => [
                        'producto_id' => $p->id,
                        'codigo' => $p->codigo,
                        'stock' => (int) $p->stock,
                        'stock_minimo' => (int) $p->stock_minimo,
                        'estado_stock' => $p->estado_stock,
                    ],
                ];
            });

        $alertasNotificacion = Notificacion::where(function ($query) {
            $query->whereNull('user_id')
                ->orWhere('user_id', auth()->id());
        })
            ->noLeidas()
            ->orderBy('created_at', 'desc')
            ->limit($limiteAlertas)
            ->get(['id', 'tipo', 'titulo', 'mensaje', 'created_at'])
            ->map(function ($n) {
                return [
                    'id' => "notif-{$n->id}",
                    'tipo' => $n->tipo,
                    'titulo' => $n->titulo,
                    'mensaje' => $n->mensaje,
                    'created_at' => $n->created_at,
                    'destino' => $this->resolveNotificationTarget($n->tipo),
                    'modulo' => $this->resolveNotificationModule($n->tipo),
                ];
            });

        $alertasActivas = $alertasStock
            ->concat($alertasNotificacion)
            ->sortByDesc(function ($item) {
                if (!isset($item['created_at']) || !$item['created_at']) {
                    return 0;
                }

                return strtotime((string) $item['created_at']) ?: 0;
            })
            ->take($limiteAlertas)
            ->values();

        $alertasResumen = [
            'total' => $alertasActivas->count(),
            'criticas' => $alertasStock->where('tipo', 'agotado')->count(),
            'stock_bajo' => $alertasStock->where('tipo', 'stock_bajo')->count(),
            'notificaciones_no_leidas' => $alertasNotificacion->count(),
        ];

        $moduloCajaDisponible = $this->hasTableCached('caja_movimientos')
            || $this->hasTableCached('movimientos_caja')
            || $this->hasTableCached('cajas');

        $resumenCaja = [
            'disponible' => $moduloCajaDisponible,
            'message' => $moduloCajaDisponible
                ? 'Existe estructura de caja, falta integrar la consulta especifica en este panel.'
                : 'Modulo de caja no encontrado. Se deja la estructura preparada.',
            'data' => null,
        ];

        $auditoriaDisponible = $this->hasTableCached('logs_actividad');
        $movimientosSospechosos = [];
        $resumenSospechosos = [
            'total' => 0,
            'alto' => 0,
            'medio' => 0,
            'origen_auditoria' => 0,
            'origen_inventario' => 0,
        ];

        if ($auditoriaDisponible) {
            $ajustesGrandes = MovimientoInventario::with(['producto:id,nombre,codigo', 'user:id,nombre'])
                ->where('tipo', 'ajuste')
                ->where('created_at', '>=', $inicio7Dias)
                ->where('cantidad', '>=', 20)
                ->orderBy('cantidad', 'desc')
                ->limit($limiteSospechosos)
                ->get()
                ->map(function ($m) {
                    return [
                        'id' => "mov-{$m->id}",
                        'origen' => 'inventario',
                        'riesgo' => 'medio',
                        'descripcion' => "Ajuste alto de {$m->cantidad} unidades",
                        'usuario' => $m->user?->nombre,
                        'producto' => $m->producto?->nombre,
                        'created_at' => $m->created_at,
                    ];
                });

            $logsSensibles = LogActividad::with('user:id,nombre')
                ->whereIn('accion', ['eliminar_usuario', 'desactivar_usuario', 'logout_all'])
                ->where('created_at', '>=', $inicio7Dias)
                ->orderBy('created_at', 'desc')
                ->limit($limiteSospechosos)
                ->get()
                ->map(function ($log) {
                    return [
                        'id' => "log-{$log->id}",
                        'origen' => 'auditoria',
                        'riesgo' => 'alto',
                        'descripcion' => "Accion sensible: {$log->accion}",
                        'usuario' => $log->user?->nombre,
                        'ip_address' => $log->ip_address,
                        'created_at' => $log->created_at,
                    ];
                });

            $movimientosSospechosos = $ajustesGrandes
                ->concat($logsSensibles)
                ->sortByDesc('created_at')
                ->take($limiteSospechosos)
                ->values();

            $resumenSospechosos = [
                'total' => $movimientosSospechosos->count(),
                'alto' => $movimientosSospechosos->where('riesgo', 'alto')->count(),
                'medio' => $movimientosSospechosos->where('riesgo', 'medio')->count(),
                'origen_auditoria' => $movimientosSospechosos->where('origen', 'auditoria')->count(),
                'origen_inventario' => $movimientosSospechosos->where('origen', 'inventario')->count(),
            ];
        }

        $inicioCompras = $inicio7Dias;
        $comprasPorMovimientos = DB::table('movimientos_inventario')
            ->where('tipo', 'entrada')
            ->where('created_at', '>=', $inicioCompras)
            ->selectRaw('COUNT(*) as total_movimientos')
            ->selectRaw('COALESCE(SUM(cantidad), 0) as total_unidades')
            ->selectRaw('COALESCE(SUM(cantidad * COALESCE(precio_compra, 0)), 0) as valor_estimado')
            ->selectRaw('COUNT(DISTINCT proveedor_id) as proveedores_distintos')
            ->first();

        $resumenComprasRecientes = [
            'disponible' => true,
            'fuente' => 'entradas_inventario_7_dias',
            'periodo_desde' => $inicioCompras->toDateTimeString(),
            'periodo_hasta' => now()->toDateTimeString(),
            'data' => [
                'total_movimientos' => (int) ($comprasPorMovimientos->total_movimientos ?? 0),
                'total_unidades' => (int) ($comprasPorMovimientos->total_unidades ?? 0),
                'valor_estimado' => round((float) ($comprasPorMovimientos->valor_estimado ?? 0), 2),
                'proveedores_distintos' => (int) ($comprasPorMovimientos->proveedores_distintos ?? 0),
            ],
            'message' => 'Resumen estimado usando entradas de inventario de los ultimos 7 dias.',
        ];

        $siigoConfigurado = (bool) (config('services.siigo.client_id') && config('services.siigo.client_secret'));
        $resumenSincronizacionSiigo = [
            'disponible' => false,
            'preparado' => true,
            'integrado' => false,
            'configurado' => $siigoConfigurado,
            'ultima_sincronizacion' => null,
            'estado' => 'pendiente_integracion',
            'message' => $siigoConfigurado
                ? 'Credenciales Siigo detectadas. Falta implementar el flujo de sincronizacion.'
                : 'Sin integracion activa con Siigo. Espacio preparado para futura conexion.',
            'data' => null,
        ];

        $resumenRiesgos = [
            'productos_sin_movimiento' => $productosPocoMovimiento->where('estado_movimiento', 'sin_movimiento')->count(),
            'productos_criticos' => $stockCritico,
            'productos_agotados' => $stockAgotado,
            'movimientos_sospechosos' => $resumenSospechosos['total'] ?? 0,
        ];

        $data = [
                'kpis' => [
                    'ventas_dia' => round((float) $ventasResumen->ventas_dia, 2),
                    'ventas_mes' => round((float) $ventasResumen->ventas_mes, 2),
                    'utilidad_estimada' => round($utilidadEstimada, 2),
                    'margen_estimado' => round($margenEstimado, 2),
                    'productos_stock_bajo' => $stockBajo,
                    'productos_agotados' => $stockAgotado,
                    'valor_total_inventario' => round((float) $valorInventario, 2),
                    'unidades_vendidas_hoy' => (int) $ventasResumen->unidades_dia,
                    'unidades_vendidas_mes' => (int) $ventasResumen->unidades_mes,
                ],
                'productos_mas_vendidos' => $productosMasVendidos,
                'productos_poco_movimiento' => $productosPocoMovimiento,
                'movimientos_importantes' => $movimientosImportantes,
                'alertas_activas' => $alertasActivas,
                'alertas_resumen' => $alertasResumen,
                'resumen_caja' => $resumenCaja,
                'resumen_compras_recientes' => $resumenComprasRecientes,
                'resumen_sincronizacion_siigo' => $resumenSincronizacionSiigo,
                'movimientos_sospechosos' => [
                    'disponible' => $auditoriaDisponible,
                    'items' => $movimientosSospechosos,
                    'resumen' => $resumenSospechosos,
                    'message' => $auditoriaDisponible
                        ? null
                        : 'No existe tabla de auditoria. Se deja el espacio preparado.',
                ],
                'resumen_riesgos' => $resumenRiesgos,
                'metadata' => [
                    'periodo_ventas_dia' => $inicioDia->toDateTimeString(),
                    'periodo_ventas_mes' => $inicioMes->toDateTimeString(),
                    'periodo_top_vendidos_30_dias' => $inicio30Dias->toDateTimeString(),
                    'periodo_top_vendidos_7_dias' => $inicio7Dias->toDateTimeString(),
                    'fuente_ventas' => 'estimado_por_salidas_de_inventario',
                    'actualizado_en' => $ahora->toDateTimeString(),
                ],
        ];

        Cache::put($cacheKey, $data, now()->addSeconds(30));

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function exportar(Request $request, string $tipo, string $formato, ReportExportService $exportService)
    {
        $tiposPermitidos = ['inventario', 'stock', 'categorias', 'valoracion', 'movimientos', 'proveedores'];
        $formatosPermitidos = ['excel', 'pdf'];

        if (!in_array($tipo, $tiposPermitidos, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Tipo de reporte no soportado.',
            ], 422);
        }

        if (!in_array($formato, $formatosPermitidos, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Formato de exportacion no soportado.',
            ], 422);
        }

        $filters = $request->only(['fecha_desde', 'fecha_hasta', 'tipo']);
        $result = $exportService->export($tipo, $formato, $request->user(), $filters);

        LogActividad::registrarAuditoria([
            'accion' => 'exportar_reporte',
            'user_id' => $request->user()->id,
            'modulo' => 'reportes',
            'modelo' => 'Reporte',
            'referencia' => $tipo,
            'datos_nuevos' => [
                'tipo' => $tipo,
                'formato' => $formato,
                'filename' => $result['filename'],
            ],
            'observacion' => 'Generacion y descarga de reporte',
        ]);

        return response($result['content'], 200, [
            'Content-Type' => $result['mime'],
            'Content-Disposition' => 'attachment; filename="' . $result['filename'] . '"',
        ]);
    }

    private function resolveNotificationTarget(?string $tipo): string
    {
        $tipo = strtolower((string) $tipo);

        if (str_contains($tipo, 'stock') || str_contains($tipo, 'agot')) {
            return '/stock-bajo';
        }
        if (str_contains($tipo, 'inventario') || str_contains($tipo, 'movimiento')) {
            return '/movimientos-inventario';
        }
        if (str_contains($tipo, 'producto')) {
            return '/productos';
        }

        return '/dashboard';
    }

    private function resolveNotificationModule(?string $tipo): string
    {
        $tipo = strtolower((string) $tipo);

        if (str_contains($tipo, 'stock') || str_contains($tipo, 'agot')) {
            return 'stock_bajo';
        }
        if (str_contains($tipo, 'inventario') || str_contains($tipo, 'movimiento')) {
            return 'entradas_salidas';
        }
        if (str_contains($tipo, 'producto')) {
            return 'productos';
        }

        return 'dashboard';
    }

    private function hasTableCached(string $table): bool
    {
        return Cache::remember("schema:has_table:{$table}", now()->addMinutes(10), function () use ($table) {
            return Schema::hasTable($table);
        });
    }

    private function triggerAlertMaintenance(AlertService $alertService): void
    {
        $lastScan = Cache::get('alertas:inactivos:last_scan');
        if ($lastScan) {
            return;
        }

        try {
            $cantidad = $alertService->scanInactiveProducts();
            LogActividad::registrarAuditoria([
                'accion' => 'scan_alertas_inactividad',
                'modulo' => 'alertas',
                'modelo' => 'Producto',
                'referencia' => 'inactividad',
                'datos_nuevos' => ['productos_alertados' => $cantidad],
            ]);
        } catch (\Throwable $e) {
            LogActividad::registrarAuditoria([
                'accion' => 'scan_alertas_inactividad_error',
                'modulo' => 'alertas',
                'modelo' => 'Producto',
                'referencia' => 'inactividad',
                'observacion' => $e->getMessage(),
            ]);
        }

        Cache::put('alertas:inactivos:last_scan', now()->toDateTimeString(), now()->addHours(12));
    }

    /**
     * Reporte de inventario valorizado
     */
    public function inventarioValorizado(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'subcategoria', 'proveedor'])
            ->activos();

        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->categoria_id);
        }

        $productos = $query->orderBy('nombre')->get();

        $resumen = [
            'total_productos' => $productos->count(),
            'total_unidades' => $productos->sum('stock'),
            'valor_compra' => $productos->sum(fn($p) => $p->stock * $p->precio_compra),
            'valor_venta' => $productos->sum(fn($p) => $p->stock * $p->precio_venta),
        ];

        $resumen['ganancia_potencial'] = $resumen['valor_venta'] - $resumen['valor_compra'];
        $resumen['margen_promedio'] = $resumen['valor_compra'] > 0
            ? ($resumen['ganancia_potencial'] / $resumen['valor_compra']) * 100
            : 0;

        $detalle = $productos->map(function ($p) {
            return [
                'id' => $p->id,
                'codigo' => $p->codigo,
                'nombre' => $p->nombre,
                'categoria' => $p->categoria->nombre,
                'subcategoria' => $p->subcategoria?->nombre,
                'proveedor' => $p->proveedor?->nombre,
                'stock' => $p->stock,
                'stock_minimo' => $p->stock_minimo,
                'estado_stock' => $p->estado_stock,
                'precio_compra' => $p->precio_compra,
                'precio_venta' => $p->precio_venta,
                'valor_inventario' => round($p->stock * $p->precio_compra, 2),
                'valor_venta' => round($p->stock * $p->precio_venta, 2),
                'margen' => round($p->margen, 2),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'resumen' => $resumen,
                'detalle' => $detalle,
            ],
        ]);
    }

    /**
     * Reporte de movimientos de inventario
     */
    public function movimientos(Request $request): JsonResponse
    {
        $request->validate([
            'fecha_desde' => 'required|date',
            'fecha_hasta' => 'required|date|after_or_equal:fecha_desde',
        ]);

        $query = MovimientoInventario::with(['producto', 'user', 'proveedor'])
            ->whereDate('created_at', '>=', $request->fecha_desde)
            ->whereDate('created_at', '<=', $request->fecha_hasta);

        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('producto_id')) {
            $query->where('producto_id', $request->producto_id);
        }

        $movimientos = $query->orderBy('created_at', 'desc')->get();

        // Resumen
        $entradas = $movimientos->where('tipo', 'entrada');
        $salidas = $movimientos->where('tipo', 'salida');
        $ajustes = $movimientos->where('tipo', 'ajuste');

        $resumen = [
            'total_movimientos' => $movimientos->count(),
            'entradas' => [
                'cantidad' => $entradas->count(),
                'unidades' => $entradas->sum('cantidad'),
                'valor' => $entradas->sum(fn($m) => $m->cantidad * ($m->precio_compra ?? 0)),
            ],
            'salidas' => [
                'cantidad' => $salidas->count(),
                'unidades' => $salidas->sum('cantidad'),
            ],
            'ajustes' => [
                'cantidad' => $ajustes->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'periodo' => [
                    'desde' => $request->fecha_desde,
                    'hasta' => $request->fecha_hasta,
                ],
                'resumen' => $resumen,
                'movimientos' => $movimientos,
            ],
        ]);
    }

    /**
     * Reporte de productos por categoría
     */
    public function productosPorCategoria(): JsonResponse
    {
        $categorias = DB::table('productos')
            ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->where('productos.activo', true)
            ->select(
                'categorias.id',
                'categorias.nombre',
                'categorias.color',
                DB::raw('COUNT(*) as total_productos'),
                DB::raw('SUM(productos.stock) as total_stock'),
                DB::raw('SUM(productos.stock * productos.precio_compra) as valor_inventario'),
                DB::raw('SUM(productos.stock * productos.precio_venta) as valor_venta')
            )
            ->groupBy('categorias.id', 'categorias.nombre', 'categorias.color')
            ->orderBy('valor_inventario', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categorias,
        ]);
    }

    /**
     * Reporte de productos más vendidos (por salidas)
     */
    public function productosMasMovidos(Request $request): JsonResponse
    {
        $dias = $request->get('dias', 30);
        $limite = $request->get('limite', 10);

        $productos = DB::table('movimientos_inventario')
            ->join('productos', 'movimientos_inventario.producto_id', '=', 'productos.id')
            ->where('movimientos_inventario.tipo', 'salida')
            ->where('movimientos_inventario.created_at', '>=', now()->subDays($dias))
            ->select(
                'productos.id',
                'productos.codigo',
                'productos.nombre',
                DB::raw('SUM(movimientos_inventario.cantidad) as total_salidas'),
                DB::raw('COUNT(*) as numero_movimientos')
            )
            ->groupBy('productos.id', 'productos.codigo', 'productos.nombre')
            ->orderBy('total_salidas', 'desc')
            ->limit($limite)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'periodo_dias' => $dias,
                'productos' => $productos,
            ],
        ]);
    }

    /**
     * Reporte de deudas a proveedores
     */
    public function deudasProveedores(): JsonResponse
    {
        $proveedores = Proveedor::activos()
            ->conDeuda()
            ->with(['pagos' => function ($q) {
                $q->orderBy('fecha_pago', 'desc')->limit(3);
            }])
            ->orderBy('deuda', 'desc')
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'nombre' => $p->nombre,
                    'email' => $p->email,
                    'telefono' => $p->telefono,
                    'deuda' => $p->deuda,
                    'ultimos_pagos' => $p->pagos,
                ];
            });

        $totalDeuda = $proveedores->sum('deuda');

        return response()->json([
            'success' => true,
            'data' => [
                'total_deuda' => $totalDeuda,
                'cantidad_proveedores' => $proveedores->count(),
                'proveedores' => $proveedores,
            ],
        ]);
    }

    /**
     * Reporte de stock crítico y bajo
     */
    public function stockAlerta(): JsonResponse
    {
        $criticos = Producto::with(['categoria', 'proveedor'])
            ->activos()
            ->where('estado_stock', 'critico')
            ->orderBy('stock')
            ->get();

        $bajos = Producto::with(['categoria', 'proveedor'])
            ->activos()
            ->where('estado_stock', 'bajo')
            ->orderBy('stock')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'criticos' => [
                    'cantidad' => $criticos->count(),
                    'productos' => $criticos,
                ],
                'bajos' => [
                    'cantidad' => $bajos->count(),
                    'productos' => $bajos,
                ],
            ],
        ]);
    }
}
