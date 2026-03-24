<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\WelcomeUserMail;
use App\Models\LogActividad;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const FIRST_ACCESS_EXPIRATION_HOURS = 48;

    /**
     * Listar todos los usuarios
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

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
        $validated['estado_cuenta'] = 'pendiente';
        $validated['creado_por'] = auth()->id();
        $validated['primer_acceso_token'] = Str::random(80);
        $validated['primer_acceso_expira_en'] = now()->addHours(self::FIRST_ACCESS_EXPIRATION_HOURS);

        $plainPassword = $validated['password'] ?? 'Galpon2026!';
        $validated['password'] = $plainPassword;

        $user = DB::transaction(function () use ($validated) {
            $newUser = User::create($validated);

            LogActividad::registrarAuditoria([
                'accion' => 'crear_usuario',
                'user_id' => auth()->id(),
                'modulo' => 'usuarios',
                'modelo' => 'User',
                'modelo_id' => $newUser->id,
                'referencia' => $newUser->email,
                'datos_nuevos' => [
                    'nombre' => $newUser->nombre,
                    'email' => $newUser->email,
                    'rol' => $newUser->rol,
                    'activo' => $newUser->activo,
                    'estado_cuenta' => $newUser->estado_cuenta,
                    'creado_por' => $newUser->creado_por,
                ],
                'observacion' => 'Creacion de usuario',
            ]);

            return $newUser;
        });

        try {
            Mail::to($user->email)->send(new WelcomeUserMail(
                $user->nombre,
                $user->email,
                $user->rol,
                $plainPassword,
                $this->buildFirstAccessUrl($user->email, $user->primer_acceso_token),
                optional($user->primer_acceso_expira_en)->format('Y-m-d H:i:s')
            ));
        } catch (\Throwable $e) {
            \Log::error('Error enviando email de bienvenida: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente',
            'data' => $user,
        ], 201);
    }

    /**
     * Mostrar un usuario especifico
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

        $authUser = $request->user();
        $isSelfUpdate = $authUser && $authUser->id === $user->id;

        if ($isSelfUpdate && array_key_exists('rol', $validated) && $user->rol === 'admin' && $validated['rol'] !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'No puedes quitarte tu propio rol de administrador',
            ], 422);
        }

        if ($isSelfUpdate && array_key_exists('activo', $validated) && $validated['activo'] === false) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes desactivar tu propia cuenta',
            ], 422);
        }

        $willDemoteAdmin = $user->rol === 'admin'
            && array_key_exists('rol', $validated)
            && $validated['rol'] !== 'admin';

        $willDeactivateAdmin = $user->rol === 'admin'
            && $user->activo
            && array_key_exists('activo', $validated)
            && $validated['activo'] === false;

        if (($willDemoteAdmin || $willDeactivateAdmin) && $this->isLastActiveAdmin($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes dejar el sistema sin administradores activos',
            ], 422);
        }

        $datosAnteriores = [
            'nombre' => $user->nombre,
            'email' => $user->email,
            'rol' => $user->rol,
            'activo' => $user->activo,
            'estado_cuenta' => $user->estado_cuenta,
        ];

        $rolAnterior = $user->rol;

        if (array_key_exists('activo', $validated)) {
            $validated['estado_cuenta'] = $validated['activo']
                ? ($user->primer_acceso_completado_en ? 'activo' : 'pendiente')
                : 'suspendido';
        }

        DB::transaction(function () use ($user, $validated, $datosAnteriores, $rolAnterior) {
            $user->update($validated);

            $datosNuevos = [
                'nombre' => $user->nombre,
                'email' => $user->email,
                'rol' => $user->rol,
                'activo' => $user->activo,
                'estado_cuenta' => $user->estado_cuenta,
            ];

            LogActividad::registrarAuditoria([
                'accion' => 'actualizar_usuario',
                'user_id' => auth()->id(),
                'modulo' => 'usuarios',
                'modelo' => 'User',
                'modelo_id' => $user->id,
                'referencia' => $user->email,
                'datos_anteriores' => $datosAnteriores,
                'datos_nuevos' => $datosNuevos,
                'observacion' => 'Actualizacion de datos de usuario',
            ]);

            if ($rolAnterior !== $user->rol) {
                LogActividad::registrarAuditoria([
                    'accion' => 'cambio_rol_usuario',
                    'user_id' => auth()->id(),
                    'modulo' => 'usuarios',
                    'modelo' => 'User',
                    'modelo_id' => $user->id,
                    'referencia' => $user->email,
                    'datos_anteriores' => ['rol' => $rolAnterior],
                    'datos_nuevos' => ['rol' => $user->rol],
                    'observacion' => 'Cambio de rol/permisos del usuario',
                ]);
            }

            if (array_key_exists('password', $validated)) {
                LogActividad::registrarAuditoria([
                    'accion' => 'cambiar_password_usuario',
                    'user_id' => auth()->id(),
                    'modulo' => 'usuarios',
                    'modelo' => 'User',
                    'modelo_id' => $user->id,
                    'referencia' => $user->email,
                    'observacion' => 'Cambio de credenciales de usuario',
                ]);
            }
        });

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
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propia cuenta',
            ], 400);
        }

        if ($user->rol === 'admin' && $this->isLastAdmin($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar el ultimo administrador del sistema',
            ], 422);
        }

        $datosAnteriores = [
            'nombre' => $user->nombre,
            'email' => $user->email,
            'rol' => $user->rol,
            'activo' => $user->activo,
            'estado_cuenta' => $user->estado_cuenta,
        ];

        $userId = $user->id;
        $userEmail = $user->email;

        DB::transaction(function () use ($user, $userId, $userEmail, $datosAnteriores) {
            $user->delete();

            LogActividad::registrarAuditoria([
                'accion' => 'eliminar_usuario',
                'user_id' => auth()->id(),
                'modulo' => 'usuarios',
                'modelo' => 'User',
                'modelo_id' => $userId,
                'referencia' => $userEmail,
                'datos_anteriores' => $datosAnteriores,
                'observacion' => 'Accion sensible: eliminacion de usuario',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado exitosamente',
            'usuarios_restantes' => User::count(),
        ]);
    }

    /**
     * Activar/Desactivar usuario
     */
    public function toggleActivo(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes desactivar tu propia cuenta',
            ], 400);
        }

        $nuevoEstadoActivo = !$user->activo;

        if ($user->rol === 'admin' && $user->activo && !$nuevoEstadoActivo && $this->isLastActiveAdmin($user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes desactivar el ultimo administrador activo',
            ], 422);
        }

        $estadoCuenta = $nuevoEstadoActivo
            ? ($user->primer_acceso_completado_en ? 'activo' : 'pendiente')
            : 'suspendido';

        DB::transaction(function () use ($user, $nuevoEstadoActivo, $estadoCuenta) {
            $user->update([
                'activo' => $nuevoEstadoActivo,
                'estado_cuenta' => $estadoCuenta,
            ]);

            if (!$user->activo) {
                $user->tokens()->delete();
            }

            LogActividad::registrarAuditoria([
                'accion' => $user->activo ? 'activar_usuario' : 'desactivar_usuario',
                'user_id' => auth()->id(),
                'modulo' => 'usuarios',
                'modelo' => 'User',
                'modelo_id' => $user->id,
                'referencia' => $user->email,
                'datos_nuevos' => [
                    'activo' => $user->activo,
                    'estado_cuenta' => $user->estado_cuenta,
                ],
                'observacion' => $user->activo
                    ? 'Reactivacion de cuenta'
                    : 'Accion sensible: desactivacion de cuenta',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => $user->activo ? 'Usuario activado' : 'Usuario desactivado',
            'data' => $user,
        ]);
    }

    private function isLastAdmin(int $excludeUserId): bool
    {
        return User::where('rol', 'admin')
            ->where('id', '!=', $excludeUserId)
            ->count() === 0;
    }

    private function isLastActiveAdmin(int $excludeUserId): bool
    {
        return User::where('rol', 'admin')
            ->where('activo', true)
            ->where('id', '!=', $excludeUserId)
            ->count() === 0;
    }

    private function buildFirstAccessUrl(string $email, ?string $token): string
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');

        $params = http_build_query([
            'email' => $email,
            'first_access_token' => $token,
        ]);

        return "{$frontendUrl}/login?{$params}";
    }
}
