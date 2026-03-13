# 📘 INSTRUCCIONES PARA COMPAÑERO - SINCRONIZACIÓN COMPLETA

**Fecha de actualización:** 6 de marzo de 2026

## 🎯 OBJETIVO

Este documento explica cómo tu compañero puede sincronizar el proyecto completo, incluyendo código y base de datos.

---

## 📥 PASO 1: CLONAR O ACTUALIZAR EL REPOSITORIO

### Si es la primera vez (clonar):
```powershell
git clone https://github.com/MJMV25/ElGalpon.git
cd ElGalpon
git checkout develop
```

### Si ya tiene el repositorio (actualizar):
```powershell
cd ElGalpon
git fetch --all
git checkout develop
git pull origin develop
```

---

## 📦 PASO 2: INSTALAR DEPENDENCIAS

### Backend (Laravel):
```powershell
cd backend
composer install
```

### Frontend (React):
```powershell
cd galp-n-inventory-hub
npm install
```

---

## ⚙️ PASO 3: CONFIGURAR ARCHIVOS .ENV

### Backend (.env):
Copiar el archivo de ejemplo y editarlo:
```powershell
cd backend
copy .env.example .env
```

Editar `backend\.env` con estos valores:
```env
APP_NAME="El Galpón"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elgalpon
DB_USERNAME=root
DB_PASSWORD=

# Configurar con sus propias credenciales de Gmail
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=su_email@gmail.com
MAIL_PASSWORD="su_contraseña_app"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="su_email@gmail.com"
MAIL_FROM_NAME="El Galpón"
```

**⚠️ IMPORTANTE:** Para la contraseña de Gmail, deben:
1. Ir a https://myaccount.google.com/security
2. Habilitar "Verificación en 2 pasos"
3. Ir a "Contraseñas de aplicaciones"
4. Generar una contraseña para "Correo"
5. Usar esa contraseña en `MAIL_PASSWORD`

### Frontend (.env):
```powershell
cd galp-n-inventory-hub
copy .env.example .env
```

El archivo `galp-n-inventory-hub\.env` debe contener:
```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME="El Galpón"
```

---

## 🗄️ PASO 4: RESTAURAR LA BASE DE DATOS

### Opción A: Desde backup SQL (RECOMENDADO)

1. **Crear la base de datos:**
```powershell
# Abrir MySQL desde XAMPP o desde línea de comandos
mysql -u root -p

# Dentro de MySQL:
CREATE DATABASE elgalpon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

2. **Restaurar el backup:**
```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root elgalpon < "C:\ruta\al\backup\backup.sql"
```

### Opción B: Ejecutar migraciones y seeders desde cero

```powershell
cd backend
php artisan migrate:fresh --seed
```

**⚠️ NOTA:** La opción A es mejor porque mantiene todos los datos exactos, incluyendo IDs y relaciones.

---

## 🚀 PASO 5: GENERAR KEY DE APLICACIÓN (Solo primera vez)

```powershell
cd backend
php artisan key:generate
```

---

## 🏃 PASO 6: INICIAR LOS SERVIDORES

Desde la raíz del proyecto:
```powershell
.\INICIAR_SERVIDORES.bat
```

O manualmente:

**Terminal 1 - Backend:**
```powershell
cd backend
php artisan serve --port=8000
```

**Terminal 2 - Frontend:**
```powershell
cd galp-n-inventory-hub
npm run dev
```

---

## 🔍 PASO 7: VERIFICAR QUE TODO FUNCIONE

Ejecutar el script de verificación:
```powershell
.\verificar_sistema.ps1
```

Deberías ver:
- ✅ Git en rama develop
- ✅ MySQL corriendo en puerto 3306
- ✅ Backend corriendo en puerto 8000
- ✅ Frontend corriendo en puerto 8080
- ✅ Todas las configuraciones correctas

---

## 🌐 PASO 8: PROBAR LA APLICACIÓN

1. Abrir navegador en: **http://localhost:8080**
2. Iniciar sesión con alguno de estos usuarios:
   - `manuela.gomez@elgalpon-alcala.com` (Admin)
   - `carlos.gomez@elgalpon-alcala.com` (Admin)
   - `mjmunoz_108@cue.edu.co` (Admin)
   - `sgomez_21@cue.edu.co` (Admin)
   - `sebastian.rodriguez@elgalpon-alcala.com` (Empleado)

3. Se enviará un código de 6 dígitos al email
4. Ingresar el código para acceder al sistema

---

## 🔧 COMANDOS ÚTILES

### Git:
```powershell
# Ver cambios actuales
git status

# Ver todas las ramas
git branch -a

# Cambiar de rama
git checkout nombre-rama

# Actualizar rama actual
git pull origin nombre-rama

# Ver commits recientes
git log --oneline --graph -10
```

### Laravel (Backend):
```powershell
cd backend

# Limpiar cachés
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Ver estado de migraciones
php artisan migrate:status

# Ejecutar migraciones pendientes
php artisan migrate

# Resetear base de datos
php artisan migrate:fresh --seed

# Ver rutas disponibles
php artisan route:list --columns=method,uri,name
```

### Frontend:
```powershell
cd galp-n-inventory-hub

# Instalar/actualizar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Limpiar caché
rm -rf node_modules/.vite
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### ❌ Error: "SQLSTATE[HY000] [1049] Unknown database 'elgalpon'"
**Solución:** La base de datos no existe. Créala con:
```sql
CREATE DATABASE elgalpon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ❌ Error: "Port 8000 is already in use"
**Solución:** Detener el proceso anterior:
```powershell
Get-Process php | Stop-Process -Force
```

### ❌ Error: "Port 8080 is already in use"
**Solución:** Detener el proceso anterior:
```powershell
Get-Process node | Stop-Process -Force
```

### ❌ Error: "composer: command not found"
**Solución:** Instalar Composer desde https://getcomposer.org/

### ❌ Error: "npm: command not found"
**Solución:** Instalar Node.js desde https://nodejs.org/

### ❌ Error CORS al iniciar sesión
**Solución:** Verificar que `FRONTEND_URL` en backend/.env sea `http://localhost:8080`

### ❌ No llegan los códigos de verificación por email
**Solución:** 
1. Verificar credenciales de Gmail en `.env`
2. Asegurarse de usar "Contraseña de aplicación" de Google
3. Revisar logs: `backend/storage/logs/laravel.log`

---

## 📊 ESTRUCTURA DEL PROYECTO ACTUALIZADO

```
ElGalpon/
├── backend/              # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/Api/  # Controladores API
│   │   ├── Models/                # Modelos Eloquent
│   │   ├── Mail/                  # Templates de email
│   │   └── Support/               # Clases auxiliares
│   ├── database/
│   │   ├── migrations/            # 17 migraciones
│   │   ├── seeders/               # Datos iniciales
│   │   └── backup/                # Backup de BD
│   └── routes/api.php             # Rutas API
│
├── galp-n-inventory-hub/          # Frontend React + TypeScript
│   ├── src/
│   │   ├── pages/                 # 15+ páginas
│   │   ├── components/            # Componentes reutilizables
│   │   ├── services/              # Servicios API
│   │   ├── store/                 # Estado global (Zustand)
│   │   └── lib/                   # Configuración Axios
│   └── public/
│
├── docker-compose.yml             # Orquestación Docker
├── INICIAR_SERVIDORES.bat         # Script para iniciar todo
├── verificar_sistema.ps1          # Script de verificación
└── crear_backup.ps1               # Script para backups
```

---

## 🎓 DATOS DE ACCESO INICIALES

### Usuarios Admin:
- manuela.gomez@elgalpon-alcala.com
- carlos.gomez@elgalpon-alcala.com
- mjmunoz_108@cue.edu.co
- sgomez_21@cue.edu.co
- manueljosemvillalobos25@gmail.com

### Usuario Empleado:
- sebastian.rodriguez@elgalpon-alcala.com

---

## 📞 SOPORTE

Si tienes problemas:
1. Ejecutar `.\verificar_sistema.ps1` para diagnosticar
2. Revisar logs del backend: `backend\storage\logs\laravel.log`
3. Revisar consola del navegador (F12) en el frontend
4. Verificar que MySQL de XAMPP esté corriendo

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Git actualizado a rama `develop`
- [ ] Composer instalado y dependencias de backend descargadas
- [ ] Node.js instalado y dependencias de frontend descargadas
- [ ] MySQL corriendo (XAMPP)
- [ ] Base de datos `elgalpon` creada
- [ ] Backup de BD restaurado o migraciones ejecutadas
- [ ] Archivo `.env` configurado en backend
- [ ] Archivo `.env` configurado en frontend
- [ ] Backend corriendo en puerto 8000
- [ ] Frontend corriendo en puerto 8080
- [ ] Puede iniciar sesión y recibir código por email

---

¡Listo! Tu compañero debería poder trabajar sin problemas. 🎉

