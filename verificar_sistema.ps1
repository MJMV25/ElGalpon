# VERIFICACION DEL PROYECTO EL GALPON
# Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACION DEL PROYECTO EL GALPON" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Git
Write-Host "[1/7] Verificando Git..." -ForegroundColor Yellow
$gitBranch = git branch --show-current
$gitStatus = git status --short
Write-Host "OK Rama actual: $gitBranch" -ForegroundColor Green
if ($gitStatus) {
    Write-Host "ADVERTENCIA: Cambios pendientes encontrados:" -ForegroundColor Yellow
    git status --short
} else {
    Write-Host "OK No hay cambios pendientes" -ForegroundColor Green
}
Write-Host ""

# 2. Verificar MySQL
Write-Host "[2/7] Verificando MySQL..." -ForegroundColor Yellow
$mysqlRunning = netstat -ano | Select-String ":3306"
if ($mysqlRunning) {
    Write-Host "OK MySQL esta corriendo en puerto 3306" -ForegroundColor Green
} else {
    Write-Host "ERROR: MySQL NO esta corriendo" -ForegroundColor Red
}
Write-Host ""

# 3. Verificar Backend
Write-Host "[3/7] Verificando Backend..." -ForegroundColor Yellow
$backendRunning = netstat -ano | Select-String ":8000"
if ($backendRunning) {
    Write-Host "OK Backend corriendo en puerto 8000" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Backend NO esta corriendo" -ForegroundColor Yellow
}
Write-Host ""

# 4. Verificar Frontend
Write-Host "[4/7] Verificando Frontend..." -ForegroundColor Yellow
$frontendRunning = netstat -ano | Select-String ":8080"
if ($frontendRunning) {
    Write-Host "OK Frontend corriendo en puerto 8080" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Frontend NO esta corriendo" -ForegroundColor Yellow
}
Write-Host ""

# 5. Verificar .env backend
Write-Host "[5/7] Verificando configuracion Backend..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -match "DB_DATABASE=elgalpon") {
        Write-Host "OK Base de datos: elgalpon" -ForegroundColor Green
    }
    if ($envContent -match "MAIL_MAILER=smtp") {
        Write-Host "OK Email configurado con SMTP" -ForegroundColor Green
    }
    if ($envContent -match "FRONTEND_URL=http://localhost:8080") {
        Write-Host "OK Frontend URL configurado" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Archivo .env no encontrado en backend" -ForegroundColor Red
}
Write-Host ""

# 6. Verificar .env frontend
Write-Host "[6/7] Verificando configuracion Frontend..." -ForegroundColor Yellow
if (Test-Path "galp-n-inventory-hub\.env") {
    $envFrontContent = Get-Content "galp-n-inventory-hub\.env" -Raw
    if ($envFrontContent -match "VITE_API_URL=http://localhost:8000/api") {
        Write-Host "OK API URL configurado correctamente" -ForegroundColor Green
    }
} else {
    Write-Host "ERROR: Archivo .env no encontrado en frontend" -ForegroundColor Red
}
Write-Host ""

# 7. Verificar node_modules y vendor
Write-Host "[7/7] Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "backend\vendor") {
    Write-Host "OK Dependencias de backend instaladas" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Ejecuta 'cd backend; composer install'" -ForegroundColor Yellow
}
if (Test-Path "galp-n-inventory-hub\node_modules") {
    Write-Host "OK Dependencias de frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Ejecuta 'cd galp-n-inventory-hub; npm install'" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rama Git: $gitBranch" -ForegroundColor White
Write-Host "Backend: http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "Base de datos: MySQL (elgalpon)" -ForegroundColor White
Write-Host ""
Write-Host "Si los servidores no estan corriendo, ejecuta:" -ForegroundColor Yellow
Write-Host "   .\INICIAR_SERVIDORES.bat" -ForegroundColor White
Write-Host ""

