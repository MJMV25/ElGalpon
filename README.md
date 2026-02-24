﻿# 🏪 El Galpón - Sistema de Gestión de Inventario

Sistema de gestión de inventario para agropecuaria y veterinaria - Alcalá, Valle del Cauca, Colombia.

---

## 🚀 INICIO RÁPIDO

### Opción 1: Docker (Recomendado para Compañeros)

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd ElGalpon

# 2. Configurar variables de entorno
copy .env.docker.example .env
notepad .env  # Agregar credenciales de email

# 3. Iniciar con Docker
docker-compose up -d
```

**📖 Guía completa**: Lee [INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md) para instrucciones detalladas.

### Opción 2: Desarrollo Local (Windows + XAMPP)

#### Iniciar el Proyecto:
```batch
INICIAR_SERVIDORES.bat
```

#### Detener los Servidores:
```batch
DETENER_SERVIDORES.bat
```

### Acceso a la Aplicación:

**Con Docker:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- Base de datos MySQL: localhost:3306

**Desarrollo Local:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- phpMyAdmin: http://localhost/phpmyadmin

---

## 🛠️ TECNOLOGÍAS

- **Backend**: Laravel 11 + PHP 8.2+
- **Frontend**: React 18 + TypeScript + Vite
- **Base de Datos**: MySQL 8.0
- **Autenticación**: Email con código OTP (6 dígitos)
- **Email**: Gmail SMTP
- **Contenedores**: Docker + Docker Compose

---

## 👥 USUARIOS POR DEFECTO

### Administradores (Acceso Completo):
- manuela.gomez@elgalpon-alcala.com
- carlos.gomez@elgalpon-alcala.com
- mjmunoz_108@cue.edu.co
- sgomez_21@cue.edu.co

### Empleado (Solo Lectura):
- sebastian.rodriguez@elgalpon-alcala.com

**Nota**: El código de verificación se envía al email configurado en las variables de entorno.

---

## 📊 FUNCIONALIDADES

### 🔑 Administradores:
- ✅ Gestión completa de productos (CRUD)
- ✅ Gestión de proveedores y deudas
- ✅ Gestión de usuarios
- ✅ Sistema de cotizaciones con comparación
- ✅ Control de inventario y stock crítico
- ✅ Reportes financieros
- ✅ Notificaciones automáticas por email

### 👤 Empleados:
- ✅ Ver inventario completo
- ✅ Ver reportes y presupuestos
- ✅ Ver proveedores
- ❌ Sin permisos de edición/eliminación

---

## 📁 ESTRUCTURA DEL PROYECTO

```
ElGalpon/
├── backend/                    # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Mail/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── backup/             # Backups de BD
│   ├── routes/
│   └── Dockerfile
│
├── galp-n-inventory-hub/       # Frontend React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml          # Configuración Docker
├── .env.docker.example         # Ejemplo de variables
├── DOCKER_GUIDE.md             # Guía de Docker
└── INSTALACION_COMPAÑEROS.md   # Guía de instalación
```

---

## 🐳 DOCKER

### Comandos Básicos:

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver estado
docker-compose ps
```

### Crear Backup de la Base de Datos:

```bash
.\crear_backup.ps1
```

---

## 🔧 DESARROLLO

### Requisitos para Desarrollo Local:
- PHP 8.2+
- Composer
- Node.js 20+
- MySQL 8.0+
- XAMPP (Windows)

### Instalación Backend:
```bash
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Instalación Frontend:
```bash
cd galp-n-inventory-hub
npm install
npm run dev
```

---

## 📧 CONFIGURACIÓN DE EMAIL

Para que el sistema envíe códigos de verificación, necesitas configurar Gmail:

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Activa "Verificación en 2 pasos"
3. Genera una "Contraseña de aplicación"
4. Úsala en las variables de entorno:

```env
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM_ADDRESS=tu_email@gmail.com
```

---

## 🔐 SEGURIDAD

- ✅ Autenticación por email con código OTP
- ✅ Tokens JWT/Sanctum con expiración
- ✅ Rate limiting (5 intentos por minuto)
- ✅ Middleware de roles y permisos
- ✅ Validación de datos en backend
- ✅ CORS configurado
- ✅ Contraseñas encriptadas (no se usan contraseñas tradicionales)

---

## 📝 NOTAS IMPORTANTES

- **Base de Datos**: Migrada de SQLite a MySQL para mejor rendimiento
- **Persistencia**: Los datos en Docker se guardan en volúmenes persistentes
- **Git**: NO subir archivos `.env`, `node_modules`, `vendor`, ni backups
- **Backups**: Solo `backup.sql` se sube a Git para Docker

---

## 🆘 SOPORTE

Si tienes problemas:

1. **Docker**: Lee [DOCKER_GUIDE.md](DOCKER_GUIDE.md)
2. **Instalación**: Lee [INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md)
3. **Logs**: Revisa `docker-compose logs -f`
4. **Contacta al equipo**

---

## 🎯 PRÓXIMAS FUNCIONALIDADES

- [ ] Sistema de notificaciones push
- [ ] Dashboard con gráficos en tiempo real
- [ ] Exportar reportes a PDF
- [ ] App móvil (React Native)
- [ ] Sistema de roles más granular

---

**Desarrollado para El Galpón - Alcalá, Valle del Cauca** 🇨🇴  
**Versión**: 1.0.0  
**Última actualización**: Febrero 2026
