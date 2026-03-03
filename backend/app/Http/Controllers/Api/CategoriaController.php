<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategoriaController extends Controller
{
    /**
     * Listar todas las categorías con sus subcategorías
     */
    public function index(Request $request): JsonResponse
    {
        $query = Categoria::with('subcategorias');

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        } elseif (!$request->boolean('include_inactive', false)) {
            $query->where('activo', true);
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
