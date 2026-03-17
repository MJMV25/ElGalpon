<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CategoriaController extends Controller
{
    /**
     * Listar todas las categorías con sus subcategorías
     */
    public function index(Request $request): JsonResponse
    {
        $includeMetrics = $request->boolean('include_metrics', false);
        $query = Categoria::query()
            ->select([
                'categorias.id',
                'categorias.nombre',
                'categorias.slug',
                'categorias.descripcion',
                'categorias.icono',
                'categorias.color',
                'categorias.activo',
                'categorias.created_at',
                'categorias.updated_at',
            ])
            ->with(['subcategorias' => function ($subquery) {
                $subquery->select([
                    'id',
                    'categoria_id',
                    'nombre',
                    'slug',
                    'descripcion',
                    'activo',
                    'created_at',
                    'updated_at',
                ])->orderBy('nombre');
            }])
            ->withCount('productos');

        if ($includeMetrics) {
            $metricasProductos = DB::table('productos')
                ->select('categoria_id')
                ->selectRaw('COUNT(*) as total_productos')
                ->selectRaw('COALESCE(SUM(stock), 0) as total_stock')
                ->selectRaw('COALESCE(SUM(stock * precio_compra), 0) as valor_inventario')
                ->where('activo', true)
                ->groupBy('categoria_id');

            $query->leftJoinSub($metricasProductos, 'metricas_productos', function ($join) {
                $join->on('categorias.id', '=', 'metricas_productos.categoria_id');
            })->addSelect([
                DB::raw('COALESCE(metricas_productos.total_productos, 0) as total_productos'),
                DB::raw('COALESCE(metricas_productos.total_stock, 0) as total_stock'),
                DB::raw('COALESCE(metricas_productos.valor_inventario, 0) as valor_inventario'),
            ]);
        }

        if ($request->has('activo')) {
            $query->where('categorias.activo', $request->boolean('activo'));
        } elseif (!$request->boolean('include_inactive', false)) {
            $query->where('categorias.activo', true);
        }

        $categorias = $query->orderBy('nombre')->get();

        return response()->json([
            'success' => true,
            'data' => $categorias,
        ]);
    }

    /**
     * Crear una nueva categoría
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:categorias,slug',
            'icono' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'descripcion' => 'nullable|string',
        ]);

        $categoria = Categoria::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Categoría creada exitosamente',
            'data' => $categoria,
        ], 201);
    }

    /**
     * Mostrar una categoría específica
     */
    public function show(Categoria $categoria): JsonResponse
    {
        $categoria->load('subcategorias', 'productos');

        return response()->json([
            'success' => true,
            'data' => $categoria,
        ]);
    }

    /**
     * Actualizar una categoría
     */
    public function update(Request $request, Categoria $categoria): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'icono' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'descripcion' => 'nullable|string',
            'activo' => 'sometimes|boolean',
        ]);

        $categoria->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Categoría actualizada exitosamente',
            'data' => $categoria->fresh(),
        ]);
    }

    /**
     * Eliminar una categoría
     */
    public function destroy(Categoria $categoria): JsonResponse
    {
        // Verificar si tiene productos asociados
        if ($categoria->productos()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la categoría porque tiene productos asociados',
            ], 400);
        }

        $categoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'Categoría eliminada exitosamente',
        ]);
    }

    /**
     * Listar subcategorías de una categoría
     */
    public function subcategorias(Categoria $categoria): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $categoria->subcategorias,
        ]);
    }

    /**
     * Crear subcategoría en una categoría
     */
    public function storeSubcategoria(Request $request, Categoria $categoria): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
        ]);

        $subcategoria = $categoria->subcategorias()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Subcategoría creada exitosamente',
            'data' => $subcategoria,
        ], 201);
    }
}
