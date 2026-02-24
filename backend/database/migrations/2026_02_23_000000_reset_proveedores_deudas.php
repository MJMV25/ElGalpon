<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Esta migración resetea todas las deudas de proveedores a 0
     * ya que las deudas iniciales en los seeders eran ficticias.
     * La deuda solo debe incrementarse cuando hay compras reales.
     */
    public function up(): void
    {
        DB::table('proveedores')->update(['deuda' => 0]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertimos porque las deudas anteriores eran datos de prueba incorrectos
    }
};

