export { default as authService } from './authService';
export { default as categoriasService } from './categoriasService';
export { default as productosService } from './productosService';
export { default as proveedoresService } from './proveedoresService';
export { default as cotizacionesService } from './cotizacionesService';
export { default as reportesService } from './reportesService';
export { default as usuariosService } from './usuariosService';
export { default as notificacionesService } from './notificacionesService';
export { default as auditoriaService } from './auditoriaService';

// Re-export types
export type { User, AuthResponse } from './authService';
export type { Categoria, Subcategoria } from './categoriasService';
export type { Producto, MovimientoInventario, ProductosFilter, MovimientosFilter } from './productosService';
export type { Proveedor } from './proveedoresService';
export type { Cotizacion, CotizacionProducto, CotizacionProveedor, CotizacionRespuesta, ComparacionResponse } from './cotizacionesService';
export type { DashboardData, InventarioValorizadoResponse, MovimientosReporte, ProductoPorCategoria, StockAlertaResponse, DeudasProveedoresResponse, MovimientosFiltro } from './reportesService';
export type { CreateUserData, UpdateUserData } from './usuariosService';
export type { Notificacion } from './notificacionesService';
export type { AuditoriaItem, AuditoriaFiltros, AuditoriaMetaFiltros } from './auditoriaService';
