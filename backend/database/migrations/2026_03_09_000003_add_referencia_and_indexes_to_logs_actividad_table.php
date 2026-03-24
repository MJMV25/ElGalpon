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
        Schema::table('logs_actividad', function (Blueprint $table) {
            if (!Schema::hasColumn('logs_actividad', 'referencia')) {
                $table->string('referencia', 150)->nullable()->after('modelo_id');
                $table->index('referencia');
            }

            $table->index(['modulo', 'created_at'], 'logs_modulo_created_idx');
            $table->index(['accion', 'created_at'], 'logs_accion_created_idx');
            $table->index(['user_id', 'created_at'], 'logs_user_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('logs_actividad', function (Blueprint $table) {
            if (Schema::hasColumn('logs_actividad', 'referencia')) {
                $table->dropIndex(['referencia']);
                $table->dropColumn('referencia');
            }

            $table->dropIndex('logs_modulo_created_idx');
            $table->dropIndex('logs_accion_created_idx');
            $table->dropIndex('logs_user_created_idx');
        });
    }
};

