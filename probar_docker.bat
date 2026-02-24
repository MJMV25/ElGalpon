@echo off
echo.
echo ========================================
echo   PRUEBA DE DOCKER
echo ========================================
echo.

echo Buscando Docker Desktop...
echo.

REM Intentar con docker en PATH
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker encontrado en PATH
    docker --version
    echo.
    docker-compose --version
    echo.
    goto :continuar
)

REM Intentar con ruta completa
if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
    echo [OK] Docker encontrado en: C:\Program Files\Docker\Docker\
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe" --version
    echo.
    "C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe" --version
    echo.
    goto :continuar
)

echo [ERROR] No se encontro Docker
echo.
echo Por favor:
echo 1. Cierra esta ventana
echo 2. Abre Docker Desktop desde el menu de inicio
echo 3. Espera a que diga "Engine running" (icono verde)
echo 4. Abre una NUEVA terminal
echo 5. Intenta de nuevo
echo.
pause
exit /b 1

:continuar
echo ========================================
echo   VERIFICANDO DOCKER ENGINE
echo ========================================
echo.

docker ps >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker Engine esta corriendo
    echo.
    echo ========================================
    echo   TODO LISTO PARA USAR DOCKER
    echo ========================================
    echo.
    echo Ahora puedes ejecutar:
    echo   INICIAR_DOCKER.bat
    echo.
    echo O manualmente:
    echo   docker-compose up -d
    echo.
) else (
    echo [ERROR] Docker Engine no esta corriendo
    echo.
    echo Por favor:
    echo 1. Abre Docker Desktop desde el menu de inicio
    echo 2. Espera a que diga "Engine running"
    echo 3. Intenta de nuevo
    echo.
)

pause

