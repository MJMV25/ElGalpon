<?php

namespace App\Console\Commands;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Subcategoria;
use App\Support\ClasificadorCategoriaProducto;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ReclasificarProductosCommand extends Command
{
    protected $signature = 'productos:reclasificar {--solo-importados=1 : Solo reclasificar productos en categoria importados-siigo}';
    protected $description = 'Reclasifica productos según su nombre para mantener categorías coherentes';

    public function handle(): int
    {
        $categorias = $this->obtenerCategoriasBase();
        $soloImportados = (bool) $this->option('solo-importados');

        $query = Producto::query()->with(['categoria', 'subcategoria']);
        if ($soloImportados) {
            $query->whereHas('categoria', function ($q) {
                $q->where('slug', 'importados-siigo');
            });
        }

        $productos = $query->get();
        if ($productos->isEmpty()) {
            $this->info('No hay productos para reclasificar.');
            return self::SUCCESS;
        }

        $actualizados = 0;
        foreach ($productos as $producto) {
            [$categoria, $subcategoriaNombre] = ClasificadorCategoriaProducto::resolver($producto->nombre, $categorias);
            $subcategoria = Subcategoria::firstOrCreate(
                [
                    'categoria_id' => $categoria->id,
                    'slug' => Str::slug($subcategoriaNombre),
                ],
                [
                    'nombre' => $subcategoriaNombre,
                    'activo' => true,
                ]
            );

            $cambioCategoria = $producto->categoria_id !== $categoria->id;
            $cambioSubcategoria = $producto->subcategoria_id !== $subcategoria->id;
            if ($cambioCategoria || $cambioSubcategoria) {
                $producto->update([
                    'categoria_id' => $categoria->id,
                    'subcategoria_id' => $subcategoria->id,
                ]);
                $actualizados++;
            }
        }

        $this->info("Productos revisados: {$productos->count()}");
        $this->info("Productos reclasificados: {$actualizados}");

        return self::SUCCESS;
    }

    private function obtenerCategoriasBase(): array
    {
        $definiciones = [
            'alimentos' => ['nombre' => 'Alimentos para Mascotas', 'icono' => 'fa-bone', 'color' => '#3B82F6'],
            'medicamentos' => ['nombre' => 'Medicamentos Veterinarios', 'icono' => 'fa-pills', 'color' => '#F59E0B'],
            'suplementos' => ['nombre' => 'Suplementos Animales', 'icono' => 'fa-capsules', 'color' => '#EC4899'],
            'insumos' => ['nombre' => 'Insumos Agrícolas', 'icono' => 'fa-tractor', 'color' => '#10B981'],
            'accesorios' => ['nombre' => 'Accesorios para Mascotas', 'icono' => 'fa-paw', 'color' => '#8B5CF6'],
        ];

        $categorias = [];
        foreach ($definiciones as $slug => $data) {
            $categorias[$slug] = Categoria::firstOrCreate(
                ['slug' => $slug],
                [
                    'nombre' => $data['nombre'],
                    'icono' => $data['icono'],
                    'color' => $data['color'],
                    'activo' => true,
                ]
            );
        }

        return $categorias;
    }

}
