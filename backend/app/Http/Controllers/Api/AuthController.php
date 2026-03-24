<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VerificationCodeMail;
use App\Models\LogActividad;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Paso 1: validar email + password y enviar codigo OTP al correo.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower($request->email);
        $password = $request->password;
        $mostrarCodigoEnRespuesta = (bool) env('AUTH_EXPOSE_OTP', false)
            || app()->environment('local')
            || config('app.debug');

        $key = 'password-login-attempt:' . $email;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => "Demasiados intentos. Por favor espera {$seconds} segundos.",
            ], 429);
        }

        RateLimiter::hit($key, 60);

        $user = User::query()
            ->select(['id', 'nombre', 'email', 'password', 'rol', 'activo', 'estado_cuenta'])
            ->where('email', $email)
            ->first();

        if (!$user || !$user->password || !Hash::check($password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales invalidas',
            ], 401);
        }

        if (!$user->activo || $user->estado_cuenta === 'suspendido') {
            return response()->json([
                'success' => false,
                'message' => 'Tu cuenta esta desactivada. Contacta al administrador.',
            ], 401);
        }

        VerificationCode::where('email', $email)
            ->where('usado', false)
            ->update(['usado' => true]);

        $codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        VerificationCode::create([
            'email' => $email,
            'codigo' => $codigo,
            'expira_en' => now()->addMinutes(10),
        ]);

        $challengeToken = Str::random(64);
        Cache::put('login-challenge:' . $challengeToken, [
            'user_id' => $user->id,
            'email' => $email,
        ], now()->addMinutes(10));

        if (!$mostrarCodigoEnRespuesta) {
            try {
                dispatch(function () use ($email, $codigo, $user) {
                    Mail::to($email)->send(new VerificationCodeMail($codigo, $user->nombre));
                })->afterResponse();
            } catch (\Throwable $e) {
                Cache::forget('login-challenge:' . $challengeToken);
                \Log::warning('Error al enviar email: ' . $e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar el correo. Intenta de nuevo.',
                ], 500);
            }
        }

        RateLimiter::clear($key);

        $mensaje = 'Codigo enviado al correo. Verifica para completar el acceso.';
        if ($mostrarCodigoEnRespuesta) {
            $mensaje = 'Codigo generado correctamente. Verifica para completar el acceso.';
        }

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => [
                'challenge_token' => $challengeToken,
                'email' => $email,
                'otp_preview' => $mostrarCodigoEnRespuesta ? $codigo : null,
            ],
        ]);
    }

    /**
     * Endpoint antiguo deshabilitado para evitar bypass sin password.
     */
    public function solicitarCodigo(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Este endpoint fue deshabilitado. Usa /auth/login.',
        ], 410);
    }

    /**
     * Paso 2: verificar codigo OTP usando challenge_token y entregar token de sesion.
     */
    public function verificarCodigo(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => 'required|string',
            'codigo' => 'required|string|size:6',
        ]);

        $challengeToken = $request->challenge_token;
        $codigo = $request->codigo;

        $verifyKey = 'otp-verify-attempt:' . $challengeToken;
        if (RateLimiter::tooManyAttempts($verifyKey, 5)) {
            $seconds = RateLimiter::availableIn($verifyKey);
            return response()->json([
                'success' => false,
                'message' => "Demasiados intentos. Espera {$seconds} segundos.",
            ], 429);
        }
        RateLimiter::hit($verifyKey, 60);

        $challenge = Cache::get('login-challenge:' . $challengeToken);

        if (!$challenge || !isset($challenge['user_id'], $challenge['email'])) {
            return response()->json([
                'success' => false,
                'message' => 'Sesion de verificacion invalida o expirada.',
            ], 401);
        }

        $email = $challenge['email'];
        $user = User::query()
            ->select([
                'id',
                'nombre',
                'email',
                'rol',
                'activo',
                'estado_cuenta',
                'ultimo_acceso',
                'created_at',
                'updated_at',
                'primer_acceso_completado_en',
            ])
            ->find($challenge['user_id']);

        if (!$user || !$user->activo || strtolower($user->email) !== strtolower($email)) {
            Cache::forget('login-challenge:' . $challengeToken);
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autorizado',
            ], 401);
        }

        $verificationCode = VerificationCode::validos($email, $codigo)->first();

        if (!$verificationCode) {
            return response()->json([
                'success' => false,
                'message' => 'Codigo invalido o expirado',
            ], 401);
        }

        $verificationCode->marcarComoUsado();
        Cache::forget('login-challenge:' . $challengeToken);
        RateLimiter::clear($verifyKey);

        $user->update([
            'ultimo_acceso' => now(),
            'ip_ultimo_acceso' => $request->ip(),
            'estado_cuenta' => $user->activo ? 'activo' : 'suspendido',
            'primer_acceso_completado_en' => $user->primer_acceso_completado_en ?? now(),
            'primer_acceso_token' => null,
            'primer_acceso_expira_en' => null,
        ]);

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        LogActividad::registrarAuditoria([
            'accion' => 'login',
            'user_id' => $user->id,
            'modulo' => 'seguridad',
            'modelo' => 'User',
            'modelo_id' => $user->id,
            'referencia' => $user->email,
            'datos_nuevos' => [
                'ultimo_acceso' => optional($user->ultimo_acceso)->toDateTimeString(),
                'ip_ultimo_acceso' => $user->ip_ultimo_acceso,
            ],
            'observacion' => 'Inicio de sesion exitoso',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inicio de sesion exitoso',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nombre' => $user->nombre,
                    'email' => $user->email,
                    'rol' => $user->rol,
                    'activo' => $user->activo,
                    'ultimo_acceso' => $user->ultimo_acceso,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
                'token' => $token,
                'token_type' => 'Bearer',
                'abilities' => $user->rol === 'admin' ? ['*'] : ['read'],
            ],
        ]);
    }

    /**
     * Obtener usuario actual
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nombre' => $user->nombre,
                    'email' => $user->email,
                    'rol' => $user->rol,
                    'activo' => $user->activo,
                    'ultimo_acceso' => $user->ultimo_acceso,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ],
                'abilities' => $user->rol === 'admin' ? ['*'] : ['read'],
            ],
        ]);
    }

    /**
     * Cerrar sesion
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        LogActividad::registrarAuditoria([
            'accion' => 'logout',
            'user_id' => $user->id,
            'modulo' => 'seguridad',
            'modelo' => 'User',
            'modelo_id' => $user->id,
            'referencia' => $user->email,
            'observacion' => 'Cierre de sesion',
        ]);

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesion cerrada correctamente',
        ]);
    }

    /**
     * Cerrar todas las sesiones
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();

        LogActividad::registrarAuditoria([
            'accion' => 'logout_all',
            'user_id' => $user->id,
            'modulo' => 'seguridad',
            'modelo' => 'User',
            'modelo_id' => $user->id,
            'referencia' => $user->email,
            'observacion' => 'Accion sensible: cierre de todas las sesiones',
        ]);

        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Todas las sesiones han sido cerradas',
        ]);
    }
}
