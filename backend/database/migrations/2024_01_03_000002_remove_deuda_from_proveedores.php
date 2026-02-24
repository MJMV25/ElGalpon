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
        // Eliminar tabla de pagos
        Schema::dropIfExists('pago_proveedores');

        // Eliminar columna deuda de proveedores
        Schema::table('proveedores', function (Blueprint $table) {
            $table->dropColumn('deuda');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restaurar columna deuda
        Schema::table('proveedores', function (Blueprint $table) {
            $table->decimal('deuda', 12, 2)->default(0)->after('notas');
        });

        // Restaurar tabla de pagos
        Schema::create('pago_proveedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proveedor_id')->constrained('proveedores')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->decimal('monto', 12, 2);
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'cheque', 'otro'])->default('efectivo');
            $table->string('referencia')->nullable();
            $table->text('notas')->nullable();
            $table->date('fecha_pago');
            $table->timestamps();
        });
    }
};

