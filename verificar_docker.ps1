# Script de Prueba Docker - El Galpón
# Verifica que Docker esté instalado y funcionando correctamente

Write-Host "🔍 Verificando Instalación de Docker..." -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "1️⃣ Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✅ Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "   📥 Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Verificar Docker Compose
Write-Host ""
Write-Host "2️⃣ Verificando Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "   ✅ Docker Compose instalado: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker Compose no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar Docker Engine
Write-Host ""
Write-Host "3️⃣ Verificando Docker Engine..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker Engine está corriendo" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Docker Engine no está corriendo" -ForegroundColor Red
        Write-Host "   💡 Abre Docker Desktop y espera a que inicie" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ No se puede conectar a Docker Engine" -ForegroundColor Red
    exit 1
}

# Verificar archivo .env
Write-Host ""
Write-Host "4️⃣ Verificando configuración..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ Archivo .env existe" -ForegroundColor Green

    $envContent = Get-Content .env -Raw
    if ($envContent -match "tu_email@gmail.com") {
        Write-Host "   ⚠️  Archivo .env contiene valores de ejemplo" -ForegroundColor Yellow
        Write-Host "   📝 Debes configurar tus credenciales de email en .env" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Archivo .env configurado" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Archivo .env no existe" -ForegroundColor Red
    Write-Host "   💡 Copia .env.docker.example a .env y configúralo" -ForegroundColor Yellow
    exit 1
}

# Verificar docker-compose.yml
Write-Host ""
Write-Host "5️⃣ Verificando archivos Docker..." -ForegroundColor Yellow
$archivosDocker = @(
    "docker-compose.yml",
    "backend\Dockerfile",
    "galp-n-inventory-hub\Dockerfile",
    "galp-n-inventory-hub\nginx.conf"
)

$todoOk = $true
foreach ($archivo in $archivosDocker) {
    if (Test-Path $archivo) {
        Write-Host "   ✅ $archivo" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $archivo no encontrado" -ForegroundColor Red
        $todoOk = $false
    }
}

if (-not $todoOk) {
    Write-Host ""
    Write-Host "   ⚠️  Faltan archivos Docker. Asegúrate de tener todos los archivos." -ForegroundColor Yellow
    exit 1
}

# Verificar backup de BD
Write-Host ""
Write-Host "6️⃣ Verificando backup de base de datos..." -ForegroundColor Yellow
if (Test-Path "backend\database\backup\backup.sql") {
    $backupSize = (Get-Item "backend\database\backup\backup.sql").Length / 1KB
    Write-Host "   ✅ Backup encontrado: $([math]::Round($backupSize, 2)) KB" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No se encontró backup.sql" -ForegroundColor Yellow
    Write-Host "   💡 El sistema creará las tablas con datos de ejemplo" -ForegroundColor Yellow
}

# Verificar puertos disponibles
Write-Host ""
Write-Host "7️⃣ Verificando puertos disponibles..." -ForegroundColor Yellow

$puertos = @{
    "3306" = "MySQL"
    "8000" = "Backend Laravel"
    "8080" = "Frontend React"
}

foreach ($puerto in $puertos.Keys) {
    $enUso = Get-NetTCPConnection -LocalPort $puerto -ErrorAction SilentlyContinue
    if ($enUso) {
        Write-Host "   ⚠️  Puerto $puerto ($($puertos[$puerto])) está en uso" -ForegroundColor Yellow
        Write-Host "      💡 Cierra XAMPP, servidores locales o cambia el puerto en docker-compose.yml" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Puerto $puerto ($($puertos[$puerto])) disponible" -ForegroundColor Green
    }
}

# Resumen
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ VERIFICACIÓN COMPLETA" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Para iniciar el proyecto con Docker:" -ForegroundColor Yellow
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "📊 Para ver los logs:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Accesos:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:8080" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   MySQL:     localhost:3306" -ForegroundColor White
Write-Host ""
Write-Host "📖 Para más información, lee:" -ForegroundColor Yellow
Write-Host "   - DOCKER_GUIDE.md" -ForegroundColor White
Write-Host "   - INSTALACION_COMPAÑEROS.md" -ForegroundColor White
Write-Host ""

