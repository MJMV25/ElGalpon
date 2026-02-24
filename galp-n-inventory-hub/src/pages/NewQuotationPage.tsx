import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Package, Plus, Send, Star, Trash2, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const UNIDADES = ['Unidades', 'Bultos', 'Kilos', 'Litros', 'Frascos'] as const;

interface ProductoCotizacion {
  id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  especificaciones?: string;
  producto_id?: number;
}

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: {
    nombre: string;
  };
}

interface Proveedor {
  id: number;
  nombre_empresa: string;
  nit: string;
  email_administrativo: string;
  email_comercial: string;
  telefono_administrativo: string;
  telefono_contacto: string;
  nombre_asesor: string;
  ciudad: string;
  calificacion: number | null;
}

const steps = [
  { label: 'Información General', icon: 'ℹ️' },
  { label: 'Productos Solicitados', icon: '📦' },
  { label: 'Proveedores Invitados', icon: '👥' },
  { label: 'Revisión y Envío', icon: '✅' },
];

const NewQuotationPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Datos desde el backend
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Proveedor[]>([]);

  // Step 1
  const today = new Date().toISOString().split('T')[0];
  const defaultLimit = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const [titulo, setTitulo] = useState('');
  const [fechaLimite, setFechaLimite] = useState(defaultLimit);
  const [descripcion, setDescripcion] = useState('');

  // Step 2
  const [productos, setProductos] = useState<ProductoCotizacion[]>([]);

  // Step 3
  const [selectedProveedores, setSelectedProveedores] = useState<number[]>([]);
  const [searchProv, setSearchProv] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        const [productosRes, proveedoresRes] = await Promise.all([
          api.get('/productos'),
          api.get('/proveedores')
        ]);

        // Extraer productos
        let productos: Producto[] = [];
        if (productosRes.data?.success) {
          if (Array.isArray(productosRes.data.data?.data)) {
            productos = productosRes.data.data.data;
          } else if (Array.isArray(productosRes.data.data)) {
            productos = productosRes.data.data;
          }
        }
        setProductosDisponibles(productos);

        // Extraer proveedores
        let proveedores: Proveedor[] = [];
        if (proveedoresRes.data?.success) {
          if (Array.isArray(proveedoresRes.data.data?.data)) {
            proveedores = proveedoresRes.data.data.data;
          } else if (Array.isArray(proveedoresRes.data.data)) {
            proveedores = proveedoresRes.data.data;
          }
        }
        setProveedoresDisponibles(proveedores);

      } catch (error: any) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar productos y proveedores');
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const addProducto = () => {
    setProductos(prev => [...prev, {
      id: Date.now(),
      nombre: '',
      categoria: '',
      cantidad: 1,
      unidad: 'Unidades',
      producto_id: undefined,
      especificaciones: ''
    }]);
  };

  const updateProducto = (idx: number, field: keyof ProductoCotizacion, value: any) => {
    setProductos(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      if (field === 'nombre') {
        const found = productosDisponibles.find(mp => mp.nombre === value);
        return {
          ...p,
          nombre: value,
          categoria: found?.categoria?.nombre || p.categoria,
          producto_id: found?.id
        };
      }
      return { ...p, [field]: value };
    }));
  };

  const removeProducto = (idx: number) => setProductos(prev => prev.filter((_, i) => i !== idx));

  const toggleProveedor = (id: number) => {
    setSelectedProveedores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canNext = () => {
    if (currentStep === 0) return !!titulo && !!fechaLimite;
    if (currentStep === 1) return productos.length > 0 && productos.every(p => p.nombre && p.cantidad > 0);
    if (currentStep === 2) return selectedProveedores.length > 0;
    return true;
  };

  const handleEnviar = async () => {
    try {
      setIsSending(true);

      // Crear cotización
      const cotizacionData = {
        titulo,
        descripcion,
        fecha: today,
        fecha_limite: fechaLimite,
        productos: productos.map(p => ({
          producto_id: p.producto_id || null,
          nombre_producto: p.nombre,
          cantidad: p.cantidad,
          especificaciones: p.especificaciones || null
        })),
        proveedores: selectedProveedores
      };

      console.log('📤 Enviando cotización:', cotizacionData);

      const response = await api.post('/cotizaciones', cotizacionData);

      if (response.data.success) {
        const cotizacionId = response.data.data.id;

        // Enviar la cotización a los proveedores
        const envioResponse = await api.post(`/cotizaciones/${cotizacionId}/enviar`);

        if (envioResponse.data.success) {
          toast.success(`✅ Cotización enviada exitosamente a ${selectedProveedores.length} proveedores`);
          setTimeout(() => navigate('/cotizaciones'), 1500);
        } else {
          toast.warning('Cotización creada pero hubo problemas al enviar emails');
          setTimeout(() => navigate('/cotizaciones'), 1500);
        }
      }
    } catch (error: any) {
      console.error('❌ Error enviando cotización:', error);
      toast.error(error.response?.data?.message || 'Error al enviar la cotización');
    } finally {
      setIsSending(false);
    }
  };

  const filteredProvs = proveedoresDisponibles.filter(p =>
    p.nombre_empresa.toLowerCase().includes(searchProv.toLowerCase()) ||
    p.nombre_asesor.toLowerCase().includes(searchProv.toLowerCase()) ||
    p.nit.toLowerCase().includes(searchProv.toLowerCase())
  );

  // Debug
  useEffect(() => {
    if (currentStep === 2) {
      console.log('🔍 Paso 2 - Proveedores:', {
        total: proveedoresDisponibles.length,
        filtrados: filteredProvs.length,
        proveedores: proveedoresDisponibles,
        busqueda: searchProv
      });
    }
  }, [currentStep, proveedoresDisponibles, filteredProvs, searchProv]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">📄 Nueva Cotización</h1>
          <p className="text-sm text-muted-foreground">Crear solicitud de cotización para enviar a proveedores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/cotizaciones')} className="px-4 py-2 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-muted">Cancelar</button>
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Wizard Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${i < currentStep ? 'bg-primary text-primary-foreground' : i === currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i < currentStep ? <Check className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center ${i <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-5 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-card rounded-xl border border-border p-6">
            {currentStep === 0 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground">ℹ️ Información General</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Título de la Cotización *</label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      placeholder="Ej: Compra de alimentos para mascotas"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Fecha de Solicitud</label>
                      <input type="date" value={today} readOnly className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-sm text-muted-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Fecha Límite *</label>
                      <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Descripción / Observaciones</label>
                  <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="Detalles adicionales, condiciones especiales, urgencia..." className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">📦 Productos Solicitados</h2>
                  <button onClick={addProducto} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90">
                    <Plus className="w-4 h-4" /> Agregar Producto
                  </button>
                </div>
                {productos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay productos agregados</p>
                    <button onClick={addProducto} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                      <Plus className="w-4 h-4 inline mr-1" /> Agregar Primer Producto
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Producto</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Categoría</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-24">Cantidad</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-32">Unidad</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Especificaciones</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p, i) => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <select value={p.nombre} onChange={e => updateProducto(i, 'nombre', e.target.value)} className="w-full px-2 py-1.5 rounded border border-input bg-card text-sm text-foreground">
                                <option value="">Seleccionar producto...</option>
                                {productosDisponibles.map(mp => <option key={mp.id} value={mp.nombre}>{mp.nombre}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input value={p.categoria} readOnly className="w-full px-2 py-1.5 rounded border border-input bg-muted text-sm text-muted-foreground" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min={1} value={p.cantidad} onChange={e => updateProducto(i, 'cantidad', Number(e.target.value))} className="w-full px-2 py-1.5 rounded border border-input bg-card text-sm text-foreground" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={p.unidad} onChange={e => updateProducto(i, 'unidad', e.target.value)} className="w-full px-2 py-1.5 rounded border border-input bg-card text-sm text-foreground">
                                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={p.especificaciones || ''}
                                onChange={e => updateProducto(i, 'especificaciones', e.target.value)}
                                placeholder="Ej: color, tamaño..."
                                className="w-full px-2 py-1.5 rounded border border-input bg-card text-sm text-foreground"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => removeProducto(i)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">👥 Proveedores Invitados</h2>
                  <div className="relative">
                    <input value={searchProv} onChange={e => setSearchProv(e.target.value)} placeholder="Buscar proveedor..." className="pl-3 pr-4 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                {filteredProvs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay proveedores disponibles</p>
                    <p className="text-xs mt-2">Los proveedores deben estar registrados en el sistema</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProvs.map(p => {
                      const selected = selectedProveedores.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProveedor(p.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{p.nombre_empresa.charAt(0)}</div>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground text-sm block truncate">{p.nombre_empresa}</span>
                                <span className="text-xs text-muted-foreground block truncate">NIT: {p.nit}</span>
                              </div>
                            </div>
                            {selected && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">✓</span>}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-warning mb-2">
                            <Star className="w-3.5 h-3.5 fill-current" /> {p.calificacion && typeof p.calificacion === 'number' ? p.calificacion.toFixed(1) : 'N/A'}/5.0
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1 truncate"><Package className="w-3 h-3 shrink-0" /> {p.nombre_asesor}</div>
                            <div className="flex items-center gap-1 truncate"><Truck className="w-3 h-3 shrink-0" /> {p.ciudad}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground">✅ Revisión de Cotización</h2>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="font-medium">Título:</span> {titulo}</p>
                  <p className="text-sm"><span className="font-medium">Fecha Límite:</span> {new Date(fechaLimite).toLocaleDateString('es-CO')}</p>
                  {descripcion && <p className="text-sm"><span className="font-medium">Descripción:</span> {descripcion}</p>}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">📦 Productos Solicitados ({productos.length})</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    {productos.map(p => (
                      <div key={p.id} className="text-sm">
                        📦 <span className="font-medium">{p.nombre}</span> - {p.cantidad} {p.unidad}
                        {p.especificaciones && <span className="text-muted-foreground"> ({p.especificaciones})</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">👥 Proveedores Invitados ({selectedProveedores.length})</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    {selectedProveedores.map(id => {
                      const prov = proveedoresDisponibles.find(p => p.id === id);
                      return prov ? (
                        <div key={id} className="text-sm">
                          🏪 <span className="font-medium">{prov.nombre_empresa}</span>
                          <span className="text-muted-foreground ml-2">({prov.email_comercial})</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4 flex items-start gap-2">
                  <span className="text-info text-lg">ℹ️</span>
                  <p className="text-sm text-info">Al enviar esta cotización, se notificará automáticamente a todos los proveedores seleccionados por correo electrónico con un enlace único para que respondan.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={currentStep === 0 || isSending}
              className="px-5 py-2.5 rounded-lg border border-input bg-card text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canNext()}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center gap-1"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleEnviar}
                disabled={isSending}
                className="px-5 py-2.5 rounded-lg bg-success text-white text-sm font-medium hover:opacity-90 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Cotización
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewQuotationPage;
