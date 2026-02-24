<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use App\Models\LogActividad;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProveedorController extends Controller
{
    /**
     * Listar todos los proveedores
     */
    public function index(Request $request): JsonResponse
    {
        $query = Proveedor::query();

        // Filtros
        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }


        if ($request->has('buscar')) {
            $termino = $request->buscar;
            $query->where(function ($q) use ($termino) {
                $q->where('nombre_empresa', 'like', "%{$termino}%")
                  ->orWhere('nit', 'like', "%{$termino}%")
                  ->orWhere('email_administrativo', 'like', "%{$termino}%")
                  ->orWhere('email_comercial', 'like', "%{$termino}%")
                  ->orWhere('telefono_administrativo', 'like', "%{$termino}%")
                  ->orWhere('telefono_contacto', 'like', "%{$termino}%")
                  ->orWhere('nombre_asesor', 'like', "%{$termino}%");
            });
        }

        $orderBy = $request->get('order_by', 'nombre_empresa');
        $orderDir = $request->get('order_dir', 'asc');
        $query->orderBy($orderBy, $orderDir);

        // Si no se pide paginación explícita, devolver todos
        if ($request->has('per_page') && $request->per_page !== 'all') {
            $proveedores = $query->paginate($request->get('per_page', 15));
            return response()->json([
                'success' => true,
                'data' => $proveedores,
            ]);
        }

        // Devolver todos los proveedores sin paginar
        $proveedores = $query->get();
        return response()->json([
            'success' => true,
            'data' => $proveedores,
        ]);
    }

    /**
     * Crear un nuevo proveedor
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre_empresa' => 'required|string|max:255',
            'nit' => 'required|string|max:50',
            'linea_producto' => 'required|string|max:255',
            'ciudad' => 'required|string|max:100',
            'direccion' => 'required|string|max:255',
            'email_administrativo' => 'required|email|max:255',
            'telefono_administrativo' => 'required|string|max:50',
            'nombre_asesor' => 'required|string|max:255',
            'cargo_asesor' => 'required|string|max:100',
            'telefono_contacto' => 'required|string|max:50',
            'email_comercial' => 'required|email|max:255',
            'notas' => 'nullable|string',
        ]);

        $proveedor = Proveedor::create($validated);

        // Registrar actividad
        LogActividad::registrar(
            'crear_proveedor',
            auth()->id(),
            'Proveedor',
            $proveedor->id,
            null,
            $proveedor->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Proveedor creado exitosamente',
            'data' => $proveedor,
        ], 201);
    }

    /**
     * Mostrar un proveedor específico
     */
    public function show(Proveedor $proveedor): JsonResponse
    {
        $proveedor->load(['productos' => function ($q) {
            $q->activos()->limit(10);
        }]);

        return response()->json([
            'success' => true,
            'data' => $proveedor,
        ]);
    }

    /**
     * Actualizar un proveedor
     */
    public function update(Request $request, Proveedor $proveedor): JsonResponse
    {
        $validated = $request->validate([
            'nombre_empresa' => 'sometimes|required|string|max:255',
            'nit' => 'sometimes|required|string|max:50',
            'linea_producto' => 'sometimes|required|string|max:255',
            'ciudad' => 'sometimes|required|string|max:100',
            'direccion' => 'sometimes|required|string|max:255',
            'email_administrativo' => 'sometimes|required|email|max:255',
            'telefono_administrativo' => 'sometimes|required|string|max:50',
            'nombre_asesor' => 'sometimes|required|string|max:255',
            'cargo_asesor' => 'sometimes|required|string|max:100',
            'telefono_contacto' => 'sometimes|required|string|max:50',
            'email_comercial' => 'sometimes|required|email|max:255',
            'notas' => 'nullable|string',
            'calificacion' => 'sometimes|numeric|min:0|max:5',
            'activo' => 'sometimes|boolean',
        ]);

        $datosAnteriores = $proveedor->toArray();
        $proveedor->update($validated);

        // Registrar actividad
        LogActividad::registrar(
            'actualizar_proveedor',
            auth()->id(),
            'Proveedor',
            $proveedor->id,
            $datosAnteriores,
            $proveedor->fresh()->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Proveedor actualizado exitosamente',
            'data' => $proveedor->fresh(),
        ]);
    }

    /**
     * Eliminar un proveedor
     */
    public function destroy(Proveedor $proveedor): JsonResponse
    {

        // Verificar si tiene productos asociados
        if ($proveedor->productos()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el proveedor porque tiene productos asociados',
            ], 400);
        }

        $datosAnteriores = $proveedor->toArray();
        $proveedor->delete();

        // Registrar actividad
        LogActividad::registrar(
            'eliminar_proveedor',
            auth()->id(),
            'Proveedor',
            $proveedor->id,
            $datosAnteriores,
            null
        );

        return response()->json([
            'success' => true,
            'message' => 'Proveedor eliminado exitosamente',
        ]);
    }
}

