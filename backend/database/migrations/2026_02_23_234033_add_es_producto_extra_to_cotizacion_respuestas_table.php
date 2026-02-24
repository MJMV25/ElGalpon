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
        Schema::table('cotizacion_respuestas', function (Blueprint $table) {
            // Campo para indicar si es un producto extra agregado por el proveedor
            $table->boolean('es_producto_extra')->default(false)->after('notas');
            // Campo para el nombre del producto extra (cuando no es de la lista original)
            $table->string('nombre_producto_extra')->nullable()->after('es_producto_extra');
            // Hacer que cotizacion_producto_id sea nullable para productos extra
            $table->foreignId('cotizacion_producto_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cotizacion_respuestas', function (Blueprint $table) {
            $table->dropColumn(['es_producto_extra', 'nombre_producto_extra']);
        });
    }
};

