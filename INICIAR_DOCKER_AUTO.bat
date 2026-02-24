@echo off
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║        EL GALPON - INICIO AUTOMATICO CON DOCKER             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM 1. DETECTAR SI DOCKER DESKTOP ESTA INSTALADO
REM ============================================================
echo [1/5] Verificando instalacion de Docker...

set DOCKER_PATH=C:\Program Files\Docker\Docker\resources\bin
set DOCKER_EXE=%DOCKER_PATH%\docker.exe
set COMPOSE_EXE=%DOCKER_PATH%\docker-compose.exe

if exist "%DOCKER_EXE%" (
    echo       [OK] Docker Desktop instalado
) else (
    echo       [ERROR] Docker Desktop NO esta instalado
    echo.
    echo       Descarga e instala Docker Desktop desde:
    echo       https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM 2. VERIFICAR SI DOCKER ENGINE ESTA CORRIENDO
REM ============================================================
echo [2/5] Verificando Docker Engine...

"%DOCKER_EXE%" ps >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       [OK] Docker Engine esta corriendo
) else (
    echo       [ERROR] Docker Engine NO esta corriendo
    echo.
    echo       ╔═══════════════════════════════════════════════════╗
    echo       ║  NECESITAS INICIAR DOCKER DESKTOP                 ║
    echo       ╚═══════════════════════════════════════════════════╝
    echo.
    echo       1. Presiona Windows + Busca "Docker Desktop"
    echo       2. Abre Docker Desktop
    echo       3. Espera a ver "Engine running"
    echo       4. Vuelve a ejecutar este script
    echo.
    echo       ¿Quieres que abra Docker Desktop por ti? (S/N)
    set /p RESPUESTA=^>
    if /i "!RESPUESTA!"=="S" (
        echo.
        echo       Abriendo Docker Desktop...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        echo.
        echo       Esperando 30 segundos a que Docker inicie...
        timeout /t 30 /nobreak

        REM Verificar de nuevo
        "%DOCKER_EXE%" ps >nul 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo       [INFO] Docker todavia esta iniciando...
            echo       Por favor espera 1-2 minutos mas y ejecuta:
            echo       INICIAR_DOCKER.bat
            echo.
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)

REM ============================================================
REM 3. VERIFICAR ARCHIVO .env
REM ============================================================
echo [3/5] Verificando configuracion...

if exist ".env" (
    echo       [OK] Archivo .env encontrado
) else (
    echo       [AVISO] Archivo .env no encontrado
    echo       Creando desde .env.docker.example...
    if exist ".env.docker.example" (
        copy ".env.docker.example" ".env" >nul
        echo       [OK] Archivo .env creado
        echo.
        echo       ⚠️  IMPORTANTE: Edita el archivo .env con tus credenciales
        echo       Presiona cualquier tecla para abrir .env...
        pause >nul
        notepad .env
    )
)

REM ============================================================
REM 4. VERIFICAR PUERTOS DISPONIBLES
REM ============================================================
echo [4/5] Verificando puertos...

set PUERTOS_OK=1

netstat -ano | findstr :8000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       [AVISO] Puerto 8000 en uso
    set PUERTOS_OK=0
)

netstat -ano | findstr :8080 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       [AVISO] Puerto 8080 en uso
    set PUERTOS_OK=0
)

netstat -ano | findstr :3306 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       [AVISO] Puerto 3306 en uso (probablemente XAMPP)
    set PUERTOS_OK=0
)

if !PUERTOS_OK! EQU 0 (
    echo.
    echo       ⚠️  Algunos puertos estan ocupados
    echo.
    echo       ¿Quieres detener XAMPP/servidores locales? (S/N)
    set /p DETENER=^>
    if /i "!DETENER!"=="S" (
        echo       Deteniendo servidores locales...
        call DETENER_SERVIDORES.bat
        timeout /t 3 /nobreak >nul
    )
) else (
    echo       [OK] Todos los puertos disponibles
)

REM ============================================================
REM 5. INICIAR DOCKER COMPOSE
REM ============================================================
echo [5/5] Iniciando contenedores...
echo.

"%COMPOSE_EXE%" up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    ✅ INICIO EXITOSO ✅                      ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo   🌐 Frontend:  http://localhost:8080
    echo   🔌 Backend:   http://localhost:8000/api
    echo   🗄️  MySQL:     localhost:3306
    echo.
    echo ────────────────────────────────────────────────────────────────
    echo.
    echo   📊 Ver logs:
    echo      "%COMPOSE_EXE%" logs -f
    echo.
    echo   🛑 Detener:
    echo      DETENER_DOCKER.bat
    echo.
    echo   🔄 Reiniciar:
    echo      "%COMPOSE_EXE%" restart
    echo.
    echo ────────────────────────────────────────────────────────────────
    echo.
    echo   Abriendo navegador en 5 segundos...
    timeout /t 5 /nobreak >nul
    start http://localhost:8080
) else (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    ❌ ERROR AL INICIAR ❌                    ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo   Posibles causas:
    echo   • Docker Desktop no esta completamente iniciado
    echo   • Puertos en uso (cierra XAMPP, otros servidores)
    echo   • Archivo docker-compose.yml con errores
    echo   • Falta archivo .env configurado
    echo.
    echo   Para mas detalles, ejecuta:
    echo      "%COMPOSE_EXE%" logs
    echo.
    echo   O lee: SOLUCION_DOCKER.txt
    echo.
)

pause

