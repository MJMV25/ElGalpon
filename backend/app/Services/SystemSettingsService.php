<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class SystemSettingsService
{
    private const CACHE_KEY = 'system_settings:all';
    private const CACHE_TTL_SECONDS = 300;

    /**
     * Defaults centrales para toda la aplicacion.
     */
    public function defaults(): array
    {
        return [
            'businessName' => 'El Galpon',
            'phone' => '',
            'address' => '',
            'city' => '',
            'notifStock' => true,
            'notifEmail' => false,
            'notifDaily' => false,
            'alertEmailPrimary' => 'samugj22@gmail.com',
            'alertEmailRecipients' => [],
            'alertWhatsapp' => '',
            'globalLowStockThreshold' => 10,
            'globalCriticalStockThreshold' => 3,
            'minAllowedMargin' => 0,
            'alertBigInventoryAdjustments' => true,
            'alertStrongPriceChanges' => true,
            'alertSuspiciousMovements' => true,
            'inactiveProductDays' => 60,
            'strongPriceChangePct' => 20,
            'largeAdjustmentUnits' => 20,
            'suspiciousMovementUnits' => 30,
        ];
    }

    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function () {
            $defaults = $this->defaults();
            $stored = SystemSetting::query()
                ->select(['clave', 'valor'])
                ->get()
                ->mapWithKeys(function (SystemSetting $item) {
                    $raw = $item->valor;
                    $value = is_array($raw) && array_key_exists('value', $raw) ? $raw['value'] : $raw;
                    return [$item->clave => $value];
                })
                ->toArray();

            return array_merge($defaults, $stored);
        });
    }

    public function setMany(array $settings, ?int $updatedBy = null): void
    {
        foreach ($settings as $key => $value) {
            SystemSetting::updateOrCreate(
                ['clave' => $key],
                [
                    'valor' => ['value' => $value],
                    'actualizado_por' => $updatedBy,
                ]
            );
        }

        Cache::forget(self::CACHE_KEY);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->all();
        return $all[$key] ?? $default;
    }

    public function getBool(string $key, bool $default = false): bool
    {
        return (bool) $this->get($key, $default);
    }

    public function getInt(string $key, int $default = 0): int
    {
        return (int) $this->get($key, $default);
    }

    public function getFloat(string $key, float $default = 0): float
    {
        return (float) $this->get($key, $default);
    }

    public function getString(string $key, string $default = ''): string
    {
        return (string) $this->get($key, $default);
    }
}
