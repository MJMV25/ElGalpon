# 🏪 El Galpón - Sistema de Gestión de Inventario

Sistema completo de gestión de inventario para agropecuaria y veterinaria ubicada en Alcalá, Valle del Cauca, Colombia.

---

## 🚀 TECNOLOGÍAS

### **Backend:**
- Laravel 11+ (PHP 8.2+)
- **MySQL 8.0+** ⚠️ (NO SQLite)
- Laravel Sanctum (Autenticación)
- Laravel Mail (Envío de emails)

### **Frontend:**
- React 18+
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand (Estado global)
- React Router DOM

---

## 📋 REQUISITOS PREVIOS

Antes de clonar el proyecto, asegúrate de tener instalado:

- ✅ **Git** → https://git-scm.com/download/win
- ✅ **PHP 8.2+** → https://windows.php.net/download/
- ✅ **Composer** → https://getcomposer.org/download/
- ✅ **MySQL 8.0+** → https://dev.mysql.com/downloads/installer/ ⚠️ **IMPORTANTE**
- ✅ **Node.js 18+** → https://nodejs.org/
- ✅ **Editor de código** → VS Code o PHPStorm

---

## 🔧 INSTALACIÓN RÁPIDA

### **1. Clonar el repositorio:**

```bash
git clone https://github.com/MJMV25/ElGalpon.git
cd ElGalpon
git checkout develop
```

### **2. Configurar MySQL:**

Abre MySQL y crea la base de datos:

```sql
CREATE DATABASE elgalpon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### **3. Configurar Backend (Laravel):**

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
```

Edita `backend/.env` con tu configuración:

```env
# Base de datos MySQL
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=elgalpon
DB_USERNAME=root
DB_PASSWORD=tu-password-mysql

# Configuración de correo (Gmail)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD="tu-app-password"
MAIL_ENCRYPTION=tls
```

### **4. Migrar base de datos:**

```bash
php artisan migrate
php artisan db:seed
```

### **5. Configurar Frontend (React):**

```bash
cd ../galp-n-inventory-hub
npm install
```

### **6. Iniciar servidores:**

**Terminal 1 - Backend:**
```bash
cd backend
php artisan serve
```

**Terminal 2 - Frontend:**
```bash
cd galp-n-inventory-hub
npm run dev
```

### **7. Acceder:**

Abre http://localhost:8080 e inicia sesión con cualquiera de estos emails:

- `manuela.gomez@elgalpon-alcala.com` (Admin)
- `carlos.gomez@elgalpon-alcala.com` (Admin)
- `mjmunoz_108@cue.edu.co` (Admin)
- `sgomez_21@cue.edu.co` (Admin)
- `sebastian.rodriguez@elgalpon-alcala.com` (Empleado)

**Recibirás un código de 6 dígitos en tu correo para iniciar sesión.**

---

## 📚 DOCUMENTACIÓN

| Archivo | Descripción |
|---------|-------------|
| **`INICIO_RAPIDO.md`** | Guía completa paso a paso |
| **`GIT_WORKFLOW.md`** | Cómo trabajar con Git |
| **`ASIGNACION_TAREAS.md`** | División de trabajo |
| **`RESUMEN_GIT.md`** | Estado actual del proyecto |

---

## 📂 ESTRUCTURA

```
ElGalpon/
├── backend/              # API Laravel + MySQL
├── galp-n-inventory-hub/ # Frontend React + TypeScript
├── GIT_WORKFLOW.md       # Guía Git
├── INICIO_RAPIDO.md      # Setup completo
└── README.md             # Este archivo
```

---

## 🌿 RAMAS

```
main (producción)
└── develop (desarrollo) ⭐
    └── feature/* (funcionalidades)
```

---

## 📦 MÓDULOS

### **✅ Implementados:**
- Autenticación por email
- Gestión de usuarios
- Dashboard
- Productos y categorías
- Proveedores
- Cotizaciones

### **🚧 En desarrollo:**
- Inventario (movimientos)
- Reportes avanzados
- Notificaciones
- Pagos a proveedores

---

## 🔗 ENLACES

- **Repositorio:** https://github.com/MJMV25/ElGalpon
- **Backend:** http://localhost:8000/api
- **Frontend:** http://localhost:8080

---

## 🆘 PROBLEMAS COMUNES

### **No llega el código al correo:**
- Usa App Password de Gmail: https://myaccount.google.com/apppasswords

### **Error de base de datos:**
- Verifica que MySQL esté corriendo
- Verifica credenciales en `.env`

### **Puerto en uso:**
```bash
Stop-Process -Name php -Force
```

---

## 👥 EQUIPO

- Manuel Villalobos - Full Stack Developer
- [Compañero] - Full Stack Developer

---

**Última actualización:** 2026-02-21  
**Base de datos:** MySQL 8.0+  
**Repositorio:** https://github.com/MJMV25/ElGalpon

