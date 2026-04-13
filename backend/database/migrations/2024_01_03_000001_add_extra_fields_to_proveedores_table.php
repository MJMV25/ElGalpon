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
        Schema::table('proveedores', function (Blueprint $table) {
            // Renombrar columna nombre a nombre_empresa
            $table->renameColumn('nombre', 'nombre_empresa');

            // Agregar nuevos campos sin depender del orden fisico de columnas.
            $table->string('nit')->nullable();
            $table->string('linea_producto')->nullable(); // categoria

            // Renombrar email a email_administrativo y telefono a telefono_administrativo
            $table->renameColumn('email', 'email_administrativo');
            $table->renameColumn('telefono', 'telefono_administrativo');

            // Campos del asesor comercial
            $table->string('nombre_asesor')->nullable();
            $table->string('cargo_asesor')->nullable();
            $table->string('telefono_contacto')->nullable();
            $table->string('email_comercial')->nullable();

            // contacto_nombre se elimina porque ahora se usa nombre_asesor
            $table->dropColumn('contacto_nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            $table->renameColumn('nombre_empresa', 'nombre');
            $table->dropColumn([
                'nit',
                'linea_producto',
                'nombre_asesor',
                'cargo_asesor',
                'telefono_contacto',
                'email_comercial',
            ]);
            $table->renameColumn('email_administrativo', 'email');
            $table->renameColumn('telefono_administrativo', 'telefono');
            $table->string('contacto_nombre')->nullable();
        });
    }
};
