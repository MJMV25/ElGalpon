@echo off
REM Script para detener El Galpón con Docker
echo.
echo ========================================
echo   EL GALPON - DETENER DOCKER
echo ========================================
echo.

echo Deteniendo contenedores Docker...
echo.

docker-compose down

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   CONTENEDORES DETENIDOS
    echo ========================================
    echo.
    echo Los datos se han guardado en volumenes Docker
    echo.
    echo Para iniciar de nuevo:
    echo   INICIAR_DOCKER.bat
    echo   o
    echo   docker-compose up -d
    echo.
) else (
    echo.
    echo ERROR: No se pudo detener Docker
    echo.
)

pause

