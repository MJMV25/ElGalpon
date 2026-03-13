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
            if (!Schema::hasColumn('logs_actividad', 'modulo')) {
                $table->string('modulo', 80)->nullable()->after('accion');
                $table->index('modulo');
            }

            if (!Schema::hasColumn('logs_actividad', 'observacion')) {
                $table->text('observacion')->nullable()->after('datos_nuevos');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('logs_actividad', function (Blueprint $table) {
            if (Schema::hasColumn('logs_actividad', 'modulo')) {
                $table->dropIndex(['modulo']);
                $table->dropColumn('modulo');
            }

            if (Schema::hasColumn('logs_actividad', 'observacion')) {
                $table->dropColumn('observacion');
            }
        });
    }
};
