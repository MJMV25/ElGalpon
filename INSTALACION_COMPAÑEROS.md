# 🚀 Guía de Instalación para Compañeros de Trabajo

## 📋 Prerrequisitos

Antes de empezar, asegúrate de tener instalado:

1. **Git** - [Descargar Git](https://git-scm.com/downloads)
2. **Docker Desktop** - [Descargar Docker](https://www.docker.com/products/docker-desktop)
   - ⚠️ **IMPORTANTE**: Docker Desktop debe estar corriendo antes de ejecutar los comandos

## 🎯 Instalación en 5 Pasos

### Paso 1: Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd ElGalpon
```

### Paso 2: Configurar Credenciales de Email

```bash
# Copiar el archivo de ejemplo
copy .env.docker.example .env

# Editar el archivo .env con tu editor favorito
notepad .env
```

**Configura estos valores en el archivo `.env`:**

```env
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM_ADDRESS=tu_email@gmail.com
```

#### 📧 Cómo obtener la contraseña de aplicación de Gmail:

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Activa "Verificación en 2 pasos" si no la tienes
3. Busca "Contraseñas de aplicaciones" 
4. Genera una nueva contraseña para "Correo"
5. Copia la contraseña de 16 caracteres (sin espacios)
6. Pégala en `MAIL_PASSWORD` en tu archivo `.env`

### Paso 3: Iniciar Docker Desktop

1. Abre **Docker Desktop**
2. Espera a que inicie completamente (ícono verde)
3. Asegúrate de que diga "Engine running"

### Paso 4: Construir y Levantar los Contenedores

```bash
# Construir y levantar todos los servicios
docker-compose up -d --build
```

Este comando hará:
- ✅ Descargará las imágenes base (PHP, MySQL, Node, Nginx)
- ✅ Construirá el backend de Laravel
- ✅ Construirá el frontend de React
- ✅ Creará la base de datos MySQL
- ✅ Importará los datos iniciales desde el backup
- ✅ Ejecutará las migraciones
- ✅ Levantará todos los servicios

⏱️ **Primera vez**: Puede tardar 5-10 minutos dependiendo de tu conexión a internet.

### Paso 5: Verificar que Todo Funcione

```bash
# Ver el estado de los contenedores
docker-compose ps

# Deberías ver algo como:
# NAME                  STATUS
# elgalpon_backend      Up
# elgalpon_frontend     Up
# elgalpon_mysql        Up (healthy)
```

## 🌐 Acceder a la Aplicación

Una vez que todo esté corriendo:

- **Frontend (Aplicación web)**: http://localhost:8080
- **Backend (API)**: http://localhost:8000/api
- **Base de datos MySQL**: localhost:3306

### 🔐 Usuarios de Prueba

Usa estos usuarios para iniciar sesión:

| Email | Rol | Descripción |
|-------|-----|-------------|
| manuela.gomez@elgalpon-alcala.com | Admin | Acceso completo |
| carlos.gomez@elgalpon-alcala.com | Admin | Acceso completo |
| mjmunoz_108@cue.edu.co | Admin | Acceso completo |
| sgomez_21@cue.edu.co | Admin | Acceso completo |
| sebastian.rodriguez@elgalpon-alcala.com | Empleado | Acceso limitado |

**Nota**: El código de verificación llegará al email configurado en `.env`

## 📊 Ver Logs en Tiempo Real

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs solo del frontend
docker-compose logs -f frontend

# Ver logs solo de MySQL
docker-compose logs -f mysql
```

**Presiona `Ctrl + C` para salir de los logs**

## 🛑 Detener los Contenedores

```bash
# Detener todos los servicios (los datos se mantienen)
docker-compose down

# Para iniciarlos de nuevo
docker-compose up -d
```

## 🔄 Actualizar el Proyecto

Cuando haya nuevos cambios en el repositorio:

```bash
# 1. Obtener los últimos cambios
git pull origin main

# 2. Reconstruir y reiniciar (si hubo cambios en código)
docker-compose up -d --build

# 3. Si hubo cambios en la base de datos, ejecutar migraciones
docker exec -it elgalpon_backend php artisan migrate
```

## 🆘 Solución de Problemas Comunes

### ❌ Error: "docker-compose: command not found"

**Solución**: Docker Desktop no está instalado o no está en el PATH.
- Instala Docker Desktop
- Reinicia la terminal después de instalar

### ❌ Error: "Cannot connect to the Docker daemon"

**Solución**: Docker Desktop no está corriendo.
- Abre Docker Desktop
- Espera a que diga "Engine running"
- Intenta de nuevo

### ❌ Error: "Port 8000/8080/3306 is already in use"

**Solución**: Ya tienes algo corriendo en esos puertos.

```bash
# Opción 1: Detener tus servidores locales (XAMPP, PHP artisan serve, npm run dev)

# Opción 2: Cambiar los puertos en docker-compose.yml
# Edita las líneas de "ports:" a algo como:
# - "8001:8000"  # Backend
# - "8081:80"    # Frontend
# - "3307:3306"  # MySQL
```

### ❌ Los correos no se envían

**Solución**: Verifica tu configuración de email.

```bash
# Ver logs del backend para errores
docker-compose logs -f backend

# Asegúrate de que .env tenga:
# - MAIL_USERNAME correcto
# - MAIL_PASSWORD correcto (contraseña de aplicación de Gmail)
# - MAIL_FROM_ADDRESS correcto
```

### ❌ "Permission denied" en Linux/Mac

```bash
sudo chown -R $USER:$USER backend/storage
sudo chmod -R 775 backend/storage
```

### ❌ El frontend muestra error de conexión

**Solución**: Verifica que el backend esté corriendo.

```bash
# Ver estado
docker-compose ps

# Reiniciar backend
docker-compose restart backend

# Ver logs
docker-compose logs -f backend
```

## 🔧 Comandos Útiles

### Reiniciar un servicio específico

```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mysql
```

### Acceder a la terminal de un contenedor

```bash
# Backend (Laravel)
docker exec -it elgalpon_backend bash

# Una vez dentro, puedes ejecutar comandos de Artisan:
php artisan route:list
php artisan tinker
exit

# MySQL
docker exec -it elgalpon_mysql mysql -u elgalpon_user -pelgalpon_pass elgalpon
```

### Limpiar todo y empezar de nuevo

```bash
# ⚠️ CUIDADO: Esto borra TODO (incluida la base de datos)
docker-compose down -v
docker-compose up -d --build
```

### Ver uso de recursos

```bash
docker stats
```

## 📝 Estructura del Proyecto

```
ElGalpon/
├── backend/                    # API Laravel
│   ├── app/
│   ├── database/
│   │   └── backup/             # Backups de BD
│   ├── routes/
│   └── Dockerfile              # Configuración Docker del backend
│
├── galp-n-inventory-hub/       # Frontend React
│   ├── src/
│   ├── Dockerfile              # Configuración Docker del frontend
│   └── nginx.conf              # Configuración del servidor web
│
├── docker-compose.yml          # Orquestación de todos los servicios
├── .env                        # Variables de entorno (NO subir a Git)
├── .env.docker.example         # Ejemplo de variables de entorno
└── DOCKER_GUIDE.md             # Esta guía
```

## 🎓 Conceptos Importantes

### ¿Qué hace Docker?

Docker crea "contenedores" que son como mini computadoras aisladas. Cada contenedor tiene:

- **elgalpon_mysql**: Base de datos MySQL 8.0
- **elgalpon_backend**: Servidor PHP con Laravel
- **elgalpon_frontend**: Servidor Nginx con React

### ¿Por qué usar Docker?

✅ **Mismo entorno para todos**: "En mi máquina funciona" → Ya no es problema
✅ **Fácil de instalar**: Un solo comando (`docker-compose up`)
✅ **Aislado**: No interfiere con tu XAMPP, PHP local, etc.
✅ **Producción lista**: El mismo Docker se puede usar en el servidor

### ¿Los datos se borran al apagar?

❌ **NO** - Los datos de MySQL están en un "volumen" persistente.
- Puedes hacer `docker-compose down` y `docker-compose up` sin perder datos.
- Solo se borran si haces `docker-compose down -v` (la opción `-v` borra volúmenes)

## 📞 Soporte

Si algo no funciona:

1. **Revisa los logs**: `docker-compose logs -f`
2. **Verifica el estado**: `docker-compose ps`
3. **Reinicia**: `docker-compose restart`
4. **Busca el error** en Google con "docker" + el mensaje de error
5. **Contacta al equipo**

## 🎉 ¡Listo!

Si llegaste hasta aquí y todo funciona, ¡felicitaciones! 🎊

Ahora puedes:
- ✅ Iniciar sesión en http://localhost:8080
- ✅ Explorar el código
- ✅ Hacer cambios
- ✅ Probar nuevas funcionalidades

**Recuerda**: Los cambios en el código se reflejan automáticamente (hot reload), pero si modificas dependencias o Dockerfiles, debes hacer `docker-compose up -d --build`.

---

**Creado por**: El equipo de El Galpón 🌾
**Última actualización**: Febrero 2026

