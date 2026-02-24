@echo off
REM Script para iniciar El Galpón con Docker
echo.
echo ========================================
echo   EL GALPON - INICIO CON DOCKER
echo ========================================
echo.

REM Detectar ruta de Docker
set DOCKER_CMD=docker-compose
set DOCKER_PATH=C:\Program Files\Docker\Docker\resources\bin

REM Verificar si docker-compose esta en PATH
where docker-compose >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Usando ruta completa de Docker...
    set DOCKER_CMD="%DOCKER_PATH%\docker-compose.exe"
)

echo Iniciando contenedores Docker...
echo.

%DOCKER_CMD% up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   INICIO EXITOSO
    echo ========================================
    echo.
    echo Frontend:  http://localhost:8080
    echo Backend:   http://localhost:8000/api
    echo MySQL:     localhost:3306
    echo.
    echo Para ver los logs en tiempo real:
    echo   docker-compose logs -f
    echo.
    echo Para detener los servicios:
    echo   docker-compose down
    echo.
    echo ========================================
) else (
    echo.
    echo ERROR: No se pudo iniciar Docker
    echo.
    echo Verifica que:
    echo 1. Docker Desktop este corriendo
    echo 2. Los puertos 8000, 8080 y 3306 esten libres
    echo 3. El archivo .env este configurado
    echo.
    echo Ejecuta: .\verificar_docker.ps1
    echo.
)

pause

