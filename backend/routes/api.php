<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\ProveedorController;
use App\Http\Controllers\Api\CotizacionController;
use App\Http\Controllers\Api\CotizacionProveedorPublicController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\NotificacionController;

/*
|--------------------------------------------------------------------------
| API Routes - El Galpón
|--------------------------------------------------------------------------
*/

// Rutas públicas de autenticación
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/solicitar-codigo', [AuthController::class, 'solicitarCodigo']);
    Route::post('/verificar-codigo', [AuthController::class, 'verificarCodigo']);
});

// Rutas públicas para respuesta de proveedores (sin autenticación)
Route::prefix('cotizacion-proveedor')->group(function () {
    Route::get('/{token}', [CotizacionProveedorPublicController::class, 'obtenerCotizacion']);
    Route::get('/{token}/plantilla', [CotizacionProveedorPublicController::class, 'descargarPlantilla']);
    Route::post('/{token}/excel', [CotizacionProveedorPublicController::class, 'subirExcel']);
    Route::post('/{token}/respuesta', [CotizacionProveedorPublicController::class, 'enviarRespuestaWeb']);
});

// Rutas protegidas
Route::middleware('auth:sanctum')->group(function () {

    // Autenticación
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    });

    // Notificaciones (todos los usuarios autenticados)
    Route::prefix('notificaciones')->group(function () {
        Route::get('/', [NotificacionController::class, 'index']);
        Route::get('/no-leidas/count', [NotificacionController::class, 'contarNoLeidas']);
        Route::patch('/{notificacion}/leida', [NotificacionController::class, 'marcarLeida']);
        Route::patch('/marcar-todas-leidas', [NotificacionController::class, 'marcarTodasLeidas']);
        Route::delete('/{notificacion}', [NotificacionController::class, 'destroy']);
        Route::delete('/leidas/all', [NotificacionController::class, 'eliminarLeidas']);
    });

    // Categorías (lectura para todos, escritura solo admin)
    Route::get('/categorias', [CategoriaController::class, 'index']);
    Route::get('/categorias/{categoria}', [CategoriaController::class, 'show']);
    Route::get('/categorias/{categoria}/subcategorias', [CategoriaController::class, 'subcategorias']);

    // Productos (lectura para todos)
    Route::get('/productos', [ProductoController::class, 'index']);
    Route::get('/productos/stock-bajo', [ProductoController::class, 'stockBajo']);
    Route::get('/productos/{producto}', [ProductoController::class, 'show']);
    Route::get('/productos/{producto}/movimientos', [ProductoController::class, 'movimientos']);

    // Proveedores (lectura para todos)
    Route::get('/proveedores', [ProveedorController::class, 'index']);
    Route::get('/proveedores/{proveedor}', [ProveedorController::class, 'show']);

    // Cotizaciones (lectura para todos)
    Route::get('/cotizaciones', [CotizacionController::class, 'index']);
    Route::get('/cotizaciones/{cotizacion}', [CotizacionController::class, 'show']);
    Route::get('/cotizaciones/{cotizacion}/comparar', [CotizacionController::class, 'compararRespuestas']);

    // Reportes (todos los usuarios autenticados)
    Route::prefix('reportes')->group(function () {
        Route::get('/dashboard', [ReporteController::class, 'dashboard']);
        Route::get('/inventario-valorizado', [ReporteController::class, 'inventarioValorizado']);
        Route::get('/movimientos', [ReporteController::class, 'movimientos']);
        Route::get('/productos-por-categoria', [ReporteController::class, 'productosPorCategoria']);
        Route::get('/productos-mas-movidos', [ReporteController::class, 'productosMasMovidos']);
        Route::get('/deudas-proveedores', [ReporteController::class, 'deudasProveedores']);
        Route::get('/stock-alerta', [ReporteController::class, 'stockAlerta']);
    });

    // Rutas solo para administradores
    Route::middleware('role:admin')->group(function () {

        // Gestión de usuarios
        Route::apiResource('usuarios', UserController::class)->parameters(['usuarios' => 'user']);
        Route::patch('/usuarios/{user}/toggle-activo', [UserController::class, 'toggleActivo']);

        // Gestión de categorías
        Route::post('/categorias', [CategoriaController::class, 'store']);
        Route::put('/categorias/{categoria}', [CategoriaController::class, 'update']);
        Route::delete('/categorias/{categoria}', [CategoriaController::class, 'destroy']);
        Route::post('/categorias/{categoria}/subcategorias', [CategoriaController::class, 'storeSubcategoria']);

        // Gestión de productos
        Route::post('/productos', [ProductoController::class, 'store']);
        Route::post('/productos/importar-excel', [ProductoController::class, 'importarExcel']);
        Route::put('/productos/{producto}', [ProductoController::class, 'update']);
        Route::delete('/productos/{producto}', [ProductoController::class, 'destroy']);
        Route::post('/productos/{producto}/entrada', [ProductoController::class, 'entradaStock']);
        Route::post('/productos/{producto}/salida', [ProductoController::class, 'salidaStock']);

        // Gestión de proveedores
        Route::post('/proveedores', [ProveedorController::class, 'store']);
        Route::put('/proveedores/{proveedor}', [ProveedorController::class, 'update']);
        Route::delete('/proveedores/{proveedor}', [ProveedorController::class, 'destroy']);

        // Gestión de cotizaciones
        Route::post('/cotizaciones', [CotizacionController::class, 'store']);
        Route::put('/cotizaciones/{cotizacion}', [CotizacionController::class, 'update']);
        Route::delete('/cotizaciones/{cotizacion}', [CotizacionController::class, 'destroy']);
        Route::post('/cotizaciones/{cotizacion}/enviar', [CotizacionController::class, 'enviar']);
        Route::post('/cotizaciones/{cotizacion}/completar', [CotizacionController::class, 'completar']);
        Route::post('/cotizaciones/{cotizacion}/cancelar', [CotizacionController::class, 'cancelar']);
        Route::post('/cotizacion-proveedores/{cotizacionProveedor}/respuesta', [CotizacionController::class, 'registrarRespuesta']);
    });
});
