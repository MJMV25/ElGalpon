# Script de Verificación Pre-Git
# Verifica que todo esté listo para subir a GitHub

$ErrorActionPreference = "Continue"
$todoBien = $true

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 VERIFICACIÓN PRE-GIT - El Galpón" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Git
Write-Host "1️⃣ Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host "   ✅ Git instalado: $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Git no está instalado" -ForegroundColor Red
        $todoBien = $false
    }
} catch {
    Write-Host "   ❌ Git no está instalado o no está en PATH" -ForegroundColor Red
    $todoBien = $false
}

# 2. Verificar archivos sensibles
Write-Host ""
Write-Host "2️⃣ Verificando archivos sensibles..." -ForegroundColor Yellow

$archivosSensibles = @(
    ".env",
    "backend\.env",
    "backend\database\database.sqlite"
)

$encontrados = @()
foreach ($archivo in $archivosSensibles) {
    if (Test-Path $archivo) {
        $encontrados += $archivo
    }
}

if ($encontrados.Count -gt 0) {
    Write-Host "   ⚠️  Archivos sensibles encontrados (verificar .gitignore):" -ForegroundColor Yellow
    foreach ($archivo in $encontrados) {
        Write-Host "      - $archivo" -ForegroundColor Yellow
    }
    Write-Host "   💡 Asegúrate de que estén en .gitignore" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ No se encontraron archivos sensibles críticos" -ForegroundColor Green
}

# 3. Verificar .gitignore
Write-Host ""
Write-Host "3️⃣ Verificando .gitignore..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content .gitignore -Raw
    $patronesImportantes = @(".env", "node_modules", "vendor", "*.log")
    $faltantes = @()

    foreach ($patron in $patronesImportantes) {
        if ($gitignoreContent -notmatch [regex]::Escape($patron)) {
            $faltantes += $patron
        }
    }

    if ($faltantes.Count -eq 0) {
        Write-Host "   ✅ .gitignore configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Faltan patrones en .gitignore:" -ForegroundColor Yellow
        foreach ($patron in $faltantes) {
            Write-Host "      - $patron" -ForegroundColor Yellow
        }
        $todoBien = $false
    }
} else {
    Write-Host "   ❌ .gitignore no encontrado" -ForegroundColor Red
    $todoBien = $false
}

# 4. Verificar archivos Docker
Write-Host ""
Write-Host "4️⃣ Verificando archivos Docker..." -ForegroundColor Yellow
$archivosDocker = @(
    @{Path="docker-compose.yml"; Nombre="Docker Compose"},
    @{Path="backend\Dockerfile"; Nombre="Backend Dockerfile"},
    @{Path="galp-n-inventory-hub\Dockerfile"; Nombre="Frontend Dockerfile"},
    @{Path=".env.docker.example"; Nombre="Ejemplo .env"}
)

$dockerOk = $true
foreach ($item in $archivosDocker) {
    if (Test-Path $item.Path) {
        Write-Host "   ✅ $($item.Nombre)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($item.Nombre) no encontrado" -ForegroundColor Red
        $dockerOk = $false
        $todoBien = $false
    }
}

# 5. Verificar documentación
Write-Host ""
Write-Host "5️⃣ Verificando documentación..." -ForegroundColor Yellow
$documentos = @(
    "README.md",
    "DOCKER_GUIDE.md",
    "INSTALACION_COMPAÑEROS.md",
    "GIT_GUIDE.md",
    "CHECKLIST_GITHUB.md"
)

$docsOk = $true
foreach ($doc in $documentos) {
    if (Test-Path $doc) {
        Write-Host "   ✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $doc no encontrado" -ForegroundColor Yellow
        $docsOk = $false
    }
}

# 6. Verificar backup de BD
Write-Host ""
Write-Host "6️⃣ Verificando backup de base de datos..." -ForegroundColor Yellow
$backupPath = "backend\database\backup\backup.sql"
if (Test-Path $backupPath) {
    $backupSize = (Get-Item $backupPath).Length
    if ($backupSize -gt 10KB) {
        Write-Host "   ✅ Backup encontrado: $([math]::Round($backupSize/1KB, 2)) KB" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Backup muy pequeño: $([math]::Round($backupSize/1KB, 2)) KB" -ForegroundColor Yellow
        Write-Host "      💡 Ejecuta: .\crear_backup.ps1" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Backup no encontrado" -ForegroundColor Yellow
    Write-Host "      💡 Ejecuta: .\crear_backup.ps1" -ForegroundColor Yellow
}

# 7. Verificar estado de Git
Write-Host ""
Write-Host "7️⃣ Verificando estado de Git..." -ForegroundColor Yellow
try {
    $isGitRepo = git rev-parse --is-inside-work-tree 2>$null
    if ($isGitRepo -eq "true") {
        Write-Host "   ✅ Repositorio Git inicializado" -ForegroundColor Green

        # Ver archivos sin trackear
        $untrackedFiles = git ls-files --others --exclude-standard
        if ($untrackedFiles) {
            $count = ($untrackedFiles | Measure-Object).Count
            Write-Host "   ℹ️  Archivos sin agregar: $count" -ForegroundColor Cyan
        }

        # Ver archivos modificados
        $modifiedFiles = git diff --name-only
        if ($modifiedFiles) {
            $count = ($modifiedFiles | Measure-Object).Count
            Write-Host "   ℹ️  Archivos modificados: $count" -ForegroundColor Cyan
        }

        # Ver archivos en staging
        $stagedFiles = git diff --cached --name-only
        if ($stagedFiles) {
            $count = ($stagedFiles | Measure-Object).Count
            Write-Host "   ℹ️  Archivos en staging: $count" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️  No es un repositorio Git" -ForegroundColor Yellow
        Write-Host "      💡 Ejecuta: git init" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  No es un repositorio Git" -ForegroundColor Yellow
    Write-Host "      💡 Ejecuta: git init" -ForegroundColor Yellow
}

# 8. Verificar node_modules y vendor
Write-Host ""
Write-Host "8️⃣ Verificando directorios grandes..." -ForegroundColor Yellow
$directoriosGrandes = @(
    @{Path="node_modules"; Nombre="node_modules"},
    @{Path="backend\vendor"; Nombre="vendor"},
    @{Path="galp-n-inventory-hub\node_modules"; Nombre="frontend node_modules"},
    @{Path="galp-n-inventory-hub\dist"; Nombre="frontend dist"}
)

foreach ($dir in $directoriosGrandes) {
    if (Test-Path $dir.Path) {
        try {
            $status = git check-ignore $dir.Path 2>$null
            if ($status) {
                Write-Host "   ✅ $($dir.Nombre) ignorado por Git" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $($dir.Nombre) NO está ignorado" -ForegroundColor Yellow
                Write-Host "      💡 Agregar '$($dir.Path)' al .gitignore" -ForegroundColor Yellow
                $todoBien = $false
            }
        } catch {
            # Si git check-ignore falla, asumimos que está bien
        }
    }
}

# 9. Verificar configuración de Git
Write-Host ""
Write-Host "9️⃣ Verificando configuración de Git..." -ForegroundColor Yellow
try {
    $gitUser = git config user.name 2>$null
    $gitEmail = git config user.email 2>$null

    if ($gitUser -and $gitEmail) {
        Write-Host "   ✅ Usuario Git: $gitUser <$gitEmail>" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Usuario Git no configurado" -ForegroundColor Yellow
        Write-Host "      💡 Ejecuta:" -ForegroundColor Yellow
        Write-Host "         git config --global user.name 'Tu Nombre'" -ForegroundColor White
        Write-Host "         git config --global user.email 'tu_email@ejemplo.com'" -ForegroundColor White
    }
} catch {
    Write-Host "   ⚠️  No se pudo verificar configuración Git" -ForegroundColor Yellow
}

# Resumen Final
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($todoBien) {
    Write-Host "✅ TODO LISTO PARA GIT" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Agregar archivos:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Hacer commit:" -ForegroundColor White
    Write-Host '   git commit -m "🐳 Dockerizar proyecto completo"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Agregar remoto (reemplaza <USUARIO>):" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/<USUARIO>/ElGalpon.git" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Subir a GitHub:" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📖 Guía completa en: CHECKLIST_GITHUB.md" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  HAY PROBLEMAS QUE RESOLVER" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Revisa los mensajes anteriores y corrige los problemas." -ForegroundColor Yellow
    Write-Host "Luego ejecuta este script de nuevo." -ForegroundColor Yellow
}

Write-Host ""

