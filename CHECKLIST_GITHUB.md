# ✅ CHECKLIST FINAL - Antes de Subir a GitHub

## 📋 Verificaciones Obligatorias

### 1. Archivos Sensibles (¡IMPORTANTE!)

```bash
# Ejecuta este comando para verificar
git status
```

**Verifica que estos archivos NO aparezcan:**
- [ ] `.env` (debe estar en .gitignore)
- [ ] `backend/.env`
- [ ] Archivos con contraseñas o tokens
- [ ] `backend/database/database.sqlite`

**Si aparecen**, ¡NO hagas commit! Agrégalos al `.gitignore` primero.

---

### 2. Archivos Docker Presentes

Verifica que existan estos archivos:

- [ ] `docker-compose.yml`
- [ ] `backend/Dockerfile`
- [ ] `galp-n-inventory-hub/Dockerfile`
- [ ] `galp-n-inventory-hub/nginx.conf`
- [ ] `.env.docker.example`
- [ ] `.gitignore` (actualizado)

---

### 3. Scripts de Gestión

- [ ] `INICIAR_DOCKER.bat`
- [ ] `DETENER_DOCKER.bat`
- [ ] `verificar_docker.ps1`
- [ ] `crear_backup.ps1`

---

### 4. Documentación Completa

- [ ] `README.md` (actualizado con Docker)
- [ ] `DOCKER_GUIDE.md`
- [ ] `INSTALACION_COMPAÑEROS.md`
- [ ] `GIT_GUIDE.md`
- [ ] `RESUMEN_DOCKER.md`

---

### 5. Base de Datos

- [ ] `backend/database/backup/backup.sql` existe
- [ ] El backup tiene datos (no está vacío)
- [ ] `backend/database/backup/.gitkeep` existe

```bash
# Verificar tamaño del backup
ls -lh backend/database/backup/backup.sql
# Debe ser mayor a 10 KB
```

---

### 6. Configuración del Backend

- [ ] `backend/.env` NO está en Git
- [ ] `backend/.env.example` SÍ está en Git
- [ ] `backend/composer.json` existe
- [ ] `backend/routes/api.php` configurado

---

### 7. Configuración del Frontend

- [ ] `galp-n-inventory-hub/package.json` existe
- [ ] `galp-n-inventory-hub/.env` NO está en Git
- [ ] `galp-n-inventory-hub/src/` completo
- [ ] `galp-n-inventory-hub/dist/` NO está en Git

---

## 🔧 Comandos de Verificación

### Verificar qué se va a subir:

```bash
cd C:\Users\manue\PhpstormProjects\ElGalpon
git status
git diff
```

### Verificar .gitignore:

```bash
# Estos NO deben aparecer en git status:
# - .env
# - node_modules/
# - vendor/
# - backend/storage/logs/*.log
# - dist/
```

### Verificar tamaño del backup:

```bash
cd backend\database\backup
dir backup.sql
# Debe mostrar un archivo con tamaño (no 0 bytes)
```

---

## 🚀 Pasos para Subir a GitHub

### Paso 1: Crear Repositorio en GitHub

1. Ve a https://github.com
2. Click en "+" → "New repository"
3. Nombre: `ElGalpon` o `ElGalpon-Inventory`
4. Visibilidad: **Private** (recomendado)
5. NO marcar "Initialize with README"
6. Click "Create repository"

### Paso 2: Configurar Git Local (si no está configurado)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu_email@ejemplo.com"
```

### Paso 3: Verificar Estado Actual

```bash
cd C:\Users\manue\PhpstormProjects\ElGalpon
git status
```

**¿Ya está inicializado Git?**
- Si dice "On branch main" → Sí ✅
- Si dice "not a git repository" → No, ejecuta: `git init`

### Paso 4: Agregar Archivos

```bash
# Ver qué se va a agregar
git add --dry-run .

# Si todo se ve bien, agregar de verdad
git add .

# Verificar
git status
```

**🔴 STOP! Verifica que NO aparezcan:**
- `.env`
- `node_modules/`
- `vendor/`
- `.log` files

### Paso 5: Hacer Commit

```bash
git commit -m "🐳 Dockerizar proyecto completo: Backend Laravel + Frontend React + MySQL

- Agregar Dockerfiles para backend y frontend
- Configurar docker-compose.yml con 3 servicios
- Crear scripts de gestión (INICIAR_DOCKER.bat, DETENER_DOCKER.bat)
- Agregar documentación completa (Docker, Git, Instalación)
- Crear backup automático de base de datos
- Actualizar README con instrucciones Docker
- Configurar .gitignore para Docker
"
```

### Paso 6: Agregar Remoto

```bash
# Reemplaza <TU_USUARIO> con tu usuario de GitHub
git remote add origin https://github.com/<TU_USUARIO>/ElGalpon.git

# Si ya existe, cambia la URL:
git remote set-url origin https://github.com/<TU_USUARIO>/ElGalpon.git

# Verificar
git remote -v
```

### Paso 7: Subir a GitHub

```bash
# Renombrar rama a main (si es necesario)
git branch -M main

# Subir
git push -u origin main
```

**Si pide autenticación:**
- Usuario: Tu usuario de GitHub
- Contraseña: **Personal Access Token** (NO tu contraseña)

**¿No tienes token?**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Permisos: Marca "repo"
4. Copia el token
5. Úsalo como contraseña

### Paso 8: Verificar en GitHub

1. Ve a tu repositorio en GitHub
2. Verifica que veas:
   - ✅ README.md se muestra correctamente
   - ✅ Carpetas `backend/` y `galp-n-inventory-hub/`
   - ✅ `docker-compose.yml`
   - ✅ Archivos `.md` de documentación
   - ❌ `.env` NO debe aparecer
   - ❌ `node_modules/` NO debe aparecer

---

## 🎓 Compartir con Tu Compañero

### Opción 1: Agregar Colaborador (Recomendado)

1. GitHub → Tu repositorio → Settings
2. Collaborators → Add people
3. Escribe el usuario de GitHub de tu compañero
4. Enviar invitación

### Opción 2: Hacer Público (No recomendado)

1. GitHub → Tu repositorio → Settings
2. Danger Zone → Change visibility → Make public

---

## 📧 Mensaje para Tu Compañero

Envíale este mensaje:

```
Hola! Ya subí el proyecto a GitHub:

🔗 Link: https://github.com/<TU_USUARIO>/ElGalpon

📋 Para instalarlo:

1. Instalar Docker Desktop: https://www.docker.com/products/docker-desktop

2. Clonar el repo:
   git clone https://github.com/<TU_USUARIO>/ElGalpon.git
   cd ElGalpon

3. Configurar email:
   copy .env.docker.example .env
   notepad .env
   (Agregar tus credenciales de Gmail)

4. Iniciar:
   docker-compose up -d

5. Acceder:
   http://localhost:8080

📖 Instrucciones detalladas en: INSTALACION_COMPAÑEROS.md

¡Cualquier duda me avisas!
```

---

## 🆘 Solución de Problemas

### Error: "failed to push"

```bash
# Alguien hizo cambios antes
git pull origin main --rebase
git push origin main
```

### Error: "Permission denied"

- Verifica que tu token tenga permisos "repo"
- Genera un nuevo token si es necesario

### Error: ".env aparece en git status"

```bash
# NO hacer commit todavía
git restore --staged .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "🔒 Agregar .env al gitignore"
```

### Subí .env por error

```bash
# Si NO has hecho push aún:
git reset --soft HEAD~1
git restore --staged .env

# Si YA hiciste push:
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "🔒 Remover .env del tracking"
git push origin main
```

---

## ✅ Checklist Post-Push

Después de subir, verifica:

- [ ] El repositorio es visible en GitHub
- [ ] README.md se renderiza correctamente
- [ ] `.env` NO aparece en los archivos
- [ ] Puedes clonar el repo en otra carpeta de prueba
- [ ] Tu compañero recibió la invitación de colaborador
- [ ] Las guías de instalación son claras

---

## 🎉 ¡Listo!

Si completaste todos los pasos:

✅ Tu código está en GitHub  
✅ Tu compañero puede clonarlo  
✅ La instalación es automática con Docker  
✅ Todo está documentado  

**Ahora pueden trabajar en paralelo sin conflictos!** 🚀

---

## 📊 Siguientes Pasos

### Para trabajar en nuevas funcionalidades:

```bash
# TÚ:
git checkout -b feature/productos-extra
# ...hacer cambios...
git push origin feature/productos-extra

# TU COMPAÑERO:
git checkout -b feature/reportes
# ...hacer cambios...
git push origin feature/reportes

# Luego hacen Pull Requests en GitHub
```

### Para mantener actualizado:

```bash
# Cada día antes de trabajar:
git checkout main
git pull origin main

# Fusionar cambios a tu rama:
git checkout feature/mi-rama
git merge main
```

---

**🎊 ¡Felicitaciones! Tu proyecto está listo para trabajo colaborativo.**

Cualquier duda, consulta:
- `DOCKER_GUIDE.md` - Comandos Docker
- `GIT_GUIDE.md` - Comandos Git
- `INSTALACION_COMPAÑEROS.md` - Instalación paso a paso
- `RESUMEN_DOCKER.md` - Resumen ejecutivo

