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
        Schema::create('cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique(); // COT-2026-001
            $table->foreignId('user_id')->constrained('users');
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->enum('estado', ['borrador', 'enviada', 'en_proceso', 'completada', 'cancelada'])->default('borrador');
            $table->date('fecha');
            $table->date('fecha_limite');
            $table->timestamps();

            $table->index('numero');
            $table->index('estado');
        });

        Schema::create('cotizacion_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_id')->constrained('cotizaciones')->onDelete('cascade');
            $table->foreignId('producto_id')->nullable()->constrained('productos');
            $table->string('nombre_producto');
            $table->integer('cantidad');
            $table->string('especificaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('cotizacion_proveedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_id')->constrained('cotizaciones')->onDelete('cascade');
            $table->foreignId('proveedor_id')->constrained('proveedores');
            $table->enum('estado', ['pendiente', 'enviada', 'respondida', 'sin_respuesta'])->default('pendiente');
            $table->timestamp('fecha_envio')->nullable();
            $table->timestamp('fecha_respuesta')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();
        });

        Schema::create('cotizacion_respuestas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotizacion_proveedor_id')->constrained('cotizacion_proveedores')->onDelete('cascade');
            $table->foreignId('cotizacion_producto_id')->nullable()->constrained('cotizacion_productos')->onDelete('cascade');
            $table->decimal('precio_unitario', 12, 2);
            $table->integer('cantidad_disponible')->nullable();
            $table->integer('tiempo_entrega_dias')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cotizacion_respuestas');
        Schema::dropIfExists('cotizacion_proveedores');
        Schema::dropIfExists('cotizacion_productos');
        Schema::dropIfExists('cotizaciones');
    }
};
