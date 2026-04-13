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
        Schema::table('cotizacion_proveedores', function (Blueprint $table) {
            $table->string('token', 64)->unique()->nullable();
            $table->timestamp('token_expira_en')->nullable();

            $table->index('token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cotizacion_proveedores', function (Blueprint $table) {
            $table->dropIndex(['token']);
            $table->dropColumn(['token', 'token_expira_en']);
        });
    }
};
