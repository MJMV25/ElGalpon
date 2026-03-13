<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogActividad;
use App\Services\SystemSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracionController extends Controller
{
    public function __construct(private readonly SystemSettingsService $settingsService)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->settingsService->all(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'businessName' => 'nullable|string|max:150',
            'phone' => 'nullable|string|max:60',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:120',
            'notifStock' => 'nullable|boolean',
            'notifEmail' => 'nullable|boolean',
            'notifDaily' => 'nullable|boolean',
            'alertEmailPrimary' => 'nullable|email|max:180',
            'alertEmailRecipients' => 'nullable|array|max:20',
            'alertEmailRecipients.*' => 'email|max:180',
            'alertWhatsapp' => 'nullable|string|max:40',
            'globalLowStockThreshold' => 'nullable|integer|min:0|max:100000',
            'globalCriticalStockThreshold' => 'nullable|integer|min:0|max:100000',
            'minAllowedMargin' => 'nullable|numeric|min:0|max:1000',
            'alertBigInventoryAdjustments' => 'nullable|boolean',
            'alertStrongPriceChanges' => 'nullable|boolean',
            'alertSuspiciousMovements' => 'nullable|boolean',
        ]);

        $current = $this->settingsService->all();
        $changes = [];
        foreach ($validated as $key => $value) {
            $oldValue = $current[$key] ?? null;
            if ($oldValue !== $value) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $value,
                ];
            }
        }

        if (!empty($validated)) {
            $this->settingsService->setMany($validated, auth()->id());
        }

        if (!empty($changes)) {
            LogActividad::registrarAuditoria([
                'accion' => 'actualizar_configuracion',
                'user_id' => auth()->id(),
                'modulo' => 'configuracion',
                'modelo' => 'SystemSetting',
                'referencia' => 'global',
                'datos_anteriores' => collect($changes)->mapWithKeys(fn($item, $key) => [$key => $item['old']])->toArray(),
                'datos_nuevos' => collect($changes)->mapWithKeys(fn($item, $key) => [$key => $item['new']])->toArray(),
                'observacion' => 'Actualizacion de parametros del sistema',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Configuracion actualizada',
            'data' => $this->settingsService->all(),
        ]);
    }
}
