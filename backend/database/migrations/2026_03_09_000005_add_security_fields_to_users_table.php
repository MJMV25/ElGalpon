<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('estado_cuenta', ['activo', 'suspendido', 'pendiente'])->default('activo')->after('activo');
            $table->timestamp('ultimo_acceso')->nullable()->after('estado_cuenta');
            $table->string('ip_ultimo_acceso', 45)->nullable()->after('ultimo_acceso');
            $table->foreignId('creado_por')->nullable()->after('ip_ultimo_acceso')->constrained('users')->nullOnDelete();
            $table->string('primer_acceso_token', 120)->nullable()->after('creado_por');
            $table->timestamp('primer_acceso_expira_en')->nullable()->after('primer_acceso_token');
            $table->timestamp('primer_acceso_completado_en')->nullable()->after('primer_acceso_expira_en');

            $table->index('estado_cuenta');
            $table->index('ultimo_acceso');
            $table->index('primer_acceso_token');
        });

        // Sincronizar estado interno con el booleano activo existente.
        DB::table('users')
            ->where('activo', true)
            ->update(['estado_cuenta' => 'activo']);
        DB::table('users')
            ->where('activo', false)
            ->update(['estado_cuenta' => 'suspendido']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['estado_cuenta']);
            $table->dropIndex(['ultimo_acceso']);
            $table->dropIndex(['primer_acceso_token']);
            $table->dropForeign(['creado_por']);

            $table->dropColumn([
                'estado_cuenta',
                'ultimo_acceso',
                'ip_ultimo_acceso',
                'creado_por',
                'primer_acceso_token',
                'primer_acceso_expira_en',
                'primer_acceso_completado_en',
            ]);
        });
    }
};

