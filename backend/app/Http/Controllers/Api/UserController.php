<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LogActividad;
use App\Mail\WelcomeUserMail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Listar todos los usuarios
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Filtros
        if ($request->has('rol')) {
            $query->where('rol', $request->rol);
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }

        if ($request->has('buscar')) {
            $termino = $request->buscar;
            $query->where(function ($q) use ($termino) {
                $q->where('nombre', 'like', "%{$termino}%")
                  ->orWhere('email', 'like', "%{$termino}%");
            });
        }

        $usuarios = $query->orderBy('nombre')->paginate($request->get('per_page', 15));

        \Log::info("GET /usuarios - Total usuarios en BD: " . User::count() . " - Devolviendo: " . $usuarios->total());

        return response()->json([
            'success' => true,
            'data' => $usuarios,
        ]);
    }

    /**
     * Crear un nuevo usuario
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'rol' => 'required|in:admin,empleado',
            'password' => 'nullable|string|min:8',
        ]);

        $validated['email'] = strtolower($validated['email']);
        $validated['activo'] = true;
        $plainPassword = $validated['password'] ?? 'Galpon2026!';
        $validated['password'] = $plainPassword;

        $user = User::create($validated);

        // Registrar actividad
        LogActividad::registrar(
            'crear_usuario',
            auth()->id(),
            'User',
            $user->id,
            null,
            $user->toArray()
        );

        // Enviar email de bienvenida
        try {
            Mail::to($user->email)->send(new WelcomeUserMail(
                $user->nombre,
                $user->email,
                $user->rol,
                $plainPassword
            ));
        } catch (\Exception $e) {
            // Log error pero no fallar la creación
            \Log::error('Error enviando email de bienvenida: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente',
            'data' => $user,
        ], 201);
    }

    /**
     * Mostrar un usuario específico
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    /**
     * Actualizar un usuario
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'rol' => 'sometimes|required|in:admin,empleado',
            'activo' => 'sometimes|boolean',
            'password' => 'sometimes|required|string|min:8',
        ]);

        if (isset($validated['email'])) {
            $validated['email'] = strtolower($validated['email']);
        }

        $datosAnteriores = $user->toArray();
        $user->update($validated);

        // Registrar actividad
        LogActividad::registrar(
            'actualizar_usuario',
            auth()->id(),
            'User',
            $user->id,
            $datosAnteriores,
            $user->fresh()->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * Eliminar un usuario
     */
    public function destroy(User $user): JsonResponse
    {
        \Log::info("DESTROY llamado. User recibido:", [
            'user_exists' => isset($user),
            'user_id' => $user->id ?? 'NULL',
            'user_nombre' => $user->nombre ?? 'NULL',
            'request_route_params' => request()->route()->parameters(),
        ]);

        // No permitir eliminar al propio usuario
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propia cuenta',
            ], 400);
        }

        $datosAnteriores = $user->toArray();
        $userName = $user->nombre;
        $userId = $user->id;

        \Log::info("ANTES de delete - Usuario a eliminar:", [
            'id' => $userId,
            'nombre' => $userName,
            'total_usuarios_antes' => User::count(),
        ]);

        $user->delete();

        // Log para debug
        $cantidadUsuarios = User::count();
        \Log::info("DESPUÉS de delete:", [
            'usuario_eliminado' => $userName,
            'id_eliminado' => $userId,
            'usuarios_antes' => $datosAnteriores ? count((array)$datosAnteriores) : 'N/A',
            'usuarios_restantes' => $cantidadUsuarios,
        ]);

        // Registrar actividad
        LogActividad::registrar(
            'eliminar_usuario',
            auth()->id(),
            'User',
            $userId,
            $datosAnteriores,
            null
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado exitosamente',
            'usuarios_restantes' => $cantidadUsuarios, // Para debug
        ]);
    }

    /**
     * Activar/Desactivar usuario
     */
    public function toggleActivo(User $user): JsonResponse
    {
        // No permitir desactivar al propio usuario
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes desactivar tu propia cuenta',
            ], 400);
        }

        $user->update(['activo' => !$user->activo]);

        // Si se desactiva, revocar todos los tokens
        if (!$user->activo) {
            $user->tokens()->delete();
        }

        // Registrar actividad
        LogActividad::registrar(
            $user->activo ? 'activar_usuario' : 'desactivar_usuario',
            auth()->id(),
            'User',
            $user->id
        );

        return response()->json([
            'success' => true,
            'message' => $user->activo ? 'Usuario activado' : 'Usuario desactivado',
            'data' => $user,
        ]);
    }
}
