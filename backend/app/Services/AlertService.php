<?php

namespace App\Services;

use App\Mail\SystemAlertMail;
use App\Models\LogActividad;
use App\Models\Notificacion;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AlertService
{
    public function __construct(private readonly SystemSettingsService $settingsService)
    {
    }

    public function notifyStockState(Producto $producto, string $origen = 'inventario'): void
    {
        if (!$this->settingsService->getBool('notifStock', true)) {
            return;
        }

        $estado = $this->resolveStockState($producto);
        if ($estado === null) {
            return;
        }

        $type = match ($estado) {
            'agotado' => 'stock_agotado',
            'critico' => 'stock_critico',
            default => 'stock_bajo',
        };

        $nivel = match ($estado) {
            'agotado' => 'alto',
            'critico' => 'alto',
            default => 'medio',
        };

        $titulo = match ($estado) {
            'agotado' => "Producto agotado: {$producto->nombre}",
            'critico' => "Stock critico: {$producto->nombre}",
            default => "Stock bajo: {$producto->nombre}",
        };

        $mensaje = "Producto {$producto->codigo} con stock {$producto->stock}.";

        $this->emit(
            type: $type,
            titulo: $titulo,
            mensaje: $mensaje,
            nivel: $nivel,
            enlace: "/productos",
            meta: [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo,
                'stock' => (int) $producto->stock,
                'stock_minimo' => (int) $producto->stock_minimo,
                'origen' => $origen,
            ]
        );
    }

    public function notifyLargeAdjustment(Producto $producto, int $cantidad, ?string $motivo = null): void
    {
        if (!$this->settingsService->getBool('alertBigInventoryAdjustments', true)) {
            return;
        }

        $threshold = max(1, $this->settingsService->getInt('largeAdjustmentUnits', 20));
        if ($cantidad < $threshold) {
            return;
        }

        $nivel = $cantidad >= ($threshold * 2) ? 'alto' : 'medio';
        $this->emit(
            type: 'ajuste_grande_inventario',
            titulo: "Ajuste grande detectado: {$producto->nombre}",
            mensaje: "Se registro un ajuste de {$cantidad} unidades.",
            nivel: $nivel,
            enlace: '/movimientos-inventario',
            meta: [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo,
                'cantidad' => $cantidad,
                'motivo' => $motivo,
            ]
        );
    }

    public function notifyStrongPriceChange(Producto $producto, float $precioAnterior, float $precioNuevo): void
    {
        if (!$this->settingsService->getBool('alertStrongPriceChanges', true)) {
            return;
        }
        if ($precioAnterior <= 0) {
            return;
        }

        $pct = abs((($precioNuevo - $precioAnterior) / $precioAnterior) * 100);
        $threshold = max(1, $this->settingsService->getFloat('strongPriceChangePct', 20));
        if ($pct < $threshold) {
            return;
        }

        $nivel = $pct >= ($threshold * 2) ? 'alto' : 'medio';
        $this->emit(
            type: 'cambio_precio_fuerte',
            titulo: "Cambio fuerte de precio: {$producto->nombre}",
            mensaje: sprintf('Variacion detectada: %.1f%%', $pct),
            nivel: $nivel,
            enlace: '/productos',
            meta: [
                'producto_id' => $producto->id,
                'codigo' => $producto->codigo,
                'precio_anterior' => $precioAnterior,
                'precio_nuevo' => $precioNuevo,
                'variacion_pct' => round($pct, 2),
            ]
        );
    }

    public function notifySuspiciousMovement(
        string $descripcion,
        array $meta = [],
        string $nivel = 'medio',
        ?string $enlace = '/movimientos-inventario'
    ): void {
        if (!$this->settingsService->getBool('alertSuspiciousMovements', true)) {
            return;
        }

        $this->emit(
            type: 'movimiento_sospechoso',
            titulo: 'Movimiento sospechoso detectado',
            mensaje: $descripcion,
            nivel: $nivel,
            enlace: $enlace,
            meta: $meta
        );
    }

    public function scanInactiveProducts(): int
    {
        if (!$this->settingsService->getBool('alertSuspiciousMovements', true)) {
            return 0;
        }

        $days = max(30, $this->settingsService->getInt('inactiveProductDays', 60));
        $cutoff = now()->subDays($days);

        $productos = Producto::query()
            ->activos()
            ->where('stock', '>', 0)
            ->whereDoesntHave('movimientos', function ($query) use ($cutoff) {
                $query->where('created_at', '>=', $cutoff);
            })
            ->orderByDesc('stock')
            ->limit(8)
            ->get(['id', 'codigo', 'nombre', 'stock']);

        foreach ($productos as $producto) {
            $this->emit(
                type: 'producto_sin_movimiento',
                titulo: "Producto sin movimiento: {$producto->nombre}",
                mensaje: "Sin movimientos en {$days} dias.",
                nivel: 'medio',
                enlace: '/movimientos-inventario',
                meta: [
                    'producto_id' => $producto->id,
                    'codigo' => $producto->codigo,
                    'stock' => (int) $producto->stock,
                    'dias_sin_movimiento' => $days,
                ]
            );
        }

        return $productos->count();
    }

    public function notifySyncError(string $mensaje, array $meta = []): void
    {
        $this->emit(
            type: 'sincronizacion_error',
            titulo: 'Error de sincronizacion externa',
            mensaje: $mensaje,
            nivel: 'alto',
            enlace: '/panel-dueno',
            meta: $meta
        );
    }

    private function emit(
        string $type,
        string $titulo,
        string $mensaje,
        string $nivel,
        ?string $enlace = null,
        array $meta = []
    ): void {
        $admins = $this->adminsActivos();
        if ($admins->isEmpty()) {
            return;
        }

        foreach ($admins as $admin) {
            if ($this->isDuplicated($admin->id, $type, $titulo)) {
                continue;
            }

            $notificacion = Notificacion::create([
                'user_id' => $admin->id,
                'tipo' => $type,
                'titulo' => $titulo,
                'mensaje' => $mensaje,
                'enlace' => $enlace,
                'datos' => array_merge($meta, ['nivel' => $nivel]),
                'leida' => false,
            ]);

            LogActividad::registrarAuditoria([
                'accion' => 'alerta_generada',
                'modulo' => 'alertas',
                'modelo' => 'Notificacion',
                'modelo_id' => $notificacion->id,
                'referencia' => $type,
                'datos_nuevos' => [
                    'tipo' => $type,
                    'titulo' => $titulo,
                    'nivel' => $nivel,
                    'user_id' => $admin->id,
                ],
            ]);
        }

        $this->sendEmailIfNeeded($type, $titulo, $mensaje, $nivel, $meta);
    }

    private function sendEmailIfNeeded(string $type, string $titulo, string $mensaje, string $nivel, array $meta): void
    {
        $enabled = $this->settingsService->getBool('notifEmail', false);
        $destinatarios = $this->resolveAlertRecipients();
        if (!$enabled || empty($destinatarios)) {
            return;
        }

        $emailAllowed = $nivel === 'alto' || in_array($type, ['stock_critico', 'stock_agotado', 'movimiento_sospechoso'], true);
        if (!$emailAllowed) {
            return;
        }

        foreach ($destinatarios as $to) {
            try {
                Mail::to($to)->queue(new SystemAlertMail($titulo, $mensaje, $nivel, $meta));
                LogActividad::registrarAuditoria([
                    'accion' => 'alerta_email_enviado',
                    'modulo' => 'alertas',
                    'modelo' => 'Notificacion',
                    'referencia' => $type,
                    'datos_nuevos' => [
                        'email' => $to,
                        'nivel' => $nivel,
                        'tipo' => $type,
                    ],
                ]);
            } catch (\Throwable $e) {
                LogActividad::registrarAuditoria([
                    'accion' => 'alerta_email_fallido',
                    'modulo' => 'alertas',
                    'modelo' => 'Notificacion',
                    'referencia' => $type,
                    'datos_nuevos' => [
                        'email' => $to,
                        'error' => $e->getMessage(),
                    ],
                    'observacion' => 'Fallo envio de correo de alerta',
                ]);
            }
        }
    }

    /**
     * Lista de destinatarios de alertas.
     * Preparado para multiples correos via alertEmailRecipients.
     */
    private function resolveAlertRecipients(): array
    {
        $primary = trim($this->settingsService->getString('alertEmailPrimary', ''));
        $recipients = $this->settingsService->get('alertEmailRecipients', []);

        $lista = [];
        if ($primary !== '') {
            $lista[] = $primary;
        }

        if (is_string($recipients) && $recipients !== '') {
            $recipients = preg_split('/[,;\\s]+/', $recipients) ?: [];
        }
        if (is_array($recipients)) {
            foreach ($recipients as $email) {
                if (is_string($email) && trim($email) !== '') {
                    $lista[] = trim($email);
                }
            }
        }

        if (empty($lista)) {
            $adminPrincipal = User::query()
                ->where('rol', 'admin')
                ->where('activo', true)
                ->where('email', 'samugj22@gmail.com')
                ->value('email');

            $lista[] = $adminPrincipal ?: 'samugj22@gmail.com';
        }

        $lista = collect($lista)
            ->map(fn($email) => Str::lower(trim((string) $email)))
            ->filter(fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values()
            ->toArray();

        return $lista;
    }

    private function adminsActivos(): Collection
    {
        return User::query()
            ->where('rol', 'admin')
            ->where('activo', true)
            ->get(['id', 'email']);
    }

    private function isDuplicated(int $userId, string $type, string $title): bool
    {
        return Notificacion::query()
            ->where('user_id', $userId)
            ->where('tipo', $type)
            ->where('titulo', $title)
            ->where('leida', false)
            ->where('created_at', '>=', now()->subHours(6))
            ->exists();
    }

    private function resolveStockState(Producto $producto): ?string
    {
        if ($producto->stock <= 0) {
            return 'agotado';
        }

        $stockMinimoProducto = (int) $producto->stock_minimo;
        if ($stockMinimoProducto > 0) {
            $critico = max(1, (int) floor($stockMinimoProducto * 0.3));
            if ($producto->stock <= $critico) {
                return 'critico';
            }
            if ($producto->stock <= $stockMinimoProducto) {
                return 'bajo';
            }
            return null;
        }

        $criticoGlobal = max(0, $this->settingsService->getInt('globalCriticalStockThreshold', 3));
        $bajoGlobal = max($criticoGlobal, $this->settingsService->getInt('globalLowStockThreshold', 10));

        if ($producto->stock <= $criticoGlobal) {
            return 'critico';
        }
        if ($producto->stock <= $bajoGlobal) {
            return 'bajo';
        }

        return null;
    }
}
