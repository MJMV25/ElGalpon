<?php

namespace App\Console\Commands;

use App\Models\Proveedor;
use Illuminate\Console\Command;

class VerificarDeudas extends Command
{
    protected $signature = 'proveedores:verificar-deudas';
    protected $description = 'Verifica el estado de las deudas de todos los proveedores';

    public function handle()
    {
        $this->info('=== VERIFICACIÓN DE DEUDAS DE PROVEEDORES ===');
        $this->newLine();

        $proveedores = Proveedor::all(['id', 'nombre', 'deuda']);

        $this->table(
            ['ID', 'Proveedor', 'Deuda'],
            $proveedores->map(function ($p) {
                return [
                    $p->id,
                    $p->nombre,
                    '$' . number_format($p->deuda, 2, ',', '.')
                ];
            })
        );

        $totalDeuda = $proveedores->sum('deuda');
        $conDeuda = $proveedores->where('deuda', '>', 0)->count();

        $this->newLine();
        $this->info("Total de proveedores: {$proveedores->count()}");
        $this->info("Proveedores con deuda: {$conDeuda}");
        $this->info("Proveedores al día: " . ($proveedores->count() - $conDeuda));
        $this->info("Deuda total: $" . number_format($totalDeuda, 2, ',', '.'));

        $this->newLine();
        if ($totalDeuda == 0) {
            $this->info('✅ Todos los proveedores están al día');
        } else {
            $this->warn('⚠️ Hay proveedores con deuda pendiente');
        }

        return 0;
    }
}

