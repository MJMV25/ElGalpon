<?php

namespace Database\Seeders;

use App\Models\Proveedor;
use Illuminate\Database\Seeder;

class ProveedorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $proveedores = [
            [
                'nombre_empresa' => 'Purina Colombia S.A.',
                'nit' => '860123456-1',
                'linea_producto' => 'Alimentos para Mascotas',
                'ciudad' => 'Bogotá',
                'direccion' => 'Zona Industrial Calle 26 # 68-40',
                'email_administrativo' => 'ventas@purina.com.co',
                'telefono_administrativo' => '+57 310 123 4567',
                'nombre_asesor' => 'Juan Pérez Gómez',
                'cargo_asesor' => 'Asesor Comercial Senior',
                'telefono_contacto' => '+57 310 123 4568',
                'email_comercial' => 'juan.perez@purina.com.co',
                'calificacion' => 4.8,
            ],
            [
                'nombre_empresa' => 'Mars Colombia Ltda.',
                'nit' => '860234567-2',
                'linea_producto' => 'Alimentos para Mascotas',
                'ciudad' => 'Medellín',
                'direccion' => 'Centro Empresarial Carrera 43A # 1-50',
                'email_administrativo' => 'pedidos@mars.com.co',
                'telefono_administrativo' => '+57 315 987 6543',
                'nombre_asesor' => 'María García López',
                'cargo_asesor' => 'Ejecutiva de Cuentas',
                'telefono_contacto' => '+57 315 987 6544',
                'email_comercial' => 'maria.garcia@mars.com.co',
                'calificacion' => 4.5,
            ],
            [
                'nombre_empresa' => 'Bayer Animal Health Colombia',
                'nit' => '860345678-3',
                'linea_producto' => 'Medicamentos Veterinarios',
                'ciudad' => 'Cali',
                'direccion' => 'Parque Industrial Carrera 100 # 25-30',
                'email_administrativo' => 'colombia@bayer.com',
                'telefono_administrativo' => '+57 320 456 7890',
                'nombre_asesor' => 'Carlos López Martínez',
                'cargo_asesor' => 'Representante de Ventas',
                'telefono_contacto' => '+57 320 456 7891',
                'email_comercial' => 'carlos.lopez@bayer.com',
                'calificacion' => 4.9,
            ],
            [
                'nombre_empresa' => 'Zoetis Colombia S.A.S.',
                'nit' => '860456789-4',
                'linea_producto' => 'Medicamentos y Vacunas Veterinarias',
                'ciudad' => 'Bogotá',
                'direccion' => 'Torre Empresarial Calle 72 # 10-07',
                'email_administrativo' => 'info@zoetis.com.co',
                'telefono_administrativo' => '+57 318 222 3333',
                'nombre_asesor' => 'Ana Martínez Ruiz',
                'cargo_asesor' => 'Gerente Comercial',
                'telefono_contacto' => '+57 318 222 3334',
                'email_comercial' => 'ana.martinez@zoetis.com.co',
                'calificacion' => 4.7,
            ],
            [
                'nombre_empresa' => 'Italcol S.A.',
                'nit' => '860567890-5',
                'linea_producto' => 'Suplementos y Nutrición Animal',
                'ciudad' => 'Barranquilla',
                'direccion' => 'Zona Franca Vía 40 # 36-135',
                'email_administrativo' => 'ventas@italcol.com',
                'telefono_administrativo' => '+57 312 555 6666',
                'nombre_asesor' => 'Pedro Sánchez Castro',
                'cargo_asesor' => 'Asesor Técnico Comercial',
                'telefono_contacto' => '+57 312 555 6667',
                'email_comercial' => 'pedro.sanchez@italcol.com',
                'calificacion' => 4.3,
            ],
            [
                'nombre_empresa' => 'Syngenta Agro S.A.',
                'nit' => '860678901-6',
                'linea_producto' => 'Insumos Agrícolas',
                'ciudad' => 'Bogotá',
                'direccion' => 'Edificio Corporativo Avenida Suba # 127-35',
                'email_administrativo' => 'agro@syngenta.com',
                'telefono_administrativo' => '+57 314 777 8888',
                'nombre_asesor' => 'Luis Rodríguez Vargas',
                'cargo_asesor' => 'Consultor Agronómico',
                'telefono_contacto' => '+57 314 777 8889',
                'email_comercial' => 'luis.rodriguez@syngenta.com',
                'calificacion' => 4.6,
            ],
        ];

        foreach ($proveedores as $proveedor) {
            Proveedor::updateOrCreate(
                ['email_administrativo' => $proveedor['email_administrativo']],
                $proveedor
            );
        }
    }
}

