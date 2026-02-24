import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/productos/nuevo': 'Agregar Producto',
  '/categorias': 'Categorías',
  '/stock-bajo': 'Stock Bajo',
  '/presupuesto': 'Presupuesto',
  '/reportes': 'Reportes',
  '/proveedores': 'Proveedores',
  '/cotizaciones': 'Cotizaciones',
  '/usuarios': 'Usuarios',
  '/configuracion': 'Configuración',
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'El Galpón';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-[280px] flex flex-col min-h-screen">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
        <footer className="text-center text-xs text-muted-foreground py-3 border-t border-border px-4">
          El Galpón - Sistema de Inventario © 2026 • Alcalá, Valle del Cauca
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
