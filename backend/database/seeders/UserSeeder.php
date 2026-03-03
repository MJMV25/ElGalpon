<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $usuarios = [
            [
                'nombre' => 'Manuela Gomez',
                'email' => 'manuela.gomez@elgalpon-alcala.com',
                'password' => 'Galpon2026!',
                'rol' => 'admin',
                'activo' => true,
            ],
            [
                'nombre' => 'Carlos Manuel Gomez',
                'email' => 'carlos.gomez@elgalpon-alcala.com',
                'password' => 'Galpon2026!',
                'rol' => 'admin',
                'activo' => true,
            ],
            [
                'nombre' => 'Sebastian Rodriguez',
                'email' => 'sebastian.rodriguez@elgalpon-alcala.com',
                'password' => 'Galpon2026!',
                'rol' => 'empleado',
                'activo' => true,
            ],
            [
                'nombre' => 'MJ Munoz',
                'email' => 'mjmunoz_108@cue.edu.co',
                'password' => 'Galpon2026!',
                'rol' => 'admin',
                'activo' => true,
            ],
            [
                'nombre' => 'S Gomez',
                'email' => 'sgomez_21@cue.edu.co',
                'password' => 'Galpon2026!',
                'rol' => 'admin',
                'activo' => true,
            ],
        ];

        foreach ($usuarios as $usuario) {
            User::firstOrCreate(
                ['email' => $usuario['email']],
                $usuario
            );
        }
    }
}
