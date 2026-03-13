<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogActividad;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /**
     * Listar auditoria con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'accion' => 'nullable|string|max:120',
            'modulo' => 'nullable|string|max:80',
            'modelo' => 'nullable|string|max:120',
            'referencia' => 'nullable|string|max:150',
            'solo_sensibles' => 'nullable|boolean',
            'fecha_desde' => 'nullable|date',
            'fecha_hasta' => 'nullable|date|after_or_equal:fecha_desde',
            'q' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $query = LogActividad::with('user:id,nombre,email')
            ->orderBy('created_at', 'desc');

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->user_id);
        }

        if ($request->filled('accion')) {
            $query->where('accion', $request->accion);
        }

        if ($request->filled('modulo')) {
            $query->where('modulo', $request->modulo);
        }

        if ($request->filled('modelo')) {
            $query->where('modelo', $request->modelo);
        }

        if ($request->filled('referencia')) {
            $query->where('referencia', 'like', '%' . trim((string) $request->referencia) . '%');
        }

        if ($request->boolean('solo_sensibles')) {
            $query->whereIn('accion', LogActividad::accionesSensibles());
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        if ($request->filled('q')) {
            $q = trim($request->q);
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('accion', 'like', "%{$q}%")
                    ->orWhere('modulo', 'like', "%{$q}%")
                    ->orWhere('modelo', 'like', "%{$q}%")
                    ->orWhere('referencia', 'like', "%{$q}%")
                    ->orWhere('observacion', 'like', "%{$q}%")
                    ->orWhere('ip_address', 'like', "%{$q}%");
            });
        }

        $perPage = (int) ($request->get('per_page', 20));
        $logs = $query->paginate($perPage);
        $logs->setCollection(
            $logs->getCollection()->map(function (LogActividad $log) {
                $item = $log->toArray();
                $item['nivel_riesgo'] = LogActividad::nivelRiesgo($log->accion);
                return $item;
            })
        );

        $resumenBase = (clone $query)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN accion IN ('" . implode("','", LogActividad::accionesSensibles()) . "') THEN 1 ELSE 0 END) as sensibles")
            ->first();

        $filtros = [
            'usuarios' => User::select('id', 'nombre', 'email')->orderBy('nombre')->get(),
            'modulos' => LogActividad::query()
                ->whereNotNull('modulo')
                ->select('modulo')
                ->distinct()
                ->orderBy('modulo')
                ->pluck('modulo'),
            'acciones' => LogActividad::query()
                ->select('accion')
                ->distinct()
                ->orderBy('accion')
                ->pluck('accion'),
            'modelos' => LogActividad::query()
                ->whereNotNull('modelo')
                ->select('modelo')
                ->distinct()
                ->orderBy('modelo')
                ->pluck('modelo'),
        ];

        return response()->json([
            'success' => true,
            'data' => $logs,
            'meta' => [
                'filtros' => $filtros,
            ],
            'resumen' => [
                'total_filtrado' => (int) ($resumenBase->total ?? 0),
                'sensibles_filtrado' => (int) ($resumenBase->sensibles ?? 0),
            ],
        ]);
    }

    /**
     * Registrar cambios de configuracion para trazabilidad.
     */
    public function registrarConfiguracion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'clave' => 'required|string|max:150',
            'valor_anterior' => 'nullable',
            'valor_nuevo' => 'nullable',
            'observacion' => 'nullable|string|max:2000',
        ]);

        $log = LogActividad::registrarAuditoria([
            'accion' => 'cambio_configuracion',
            'user_id' => auth()->id(),
            'modulo' => 'configuracion',
            'modelo' => 'Configuracion',
            'modelo_id' => null,
            'referencia' => $validated['clave'],
            'datos_anteriores' => [
                'clave' => $validated['clave'],
                'valor' => $validated['valor_anterior'] ?? null,
            ],
            'datos_nuevos' => [
                'clave' => $validated['clave'],
                'valor' => $validated['valor_nuevo'] ?? null,
            ],
            'observacion' => $validated['observacion'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cambio de configuracion auditado',
            'data' => $log,
        ]);
    }
}
