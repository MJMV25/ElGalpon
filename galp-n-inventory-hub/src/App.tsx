import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import NewProductPage from "@/pages/NewProductPage";
import InventoryMovementsPage from "@/pages/InventoryMovementsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import LowStockPage from "@/pages/LowStockPage";
import BudgetPage from "@/pages/BudgetPage";
import ReportsPage from "@/pages/ReportsPage";
import OwnerPanelPage from "@/pages/OwnerPanelPage";
import AuditoriaPage from "@/pages/AuditoriaPage";
import SuppliersPage from "@/pages/SuppliersPage";
import QuotationsPage from "@/pages/QuotationsPage";
import NewQuotationPage from "@/pages/NewQuotationPage";
import QuotationDetailPage from "@/pages/QuotationDetailPage";
import QuotationComparatorPage from "@/pages/QuotationComparatorPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import CotizacionProveedorPublicPage from "@/pages/CotizacionProveedorPublicPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Componente para rutas que solo pueden acceder administradores
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.rol !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppContent = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const checkAuth = useAuthStore(s => s.checkAuth);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsInitializing(false);
    };
    init();
  }, [checkAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Ruta pública para proveedores */}
      <Route path="/cotizacion-proveedor/:token" element={<CotizacionProveedorPublicPage />} />

      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="productos/nuevo" element={<AdminRoute><NewProductPage /></AdminRoute>} />
        <Route path="movimientos-inventario" element={<AdminRoute><InventoryMovementsPage /></AdminRoute>} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="stock-bajo" element={<LowStockPage />} />
        <Route path="presupuesto" element={<BudgetPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="panel-dueno" element={<AdminRoute><OwnerPanelPage /></AdminRoute>} />
        <Route path="auditoria" element={<AdminRoute><AuditoriaPage /></AdminRoute>} />
        <Route path="proveedores" element={<SuppliersPage />} />
        <Route path="cotizaciones" element={<QuotationsPage />} />
        <Route path="cotizaciones/nueva" element={<AdminRoute><NewQuotationPage /></AdminRoute>} />
        <Route path="cotizaciones/:id" element={<QuotationDetailPage />} />
        <Route path="cotizaciones/:id/comparador" element={<QuotationComparatorPage />} />
        <Route path="usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="configuracion" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
