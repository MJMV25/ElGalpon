# Script para hacer backup de la base de datos
# Ejecutar desde la raíz del proyecto

# Configuración
$MYSQL_PATH = "C:\xampp\mysql\bin\mysqldump.exe"
$MYSQL_USER = "root"
$MYSQL_PASSWORD = ""
$DATABASE = "elgalpon"
$BACKUP_DIR = "backend\database\backup"
$BACKUP_FILE = "$BACKUP_DIR\elgalpon_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Crear directorio si no existe
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Force -Path $BACKUP_DIR
}

Write-Host "🔄 Creando backup de la base de datos..." -ForegroundColor Yellow

if ($MYSQL_PASSWORD -eq "") {
    & $MYSQL_PATH -u $MYSQL_USER $DATABASE > $BACKUP_FILE
} else {
    & $MYSQL_PATH -u $MYSQL_USER -p$MYSQL_PASSWORD $DATABASE > $BACKUP_FILE
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup creado exitosamente: $BACKUP_FILE" -ForegroundColor Green

    # Copiar como backup.sql (el que Docker usará)
    Copy-Item $BACKUP_FILE "$BACKUP_DIR\backup.sql" -Force
    Write-Host "✅ Archivo backup.sql actualizado para Docker" -ForegroundColor Green
} else {
    Write-Host "❌ Error al crear el backup" -ForegroundColor Red
}

