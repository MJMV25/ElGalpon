# 📤 Guía: Subir el Proyecto a GitHub

## ✅ Checklist Antes de Subir

Verifica que estos archivos **NO** estén siendo rastreados por Git:

- [ ] `.env` (credenciales sensibles)
- [ ] `node_modules/`
- [ ] `vendor/`
- [ ] `backend/storage/logs/*.log`
- [ ] Backups temporales (solo `backup.sql` debe subirse)

## 🚀 Pasos para Subir a GitHub

### 1. Crear el Repositorio en GitHub

1. Ve a https://github.com
2. Click en el botón "+" → "New repository"
3. Nombre: `ElGalpon` o `ElGalpon-Inventory-System`
4. Descripción: "Sistema de gestión de inventario para agropecuaria y veterinaria"
5. Visibilidad: **Private** (recomendado) o Public
6. **NO** marques "Initialize with README" (ya tienes uno)
7. Click en "Create repository"

### 2. Inicializar Git (si no está inicializado)

```bash
cd C:\Users\manue\PhpstormProjects\ElGalpon

# Verificar si ya está inicializado
git status

# Si no está inicializado:
git init
```

### 3. Agregar el Remoto

```bash
# Reemplaza <USUARIO> con tu usuario de GitHub
git remote add origin https://github.com/<USUARIO>/ElGalpon.git

# O si usas SSH (recomendado):
git remote add origin git@github.com:<USUARIO>/ElGalpon.git

# Verificar que se agregó correctamente
git remote -v
```

### 4. Agregar Archivos al Staging

```bash
# Ver qué archivos se van a subir
git status

# Agregar todos los archivos (respetando .gitignore)
git add .

# Verificar archivos agregados
git status
```

### 5. Hacer el Primer Commit

```bash
git commit -m "🎉 Initial commit: Sistema El Galpón completo con Docker"
```

### 6. Configurar la Rama Principal

```bash
# Renombrar la rama a 'main' (si es necesario)
git branch -M main
```

### 7. Subir al Repositorio

```bash
# Primera vez
git push -u origin main

# Si da error de autenticación, GitHub te pedirá login
```

### 8. Verificar en GitHub

1. Ve a tu repositorio en GitHub
2. Deberías ver todos los archivos
3. Verifica que el README.md se vea bien

## 🔐 Configurar Credenciales de Git

### Configurar Usuario

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu_email@ejemplo.com"
```

### Autenticación con GitHub

#### Opción 1: Personal Access Token (Recomendado)

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Generate new token (classic)"
3. Nombre: "ElGalpon Token"
4. Permisos: Marca "repo" (acceso completo a repositorios)
5. Click "Generate token"
6. **¡GUARDA EL TOKEN!** No podrás verlo de nuevo
7. Cuando Git pida password, usa el token en lugar de tu contraseña

#### Opción 2: SSH (Más seguro)

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "tu_email@ejemplo.com"

# Copiar la clave pública
cat ~/.ssh/id_ed25519.pub

# Agregar en GitHub → Settings → SSH and GPG keys → New SSH key
```

## 🌿 Crear Ramas para Funcionalidades

### Crear Rama para tu Compañero

```bash
# Crear y cambiar a una nueva rama
git checkout -b feature/nombre-funcionalidad

# Ejemplo:
git checkout -b feature/reportes
git checkout -b feature/notificaciones
git checkout -b fix/correccion-deudas
```

### Trabajar con Ramas

```bash
# Ver ramas existentes
git branch

# Cambiar de rama
git checkout main
git checkout feature/reportes

# Subir una rama nueva
git push -u origin feature/reportes

# Actualizar rama con cambios de main
git checkout feature/reportes
git merge main
```

### Fusionar Ramas (Pull Request)

**Opción 1: Por GitHub (Recomendado)**

1. Push tu rama: `git push origin feature/reportes`
2. Ve a GitHub
3. Verás un botón "Compare & pull request"
4. Describe los cambios
5. Click "Create pull request"
6. Tu compañero revisa y aprueba
7. Click "Merge pull request"

**Opción 2: Por Consola**

```bash
# Cambiar a main
git checkout main

# Fusionar la rama
git merge feature/reportes

# Subir los cambios
git push origin main

# Opcional: Borrar la rama
git branch -d feature/reportes
git push origin --delete feature/reportes
```

## 👥 Workflow para Trabajar en Equipo

### Tu Compañero Clona el Repo

```bash
git clone https://github.com/<USUARIO>/ElGalpon.git
cd ElGalpon
```

### Flujo de Trabajo Diario

```bash
# 1. Actualizar tu rama local con los cambios del servidor
git pull origin main

# 2. Crear una rama para tu trabajo
git checkout -b feature/mi-funcionalidad

# 3. Hacer cambios y commits
git add .
git commit -m "✨ Agregar nueva funcionalidad X"

# 4. Subir tu rama
git push origin feature/mi-funcionalidad

# 5. Crear Pull Request en GitHub
# 6. Después de merge, actualizar tu main local
git checkout main
git pull origin main

# 7. Borrar rama local
git branch -d feature/mi-funcionalidad
```

## 📝 Convenciones de Commits

Usa emojis y mensajes descriptivos:

```bash
# Nuevas funcionalidades
git commit -m "✨ Agregar sistema de reportes PDF"

# Corrección de bugs
git commit -m "🐛 Corregir cálculo de deuda total"

# Mejoras de rendimiento
git commit -m "⚡ Optimizar consulta de productos"

# Documentación
git commit -m "📝 Actualizar guía de instalación"

# Configuración
git commit -m "🔧 Configurar Docker para producción"

# Estilo/formato
git commit -m "💄 Mejorar diseño responsive del dashboard"

# Tests
git commit -m "✅ Agregar tests para autenticación"

# Refactorización
git commit -m "♻️ Refactorizar servicio de cotizaciones"
```

## 🚫 Qué NO Subir a Git

Estos archivos están en `.gitignore`:

- ❌ `.env` (contiene credenciales)
- ❌ `node_modules/` (se instala con npm install)
- ❌ `vendor/` (se instala con composer install)
- ❌ `backend/storage/logs/*.log`
- ❌ `backend/database/backup/*.sql` (excepto backup.sql)
- ❌ Archivos compilados (`dist/`, `build/`)

## 🔍 Comandos Útiles

```bash
# Ver historial de commits
git log --oneline --graph --all

# Ver cambios sin commitear
git diff

# Deshacer cambios locales
git checkout -- archivo.txt

# Deshacer último commit (mantiene cambios)
git reset --soft HEAD~1

# Ver ramas remotas
git branch -r

# Actualizar lista de ramas remotas
git fetch --prune

# Ver quién modificó cada línea de un archivo
git blame archivo.txt

# Buscar en el historial
git log --grep="cotizacion"
```

## 🆘 Solución de Problemas

### Error: "fatal: remote origin already exists"

```bash
# Ver remotos actuales
git remote -v

# Cambiar URL del remoto
git remote set-url origin https://github.com/<USUARIO>/ElGalpon.git
```

### Error: "Updates were rejected"

```bash
# Alguien subió cambios antes que tú
git pull origin main
git push origin main
```

### Error: "Merge conflict"

```bash
# 1. Git te mostrará los archivos en conflicto
git status

# 2. Abre cada archivo y busca:
<<<<<<< HEAD
tu código
=======
código de otro
>>>>>>> branch-name

# 3. Edita el archivo manualmente
# 4. Marca como resuelto
git add archivo-resuelto.txt
git commit -m "🔀 Resolver conflicto de merge"
```

### Subí algo por error

```bash
# Si NO has hecho push aún
git reset --soft HEAD~1
git restore --staged archivo.txt

# Si YA hiciste push
# 1. Agregar al .gitignore
echo "archivo-secreto.txt" >> .gitignore

# 2. Remover del tracking
git rm --cached archivo-secreto.txt

# 3. Commit y push
git commit -m "🔒 Remover archivo sensible"
git push origin main

# 4. ⚠️ El archivo sigue en el historial!
# Para eliminarlo completamente del historial:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch archivo-secreto.txt" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

## 📊 Estructura de Ramas Recomendada

```
main (producción)
│
├── develop (desarrollo)
│   ├── feature/sistema-reportes
│   ├── feature/notificaciones-push
│   └── feature/dashboard-graficos
│
├── hotfix/corregir-bug-critico
└── release/v1.1.0
```

## ✅ Checklist Final

Antes de hacer tu primer push:

- [ ] `.env` NO está en Git
- [ ] `backup.sql` SÍ está en Git
- [ ] README.md está actualizado
- [ ] DOCKER_GUIDE.md existe
- [ ] INSTALACION_COMPAÑEROS.md existe
- [ ] `.gitignore` configurado correctamente
- [ ] Archivos compilados excluidos

---

**¡Listo para Git!** 🚀

Ahora tu compañero puede hacer:

```bash
git clone <URL>
cd ElGalpon
docker-compose up -d
```

¡Y tener todo funcionando en minutos! 🎉

