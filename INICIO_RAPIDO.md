# 🚀 GUÍA DE INICIO RÁPIDO - El Galpón

## 👋 BIENVENIDO AL PROYECTO

Este es el sistema de gestión de inventario **El Galpón**. Este documento te guiará para configurar todo en tu máquina.

---

## 📋 REQUISITOS PREVIOS

Antes de empezar, asegúrate de tener instalado:

- ✅ **Git** → https://git-scm.com/download/win
- ✅ **PHP 8.2+** → https://windows.php.net/download/
- ✅ **Composer** → https://getcomposer.org/download/
- ✅ **MySQL 8.0+** → https://dev.mysql.com/downloads/installer/
- ✅ **Node.js 18+** → https://nodejs.org/
- ✅ **VS Code o PHPStorm** → Editor de código

---

## 🔧 PASO 1: CLONAR EL REPOSITORIO

```powershell
# Clonar desde GitHub
git clone https://github.com/MJMV25/ElGalpon.git

# Entrar al directorio
cd ElGalpon

# Ver las ramas disponibles
git branch -a

# Cambiarse a la rama de desarrollo
git checkout develop

# Verificar que estás en develop
git branch
```

**Resultado esperado:**
```
* develop
  main
```

---

## 🗄️ PASO 2: CONFIGURAR BASE DE DATOS (MYSQL - IMPORTANTE)

⚠️ **NOTA IMPORTANTE:** Este proyecto usa **MySQL 8.0+**, NO SQLite. Asegúrate de tener MySQL instalado.

### **Abrir MySQL:**

```powershell
# Opción 1: MySQL Workbench (interfaz gráfica)
# Abrir MySQL Workbench → Conectar a localhost

# Opción 2: Línea de comandos
mysql -u root -p
```

### **Crear la base de datos:**

```sql
CREATE DATABASE elgalpon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verificar que se creó
SHOW DATABASES;

-- Salir
EXIT;
```

---

## ⚙️ PASO 3: CONFIGURAR BACKEND (Laravel)

```powershell
# Entrar a la carpeta backend
cd backend

# Instalar dependencias de PHP
composer install

# Copiar el archivo de configuración
copy .env.example .env

# Generar la clave de la aplicación
php artisan key:generate
```

### **Editar el archivo `.env`:**

Abre `backend/.env` con tu editor y configura:

```env
# Configuración de base de datos
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elgalpon
DB_USERNAME=root
DB_PASSWORD=tu-password-de-mysql

# Configuración de correo (usa tus credenciales de Gmail)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD="tu-app-password-de-gmail"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="tu-email@gmail.com"
MAIL_FROM_NAME="El Galpón"

# URLs
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080
```

### **Migrar y poblar la base de datos:**

```powershell
# Ejecutar migraciones (crear tablas)
php artisan migrate

# Ejecutar seeders (datos iniciales)
php artisan db:seed

# Verificar que todo está bien
php artisan tinker --execute="echo 'Users: ' . \App\Models\User::count();"
```

**Resultado esperado:**
```
Users: 5
```

---

## 🎨 PASO 4: CONFIGURAR FRONTEND (React + Vite)

```powershell
# Desde la raíz del proyecto
cd ..
cd galp-n-inventory-hub

# Instalar dependencias de Node
npm install

# (Opcional) Copiar archivo de entorno si existe
# copy .env.example .env
```

---

## ▶️ PASO 5: INICIAR SERVIDORES

### **Terminal 1 - Backend:**

```powershell
cd C:\Users\TU-USUARIO\ElGalpon\backend
php artisan serve
```

**Debe mostrar:**
```
Server running on [http://127.0.0.1:8000]
```

### **Terminal 2 - Frontend:**

```powershell
cd C:\Users\TU-USUARIO\ElGalpon\galp-n-inventory-hub
npm run dev
```

**Debe mostrar:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

---

## 🌐 PASO 6: ACCEDER AL SISTEMA

1. **Abrir navegador:** http://localhost:8080
2. **Iniciar sesión con un usuario de prueba:**

### **Usuarios disponibles:**

| Email | Rol | Descripción |
|-------|-----|-------------|
| `manuela.gomez@elgalpon-alcala.com` | Admin | Acceso completo |
| `carlos.gomez@elgalpon-alcala.com` | Admin | Acceso completo |
| `mjmunoz_108@cue.edu.co` | Admin | Acceso completo |
| `sgomez_21@cue.edu.co` | Admin | Acceso completo |
| `sebastian.rodriguez@elgalpon-alcala.com` | Empleado | Acceso limitado |

3. **Ingresa el email** → Se enviará un código de 6 dígitos al correo
4. **Ingresa el código** → Acceso al sistema ✅

---

## 📂 ESTRUCTURA DEL PROYECTO

```
ElGalpon/
├── backend/              # API Laravel
│   ├── app/
│   │   ├── Http/
│   │   │   └── Controllers/Api/  # Controladores de la API
│   │   ├── Models/               # Modelos de base de datos
│   │   └── Mail/                 # Plantillas de correo
│   ├── database/
│   │   ├── migrations/           # Migraciones de BD
│   │   └── seeders/              # Datos iniciales
│   ├── routes/
│   │   └── api.php               # Rutas de la API
│   └── .env                      # Configuración (NO subir a Git)
│
├── galp-n-inventory-hub/ # Frontend React
│   ├── src/
│   │   ├── pages/                # Páginas de la aplicación
│   │   ├── components/           # Componentes reutilizables
│   │   ├── services/             # Llamadas a la API
│   │   └── store/                # Estado global (Zustand)
│   └── .env                      # Configuración (NO subir a Git)
│
├── .gitignore                    # Archivos ignorados por Git
├── GIT_WORKFLOW.md               # Guía de trabajo con Git
├── GITHUB_SETUP.md               # Cómo subir a GitHub
├── ASIGNACION_TAREAS.md          # División de trabajo
└── RESUMEN_GIT.md                # Resumen de configuración
```

---

## 🔀 FLUJO DE TRABAJO CON GIT

### **Antes de empezar a trabajar:**

```powershell
# 1. Ir a la rama develop
git checkout develop

# 2. Traer los últimos cambios
git pull origin develop

# 3. Crear tu rama de funcionalidad
git checkout -b feature/nombre-de-tu-modulo

# Ejemplo:
git checkout -b feature/backend-inventario
```

### **Durante el desarrollo:**

```powershell
# Ver cambios
git status

# Agregar archivos
git add .

# Hacer commit
git commit -m "✨ Descripción del cambio"

# Subir tu rama
git push -u origin feature/nombre-de-tu-modulo
```

### **Al terminar tu funcionalidad:**

```powershell
# 1. Ir a develop
git checkout develop

# 2. Actualizar develop
git pull origin develop

# 3. Mergear tu rama
git merge feature/nombre-de-tu-modulo

# 4. Subir cambios
git push origin develop

# 5. Avisar al equipo que hiciste cambios en develop
```

---

## 🧪 PROBAR LA API CON POSTMAN

1. **Importar colección:** En `backend/ElGalpon_Postman_Collection.json`
2. **Configurar variables:**
   - `base_url`: `http://localhost:8000/api`
3. **Probar endpoints:**
   - POST `/auth/solicitar-codigo` → Solicitar código de login
   - POST `/auth/verificar-codigo` → Verificar código
   - GET `/productos` → Listar productos (requiere token)

---

## 📚 DOCUMENTACIÓN IMPORTANTE

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Documentación del proyecto |
| `GIT_WORKFLOW.md` | Guía completa de Git |
| `GITHUB_SETUP.md` | Cómo subir a GitHub |
| `ASIGNACION_TAREAS.md` | Tareas asignadas |
| `RESUMEN_GIT.md` | Resumen de configuración actual |

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### **Error: "Access denied for user 'root'@'localhost'"**

**Solución:** Verifica tu contraseña de MySQL en `.env`

```env
DB_PASSWORD=tu-password-correcta
```

---

### **Error: "SQLSTATE[42000]: Syntax error or access violation: 1071"**

**Solución:** Agrega esto en `backend/app/Providers/AppServiceProvider.php`:

```php
use Illuminate\Support\Facades\Schema;

public function boot(): void
{
    Schema::defaultStringLength(191);
}
```

---

### **Error: "npm ERR! code ENOENT"**

**Solución:** Asegúrate de estar en la carpeta correcta:

```powershell
cd galp-n-inventory-hub
npm install
```

---

### **Error: "Port 8000 is already in use"**

**Solución:** Otro servidor está usando el puerto. Detén todos los procesos PHP:

```powershell
Stop-Process -Name php -Force
php artisan serve
```

---

### **Error: "No se envía el código al correo"**

**Solución:** Verifica la configuración de Gmail en `.env`:

1. Ve a: https://myaccount.google.com/apppasswords
2. Genera una contraseña de aplicación para "Mail"
3. Úsala en `MAIL_PASSWORD` (sin espacios, 16 caracteres)

---

### **Error: "CORS policy: No 'Access-Control-Allow-Origin'"**

**Solución:** El backend debe estar corriendo en puerto 8000 y frontend en 8080.

```powershell
# Verificar puertos
netstat -ano | findstr :8000
netstat -ano | findstr :8080
```

---

## 🔧 COMANDOS ÚTILES

### **Backend:**

```powershell
# Limpiar caché
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Ejecutar migraciones
php artisan migrate

# Ejecutar seeders
php artisan db:seed

# Ver rutas disponibles
php artisan route:list

# Crear un controlador
php artisan make:controller NombreController

# Crear un modelo
php artisan make:model NombreModelo -m
```

### **Frontend:**

```powershell
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar tests
npm test

# Linter
npm run lint
```

### **Git:**

```powershell
# Ver estado
git status

# Ver ramas
git branch -a

# Cambiar de rama
git checkout nombre-rama

# Ver historial
git log --oneline --graph --all

# Deshacer cambios
git checkout -- archivo.txt
```

---

## 📞 NECESITAS AYUDA?

1. **Lee la documentación:** Revisa los archivos `.md` en la raíz
2. **Revisa el código existente:** Busca ejemplos similares
3. **Google/Stack Overflow:** La mayoría de errores ya están resueltos
4. **Pregunta al equipo:** Usa el chat del grupo

---

## ✅ CHECKLIST DE CONFIGURACIÓN

Antes de empezar a programar, verifica:

- [ ] ✅ Git instalado y configurado
- [ ] ✅ Repositorio clonado
- [ ] ✅ Base de datos MySQL creada
- [ ] ✅ Backend configurado (.env)
- [ ] ✅ Migraciones ejecutadas
- [ ] ✅ Seeders ejecutados
- [ ] ✅ Frontend configurado
- [ ] ✅ Dependencias instaladas (composer + npm)
- [ ] ✅ Servidor backend corriendo (puerto 8000)
- [ ] ✅ Servidor frontend corriendo (puerto 8080)
- [ ] ✅ Puedes hacer login en http://localhost:8080
- [ ] ✅ Revisaste la documentación (GIT_WORKFLOW.md)

---

## 🎯 PRÓXIMOS PASOS

1. **Familiarízate con el código:** Explora las carpetas y archivos
2. **Lee la asignación de tareas:** Ver `ASIGNACION_TAREAS.md`
3. **Crea tu primera rama:** `git checkout -b feature/tu-modulo`
4. **Empieza a programar:** Sigue las convenciones del proyecto
5. **Haz commits frecuentes:** Cada 1-2 horas mínimo
6. **Comunícate con el equipo:** Antes de hacer cambios grandes

---

**¡Todo listo para empezar a desarrollar! 🚀**

_Si tienes algún problema, revisa la sección de "Solución de Problemas" o contacta al equipo._

