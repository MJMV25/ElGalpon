<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->index(['activo', 'nombre'], 'productos_activo_nombre_idx');
            $table->index(['categoria_id', 'activo'], 'productos_categoria_activo_idx');
        });

        Schema::table('movimientos_inventario', function (Blueprint $table) {
            $table->index(['producto_id', 'created_at'], 'movs_producto_fecha_idx');
            $table->index(['tipo', 'created_at'], 'movs_tipo_fecha_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_inventario', function (Blueprint $table) {
            $table->dropIndex('movs_producto_fecha_idx');
            $table->dropIndex('movs_tipo_fecha_idx');
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->dropIndex('productos_activo_nombre_idx');
            $table->dropIndex('productos_categoria_activo_idx');
        });
    }
};

