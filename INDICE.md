# 📚 ÍNDICE DE DOCUMENTACIÓN - El Galpón

¡Bienvenido al proyecto El Galpón! 🌾

Este archivo te guía para encontrar la información que necesitas.

---

## 🚀 EMPEZAR RÁPIDO

### Si eres NUEVO en el proyecto:
👉 Lee: **[INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md)**

Instalación en 5 minutos con Docker.

---

## 📖 DOCUMENTACIÓN PRINCIPAL

### 1. **README.md** - Visión General
- Descripción del proyecto
- Stack tecnológico
- Usuarios por defecto
- Accesos y funcionalidades

### 2. **INSTALACION_COMPAÑEROS.md** - Guía de Instalación
- Instalación paso a paso con Docker
- Configuración de variables de entorno
- Solución de problemas comunes
- Comandos esenciales

### 3. **DOCKER_GUIDE.md** - Guía de Docker
- Comandos Docker detallados
- Gestión de contenedores
- Restaurar base de datos
- Troubleshooting avanzado

### 4. **GIT_GUIDE.md** - Guía de Git
- Cómo subir el proyecto a GitHub
- Trabajo con ramas
- Resolución de conflictos
- Flujo de trabajo en equipo

### 5. **RESUMEN_DOCKER.md** - Resumen Ejecutivo
- Visión general de la dockerización
- Ventajas del sistema
- Comparación antes/después
- Conceptos importantes

### 6. **CHECKLIST_GITHUB.md** - Checklist Pre-Git
- Verificaciones antes de subir
- Pasos para push a GitHub
- Compartir con colaboradores
- Verificación post-push

---

## 🛠️ SCRIPTS ÚTILES

### Windows (Doble click)

#### `INICIAR_DOCKER.bat`
Inicia todos los servicios con Docker

#### `DETENER_DOCKER.bat`
Detiene todos los servicios Docker

#### `INICIAR_SERVIDORES.bat` (Desarrollo local)
Inicia backend y frontend sin Docker

#### `DETENER_SERVIDORES.bat` (Desarrollo local)
Detiene servidores locales

### PowerShell (Ejecutar en terminal)

#### `.\verificar_docker.ps1`
Verifica que Docker esté instalado y configurado

#### `.\verificar_git.ps1`
Verifica que todo esté listo para Git

#### `.\crear_backup.ps1`
Crea backup de la base de datos

---

## 🎯 CASOS DE USO

### "Soy nuevo, ¿cómo instalo el proyecto?"
1. Lee: [INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md)
2. Ejecuta: `.\verificar_docker.ps1`
3. Ejecuta: `INICIAR_DOCKER.bat`

### "¿Cómo funciona Docker?"
Lee: [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

### "¿Cómo subo el proyecto a GitHub?"
1. Lee: [CHECKLIST_GITHUB.md](CHECKLIST_GITHUB.md)
2. Ejecuta: `.\verificar_git.ps1`
3. Sigue los pasos del checklist

### "¿Cómo trabajo con mi compañero?"
Lee: [GIT_GUIDE.md](GIT_GUIDE.md) - Sección "Workflow para Trabajar en Equipo"

### "Tengo problemas con Docker"
Lee: [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Sección "Solución de Problemas"

### "¿Cómo creo una rama nueva?"
```bash
git checkout -b feature/nombre-funcionalidad
```
Más info en: [GIT_GUIDE.md](GIT_GUIDE.md)

### "¿Cómo hago backup de la BD?"
```bash
.\crear_backup.ps1
```

### "¿Cómo veo los logs?"
```bash
docker-compose logs -f
```
Más comandos en: [DOCKER_GUIDE.md](DOCKER_GUIDE.md)

---

## 📂 ESTRUCTURA DEL PROYECTO

```
ElGalpon/
│
├── 📄 README.md                          # Visión general
├── 📄 INSTALACION_COMPAÑEROS.md          # Guía instalación
├── 📄 DOCKER_GUIDE.md                    # Guía Docker
├── 📄 GIT_GUIDE.md                       # Guía Git
├── 📄 RESUMEN_DOCKER.md                  # Resumen ejecutivo
├── 📄 CHECKLIST_GITHUB.md                # Checklist pre-Git
├── 📄 INDICE.md                          # Este archivo
│
├── 🐳 docker-compose.yml                 # Orquestación Docker
├── 📧 .env.docker.example                # Ejemplo variables entorno
├── 🚫 .gitignore                         # Archivos ignorados por Git
│
├── 🎬 INICIAR_DOCKER.bat                 # Iniciar con Docker
├── 🛑 DETENER_DOCKER.bat                 # Detener Docker
├── 🎬 INICIAR_SERVIDORES.bat             # Iniciar sin Docker
├── 🛑 DETENER_SERVIDORES.bat             # Detener sin Docker
│
├── 🔧 verificar_docker.ps1               # Verificar Docker
├── 🔧 verificar_git.ps1                  # Verificar Git
├── 💾 crear_backup.ps1                   # Backup BD
│
├── 📁 backend/                           # API Laravel
│   ├── 🐳 Dockerfile
│   ├── 📱 app/
│   ├── 🗄️ database/
│   │   └── backup/
│   │       └── backup.sql                # Backup BD
│   └── 🛣️ routes/
│
└── 📁 galp-n-inventory-hub/             # Frontend React
    ├── 🐳 Dockerfile
    ├── ⚙️ nginx.conf
    └── 📱 src/
```

---

## 🔑 ACCESOS

### Desarrollo Local (sin Docker)
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- phpMyAdmin: http://localhost/phpmyadmin

### Con Docker
- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- MySQL: localhost:3306

### Usuarios de Prueba
- **Admin**: manuela.gomez@elgalpon-alcala.com
- **Admin**: carlos.gomez@elgalpon-alcala.com
- **Admin**: mjmunoz_108@cue.edu.co
- **Admin**: sgomez_21@cue.edu.co
- **Empleado**: sebastian.rodriguez@elgalpon-alcala.com

---

## 🆘 SOPORTE

### Orden de Consulta:

1. **Busca en la documentación** (este índice te guía)
2. **Ejecuta scripts de verificación**:
   - `.\verificar_docker.ps1`
   - `.\verificar_git.ps1`
3. **Revisa los logs**:
   - `docker-compose logs -f`
4. **Consulta solución de problemas**:
   - [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Sección "Solución de Problemas"
   - [INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md) - Sección "Solución de Problemas"
5. **Contacta al equipo**

---

## 📞 COMANDOS MÁS USADOS

### Docker
```bash
docker-compose up -d              # Iniciar
docker-compose down               # Detener
docker-compose logs -f            # Ver logs
docker-compose restart            # Reiniciar
docker-compose ps                 # Ver estado
```

### Git
```bash
git status                        # Ver estado
git pull origin main              # Actualizar
git add .                         # Agregar cambios
git commit -m "mensaje"           # Guardar cambios
git push origin main              # Subir cambios
git checkout -b feature/nombre    # Crear rama
```

### Backend (dentro del contenedor)
```bash
docker exec -it elgalpon_backend bash
php artisan migrate               # Ejecutar migraciones
php artisan db:seed               # Ejecutar seeders
php artisan tinker                # Consola interactiva
```

---

## 🎓 RECURSOS EXTERNOS

### Aprender Docker
- [Docker para principiantes](https://docs.docker.com/get-started/)
- [Docker Compose](https://docs.docker.com/compose/)

### Aprender Git
- [Git - La guía sencilla](https://rogerdudler.github.io/git-guide/index.es.html)
- [GitHub Guides](https://guides.github.com/)

### Tecnologías del Proyecto
- [Laravel 11 Docs](https://laravel.com/docs/11.x)
- [React 18 Docs](https://react.dev/)
- [MySQL 8 Docs](https://dev.mysql.com/doc/refman/8.0/en/)

---

## 📝 NOTAS IMPORTANTES

### ⚠️ NO Subir a Git:
- `.env` (contiene credenciales)
- `node_modules/`
- `vendor/`
- `*.log`
- Base de datos SQLite

### ✅ SÍ Subir a Git:
- Código fuente
- Archivos Docker
- Documentación
- `.env.docker.example`
- `backup.sql`
- `.gitignore`

### 💾 Backups:
- Crear backup antes de cambios importantes
- Ejecutar: `.\crear_backup.ps1`
- Los backups se guardan en: `backend/database/backup/`

### 🔄 Actualizaciones:
- Hacer `git pull` antes de empezar a trabajar
- Crear ramas para nuevas funcionalidades
- Hacer Pull Requests para fusionar cambios

---

## 🎉 QUICK START

### Para INSTALAR (primera vez):
```bash
# 1. Clonar
git clone <URL>
cd ElGalpon

# 2. Configurar
copy .env.docker.example .env
notepad .env  # Agregar credenciales

# 3. Iniciar
docker-compose up -d

# 4. Acceder
# http://localhost:8080
```

### Para DESARROLLAR (día a día):
```bash
# 1. Actualizar
git pull origin main

# 2. Crear rama
git checkout -b feature/mi-funcionalidad

# 3. Trabajar...
# (editar código)

# 4. Guardar
git add .
git commit -m "✨ Descripción"
git push origin feature/mi-funcionalidad

# 5. Pull Request en GitHub
```

---

## ✅ TODO CLARO?

Si completaste la lectura de este índice, ya sabes:

- ✅ Dónde encontrar cada tipo de información
- ✅ Qué scripts ejecutar para cada tarea
- ✅ Cómo pedir ayuda si tienes problemas
- ✅ Los comandos más importantes

**Próximo paso**: Lee [INSTALACION_COMPAÑEROS.md](INSTALACION_COMPAÑEROS.md)

---

**🌾 Desarrollado para El Galpón - Alcalá, Valle del Cauca, Colombia 🇨🇴**

¡Éxito con el proyecto! 🚀

