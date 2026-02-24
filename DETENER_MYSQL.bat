@echo off
REM Script para detener MySQL de XAMPP y liberar el puerto 3306
echo.
echo ========================================
echo   DETENIENDO MYSQL DE XAMPP
echo ========================================
echo.

REM Detener el servicio MySQL si está corriendo
echo Buscando servicios MySQL...
net stop MySQL 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Servicio MySQL detenido
) else (
    echo [INFO] Servicio MySQL no estaba corriendo o no existe
)

REM Buscar y matar procesos mysqld
echo Buscando procesos mysqld.exe...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Deteniendo procesos mysqld...
    taskkill /F /IM mysqld.exe
    timeout /t 2 /nobreak >nul
    echo [OK] Procesos mysqld detenidos
) else (
    echo [INFO] No se encontraron procesos mysqld corriendo
)

REM Verificar si el puerto 3306 está libre
echo.
echo Verificando puerto 3306...
netstat -ano | findstr :3306 >nul
if %ERRORLEVEL% EQU 0 (
    echo [AVISO] El puerto 3306 todavia esta en uso
    echo.
    echo Procesos usando el puerto 3306:
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3306') do (
        echo PID: %%a
        tasklist /FI "PID eq %%a" | findstr /V "PID"
    )
    echo.
    echo ¿Quieres forzar el cierre de estos procesos? (S/N)
    set /p RESPUESTA=
    if /i "%RESPUESTA%"=="S" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3306') do (
            taskkill /F /PID %%a
        )
        timeout /t 2 /nobreak >nul
    )
) else (
    echo [OK] Puerto 3306 esta libre
)

echo.
echo ========================================
echo   PROCESO COMPLETADO
========================================
echo.
echo Ahora puedes ejecutar: INICIAR_DOCKER.bat
echo.
pause

