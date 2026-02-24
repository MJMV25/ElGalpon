# 🐳 Guía de Docker para El Galpón

## 📋 Requisitos Previos
- Docker Desktop instalado
- Git instalado

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd ElGalpon
```

### 2. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
copy .env.docker.example .env

# Editar .env y agregar tus credenciales de Gmail
notepad .env
```

### 3. Iniciar los contenedores
```bash
docker-compose up -d
```

### 4. Esperar a que todo esté listo (primera vez tarda ~3-5 minutos)
```bash
# Ver logs en tiempo real
docker-compose logs -f
```

### 5. Acceder a la aplicación
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8000
- **Base de datos:** localhost:3306

## 🛑 Comandos Útiles

### Detener los contenedores
```bash
docker-compose down
```

### Reiniciar los contenedores
```bash
docker-compose restart
```

### Ver logs de un servicio específico
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### Acceder a la terminal de un contenedor
```bash
# Backend
docker exec -it elgalpon_backend bash

# MySQL
docker exec -it elgalpon_mysql mysql -u elgalpon_user -pelgalpon_pass elgalpon
```

### Ejecutar migraciones manualmente
```bash
docker exec -it elgalpon_backend php artisan migrate
```

### Ejecutar seeders
```bash
docker exec -it elgalpon_backend php artisan db:seed
```

### Limpiar todo y empezar de nuevo
```bash
docker-compose down -v
docker-compose up -d --build
```

## 📊 Restaurar Base de Datos

Si tienes un backup SQL:

### Opción 1: Restaurar automáticamente al iniciar
```bash
# 1. Coloca tu archivo .sql en backend/database/backup/
copy backup.sql backend\database\backup\

# 2. Reinicia los contenedores
docker-compose down -v
docker-compose up -d
```

### Opción 2: Restaurar manualmente
```bash
# Importar backup
docker exec -i elgalpon_mysql mysql -u elgalpon_user -pelgalpon_pass elgalpon < backup.sql

# O desde dentro del contenedor
docker exec -it elgalpon_mysql bash
mysql -u elgalpon_user -pelgalpon_pass elgalpon < /docker-entrypoint-initdb.d/backup.sql
```

## 🔧 Solución de Problemas

### El backend no se conecta a la base de datos
```bash
# Verificar que MySQL esté corriendo
docker-compose ps

# Ver logs de MySQL
docker-compose logs mysql

# Esperar a que MySQL termine de inicializar
docker-compose logs -f mysql | grep "ready for connections"
```

### El frontend no se conecta al backend
- Verifica que el archivo `.env` del frontend tenga: `VITE_API_URL=http://localhost:8000/api`
- Reconstruye el frontend: `docker-compose up -d --build frontend`

### Puerto ya en uso
```bash
# Si los puertos 8000, 8080 o 3306 están ocupados, edita docker-compose.yml
# y cambia los puertos. Por ejemplo:
# "8001:8000" en lugar de "8000:8000"
```

### Limpiar todo (CUIDADO: borra la base de datos)
```bash
docker-compose down -v
docker system prune -a --volumes
```

## 📦 Actualizar el Proyecto

Cuando tu compañero suba cambios:

```bash
# 1. Obtener los últimos cambios
git pull origin main

# 2. Reconstruir solo si hubo cambios en código
docker-compose up -d --build

# 3. Si hubo cambios en la base de datos
docker exec -it elgalpon_backend php artisan migrate
```

## 🌐 Variables de Entorno

El archivo `.env` debe contener:

```env
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_contraseña_de_app_de_gmail
MAIL_FROM_ADDRESS=tu_email@gmail.com
```

### Cómo obtener la contraseña de aplicación de Gmail:
1. Ve a https://myaccount.google.com/security
2. Activa "Verificación en 2 pasos"
3. Ve a "Contraseñas de aplicaciones"
4. Genera una nueva contraseña
5. Úsala en `MAIL_PASSWORD`

## 📝 Notas Importantes

- **Primera vez:** La construcción puede tardar 5-10 minutos
- **Datos persistentes:** Los datos de MySQL se guardan en un volumen Docker
- **Desarrollo:** Para desarrollo local, usa los servidores nativos (más rápido)
- **Producción:** Docker es ideal para desplegar en servidores

## 🆘 Soporte

Si algo no funciona:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica que todos los servicios estén corriendo: `docker-compose ps`
3. Reinicia todo: `docker-compose restart`
4. Contacta al equipo de desarrollo

