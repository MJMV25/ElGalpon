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

            // Agregar nuevos campos
            $table->string('nit')->nullable()->after('nombre_empresa');
            $table->string('linea_producto')->nullable()->after('nit'); // categoría

            // Ciudad y dirección ya existen, solo ajustaremos el orden conceptualmente

            // Renombrar email a email_administrativo y telefono a telefono_administrativo
            $table->renameColumn('email', 'email_administrativo');
            $table->renameColumn('telefono', 'telefono_administrativo');

            // Campos del asesor comercial
            $table->string('nombre_asesor')->nullable()->after('telefono_administrativo');
            $table->string('cargo_asesor')->nullable()->after('nombre_asesor');
            $table->string('telefono_contacto')->nullable()->after('cargo_asesor');
            $table->string('email_comercial')->nullable()->after('telefono_contacto');

            // contacto_nombre se eliminará ya que ahora usamos nombre_asesor
            $table->dropColumn('contacto_nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proveedores', function (Blueprint $table) {
            // Revertir cambios
            $table->renameColumn('nombre_empresa', 'nombre');
            $table->dropColumn([
                'nit',
                'linea_producto',
                'nombre_asesor',
                'cargo_asesor',
                'telefono_contacto',
                'email_comercial'
            ]);
            $table->renameColumn('email_administrativo', 'email');
            $table->renameColumn('telefono_administrativo', 'telefono');
            $table->string('contacto_nombre')->nullable();
        });
    }
};

