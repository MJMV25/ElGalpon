<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogActividad extends Model
{
    use HasFactory;

    protected $table = 'logs_actividad';

    protected $fillable = [
        'user_id',
        'accion',
        'modulo',
        'modelo',
        'modelo_id',
        'referencia',
        'datos_anteriores',
        'datos_nuevos',
        'observacion',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'datos_anteriores' => 'array',
            'datos_nuevos' => 'array',
        ];
    }

    /**
     * Relación con usuario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Registrar una actividad
     */
    public static function registrar(
        string $accion,
        ?int $userId = null,
        ?string $modelo = null,
        ?int $modeloId = null,
        ?array $datosAnteriores = null,
        ?array $datosNuevos = null
    ): self {
        return self::registrarAuditoria([
            'user_id' => $userId ?? auth()->id(),
            'accion' => $accion,
            'modelo' => $modelo,
            'modelo_id' => $modeloId,
            'datos_anteriores' => $datosAnteriores,
            'datos_nuevos' => $datosNuevos,
        ]);
    }

    /**
     * Registrar una entrada de auditoria completa.
     */
    public static function registrarAuditoria(array $payload): self
    {
        $modelo = $payload['modelo'] ?? null;
        $accion = (string) ($payload['accion'] ?? 'accion_desconocida');
        $modeloId = $payload['modelo_id'] ?? null;

        return self::create([
            'user_id' => $payload['user_id'] ?? auth()->id(),
            'accion' => $accion,
            'modulo' => $payload['modulo'] ?? self::resolverModulo($modelo, $accion),
            'modelo' => $modelo,
            'modelo_id' => $modeloId,
            'referencia' => $payload['referencia'] ?? self::resolverReferencia($modelo, $modeloId),
            'datos_anteriores' => $payload['datos_anteriores'] ?? null,
            'datos_nuevos' => $payload['datos_nuevos'] ?? null,
            'observacion' => $payload['observacion'] ?? null,
            'ip_address' => $payload['ip_address'] ?? request()->ip(),
            'user_agent' => $payload['user_agent'] ?? request()->userAgent(),
        ]);
    }

    /**
     * Resolver modulo de auditoria segun el modelo o accion.
     */
    public static function resolverModulo(?string $modelo, string $accion): string
    {
        $modeloNormalizado = strtolower((string) $modelo);

        if (str_contains($modeloNormalizado, 'producto')) {
            return 'inventario';
        }
        if (str_contains($modeloNormalizado, 'movimientoinventario')) {
            return 'inventario';
        }
        if (str_contains($modeloNormalizado, 'cotizacion')) {
            return 'compras';
        }
        if (str_contains($modeloNormalizado, 'user')) {
            return 'usuarios';
        }
        if (str_contains($modeloNormalizado, 'proveedor')) {
            return 'proveedores';
        }
        if (str_contains($modeloNormalizado, 'config')) {
            return 'configuracion';
        }

        if (str_contains($accion, 'login') || str_contains($accion, 'logout')) {
            return 'seguridad';
        }
        if (str_contains($accion, 'stock') || str_contains($accion, 'inventario') || str_contains($accion, 'precio')) {
            return 'inventario';
        }

        return 'general';
    }

    /**
     * Resolver referencia textual para busquedas y trazabilidad.
     */
    public static function resolverReferencia(?string $modelo, mixed $modeloId): ?string
    {
        if (!$modelo || !$modeloId) {
            return null;
        }

        return "{$modelo}#{$modeloId}";
    }

    /**
     * Acciones sensibles para control de riesgo.
     */
    public static function accionesSensibles(): array
    {
        return [
            'eliminar_usuario',
            'desactivar_usuario',
            'logout_all',
            'eliminar_producto',
            'salida_stock',
            'salida_stock_lote',
            'ajuste_stock',
            'cambio_precio_producto',
            'cancelar_cotizacion',
            'eliminar_cotizacion',
            'completar_cotizacion',
            'cambio_rol_usuario',
            'cambiar_password_usuario',
            'sincronizacion_externa',
            'sincronizacion_siigo',
        ];
    }

    /**
     * Clasificar nivel de riesgo por accion.
     */
    public static function nivelRiesgo(string $accion): string
    {
        $accion = strtolower($accion);

        $alto = [
            'eliminar_usuario',
            'logout_all',
            'desactivar_usuario',
            'eliminar_producto',
            'eliminar_cotizacion',
            'cancelar_cotizacion',
            'cambio_rol_usuario',
            'sincronizacion_externa_error',
            'sincronizacion_siigo_error',
        ];

        if (in_array($accion, $alto, true)) {
            return 'alto';
        }

        if (in_array($accion, self::accionesSensibles(), true)) {
            return 'medio';
        }

        return 'bajo';
    }

    /**
     * Scope por acción
     */
    public function scopePorAccion($query, string $accion)
    {
        return $query->where('accion', $accion);
    }

    /**
     * Scope por modelo
     */
    public function scopePorModelo($query, string $modelo)
    {
        return $query->where('modelo', $modelo);
    }

    /**
     * Scope por modulo.
     */
    public function scopePorModulo($query, string $modulo)
    {
        return $query->where('modulo', $modulo);
    }
}
