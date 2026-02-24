import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, FileSpreadsheet, Send, Upload, CheckCircle, AlertCircle, Calendar, Package, Building2, Plus, X } from 'lucide-react';
import cotizacionPublicaService, { CotizacionPublicaData, RespuestaProducto } from '@/services/cotizacionPublicaService';

const CotizacionProveedorPublicPage = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [cotizacion, setCotizacion] = useState<CotizacionPublicaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<'excel' | 'formulario'>('excel');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Estado para formulario web
  const [respuestas, setRespuestas] = useState<Record<number | string, RespuestaProducto>>({});
  const [notasGenerales, setNotasGenerales] = useState('');

  // Estado para productos extra
  const [productosExtra, setProductosExtra] = useState<Array<{ id: string; nombre: string }>>([]);
  const [contadorProductosExtra, setContadorProductosExtra] = useState(0);

  // Estado para upload de Excel
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (token) {
      cargarCotizacion();
    }
  }, [token]);

  const cargarCotizacion = async () => {
    try {
      setLoading(true);
      const response = await cotizacionPublicaService.obtenerCotizacion(token!);

      if (response.success) {
        setCotizacion(response.data);

        // Inicializar respuestas vacías
        const respuestasIniciales: Record<number, RespuestaProducto> = {};
        response.data.productos.forEach((producto: any) => {
          respuestasIniciales[producto.id] = {
            cotizacion_producto_id: producto.id,
            precio_unitario: 0,
            cantidad_disponible: producto.cantidad,
            tiempo_entrega_dias: 0,
            notas: '',
          };
        });
        setRespuestas(respuestasIniciales);

        if (response.data.ya_respondida) {
          setEnviado(true);
        }
      } else {
        setError(response.message || 'No se pudo cargar la cotización');
      }
    } catch (err: any) {
      console.error('Error al cargar cotización:', err);
      if (err.response?.status === 404) {
        setError('Enlace inválido o cotización no encontrada');
      } else if (err.response?.status === 410) {
        setError('Este enlace ha expirado. Por favor, contacte a El Galpón para solicitar uno nuevo.');
      } else {
        setError('Error al cargar la cotización. Por favor, intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarPlantilla = () => {
    if (!token) return;
    const url = cotizacionPublicaService.descargarPlantilla(token);
    window.open(url, '_blank');
    toast.success('Descargando plantilla Excel...');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleArchivoSeleccionado(e.dataTransfer.files[0]);
    }
  };

  const handleArchivoSeleccionado = (file: File) => {
    const extensionesValidas = ['xlsx', 'xls'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !extensionesValidas.includes(extension)) {
      toast.error('Por favor, seleccione un archivo Excel válido (.xlsx o .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 10MB');
      return;
    }

    setArchivoExcel(file);
    toast.success(`Archivo "${file.name}" seleccionado`);
  };

  const handleSubirExcel = async () => {
    if (!archivoExcel || !token) return;

    try {
      setEnviando(true);
      const response = await cotizacionPublicaService.subirExcel(token, archivoExcel, notasGenerales);

      if (response.success) {
        toast.success(response.message);
        setEnviado(true);
      } else {
        toast.error(response.message || 'Error al enviar la cotización');
        if (response.errores && response.errores.length > 0) {
          response.errores.forEach((error: string) => {
            toast.error(error);
          });
        }
      }
    } catch (err: any) {
      console.error('Error al subir Excel:', err);
      toast.error(err.response?.data?.message || 'Error al procesar el archivo');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarFormulario = async () => {
    if (!token) return;

    // Validar que todos los precios estén llenos
    const respuestasArray = Object.values(respuestas);
    const faltanPrecios = respuestasArray.some(r => !r.precio_unitario || r.precio_unitario <= 0);

    if (faltanPrecios) {
      toast.error('Por favor, complete el precio unitario de todos los productos');
      return;
    }

    // Validar que los productos extra tengan nombre
    const productosExtraInvalidos = respuestasArray.filter(r =>
      r.es_producto_extra && (!r.nombre_producto_extra || r.nombre_producto_extra.trim() === '')
    );

    if (productosExtraInvalidos.length > 0) {
      toast.error('Por favor, complete el nombre de todos los productos extra');
      return;
    }

    try {
      setEnviando(true);
      const response = await cotizacionPublicaService.enviarRespuestaWeb(
        token,
        respuestasArray,
        notasGenerales
      );

      if (response.success) {
        toast.success(response.message);
        setEnviado(true);
      } else {
        toast.error(response.message || 'Error al enviar la cotización');
      }
    } catch (err: any) {
      console.error('Error al enviar formulario:', err);
      toast.error(err.response?.data?.message || 'Error al enviar la respuesta');
    } finally {
      setEnviando(false);
    }
  };

  const actualizarRespuesta = (productoId: number | string, campo: keyof RespuestaProducto, valor: any) => {
    setRespuestas(prev => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        [campo]: valor,
      },
    }));
  };

  const agregarProductoExtra = () => {
    const nuevoId = `extra_${contadorProductosExtra}`;
    setContadorProductosExtra(prev => prev + 1);

    setProductosExtra(prev => [...prev, { id: nuevoId, nombre: '' }]);

    setRespuestas(prev => ({
      ...prev,
      [nuevoId]: {
        cotizacion_producto_id: null,
        precio_unitario: 0,
        cantidad_disponible: 1,
        tiempo_entrega_dias: 0,
        notas: '',
        es_producto_extra: true,
        nombre_producto_extra: '',
      },
    }));

    toast.success('Producto extra agregado');
  };

  const eliminarProductoExtra = (id: string) => {
    setProductosExtra(prev => prev.filter(p => p.id !== id));
    setRespuestas(prev => {
      const nuevo = { ...prev };
      delete nuevo[id];
      return nuevo;
    });
    toast.success('Producto extra eliminado');
  };

  const actualizarNombreProductoExtra = (id: string, nombre: string) => {
    setProductosExtra(prev => prev.map(p => p.id === id ? { ...p, nombre } : p));
    actualizarRespuesta(id, 'nombre_producto_extra', nombre);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-destructive/10 p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-2xl p-8 text-center border border-destructive/20">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <a
            href="https://elgalpon-alcala.com"
            className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Contactar a El Galpón
          </a>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-success/5 to-success/10 p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-2xl p-8 text-center border border-success/20">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">¡Cotización Enviada!</h1>
          <p className="text-muted-foreground mb-6">
            Su respuesta ha sido registrada exitosamente. El equipo de El Galpón la revisará pronto.
          </p>
          <p className="text-sm text-muted-foreground">
            Gracias por su tiempo y colaboración.
          </p>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-xl shadow-xl p-6 mb-6 border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">🌾 El Galpón</h1>
              <p className="text-lg text-muted-foreground">Solicitud de Cotización</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-lg font-mono font-bold">
                {cotizacion.cotizacion.numero}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-semibold text-foreground">{cotizacion.proveedor.nombre_empresa}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Productos</p>
                <p className="font-semibold text-foreground">{cotizacion.productos.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha límite</p>
                <p className="font-semibold text-foreground">
                  {new Date(cotizacion.cotizacion.fecha_limite).toLocaleDateString('es-CO')}
                </p>
              </div>
            </div>
          </div>

          {cotizacion.cotizacion.descripcion && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Descripción:</p>
              <p className="text-foreground">{cotizacion.cotizacion.descripcion}</p>
            </div>
          )}
        </div>

        {/* Productos Solicitados */}
        <div className="bg-card rounded-xl shadow-xl p-6 mb-6 border">
          <h2 className="text-xl font-bold text-foreground mb-4">📦 Productos Solicitados</h2>
          <div className="space-y-3">
            {cotizacion.productos.map((producto, index) => (
              <div key={producto.id} className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">Cantidad: {producto.cantidad} unidades</p>
                    {producto.especificaciones && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Especificaciones: {producto.especificaciones}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selector de Método */}
        <div className="bg-card rounded-xl shadow-xl p-6 mb-6 border">
          <h2 className="text-xl font-bold text-foreground mb-4">📝 Método de Respuesta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMetodo('excel')}
              className={`p-6 rounded-lg border-2 transition text-left ${
                metodo === 'excel'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <FileSpreadsheet className={`w-8 h-8 mb-3 ${metodo === 'excel' ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="font-bold text-foreground mb-2">Archivo Excel</h3>
              <p className="text-sm text-muted-foreground">
                Descargue la plantilla, complétela y súbala de vuelta
              </p>
            </button>

            <button
              onClick={() => setMetodo('formulario')}
              className={`p-6 rounded-lg border-2 transition text-left ${
                metodo === 'formulario'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Send className={`w-8 h-8 mb-3 ${metodo === 'formulario' ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="font-bold text-foreground mb-2">Formulario Web</h3>
              <p className="text-sm text-muted-foreground">
                Complete los precios directamente en esta página
              </p>
            </button>
          </div>
        </div>

        {/* Método Excel */}
        {metodo === 'excel' && (
          <div className="bg-card rounded-xl shadow-xl p-6 mb-6 border">
            <h2 className="text-xl font-bold text-foreground mb-4">📥 Subir Archivo Excel</h2>

            <div className="mb-6">
              <button
                onClick={handleDescargarPlantilla}
                className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Descargar Plantilla Excel
              </button>
              <p className="text-sm text-muted-foreground mt-2">
                Complete solo las columnas amarillas con sus precios y condiciones
              </p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {archivoExcel ? (
                <div className="space-y-3">
                  <CheckCircle className="w-12 h-12 text-success mx-auto" />
                  <p className="font-semibold text-foreground">{archivoExcel.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(archivoExcel.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setArchivoExcel(null)}
                    className="text-sm text-destructive hover:underline"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-foreground font-semibold">
                    Arrastre su archivo aquí o haga clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Archivos .xlsx o .xls (máximo 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleArchivoSeleccionado(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
                  >
                    Seleccionar Archivo
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Notas Generales (Opcional)
              </label>
              <textarea
                value={notasGenerales}
                onChange={(e) => setNotasGenerales(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                rows={3}
                placeholder="Ej: Pago a 30 días, descuento por volumen disponible..."
              />
            </div>

            <button
              onClick={handleSubirExcel}
              disabled={!archivoExcel || enviando}
              className="w-full mt-6 px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Cotización
                </>
              )}
            </button>
          </div>
        )}

        {/* Método Formulario */}
        {metodo === 'formulario' && (
          <div className="bg-card rounded-xl shadow-xl p-6 mb-6 border">
            <h2 className="text-xl font-bold text-foreground mb-4">📝 Formulario de Respuesta</h2>

            <div className="space-y-6">
              {cotizacion.productos.map((producto, index) => (
                <div key={producto.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">{producto.nombre}</h3>
                      <p className="text-sm text-muted-foreground">Cantidad solicitada: {producto.cantidad}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Precio Unitario (COP) <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={respuestas[producto.id]?.precio_unitario || ''}
                        onChange={(e) => actualizarRespuesta(producto.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Ej: 45000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Cantidad Disponible
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={respuestas[producto.id]?.cantidad_disponible || ''}
                        onChange={(e) => actualizarRespuesta(producto.id, 'cantidad_disponible', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Ej: 20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tiempo de Entrega (días)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={respuestas[producto.id]?.tiempo_entrega_dias || ''}
                        onChange={(e) => actualizarRespuesta(producto.id, 'tiempo_entrega_dias', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Ej: 5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Observaciones
                      </label>
                      <input
                        type="text"
                        value={respuestas[producto.id]?.notas || ''}
                        onChange={(e) => actualizarRespuesta(producto.id, 'notas', e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Ej: Disponible inmediatamente"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Sección de Productos Extra */}
              <div className="border-t-2 border-primary/20 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      Productos Extra
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Agregue productos adicionales que desee ofrecer (opcionales)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={agregarProductoExtra}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Producto
                  </button>
                </div>

                {productosExtra.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No hay productos extra agregados
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use el botón "Agregar Producto" para ofrecer productos adicionales
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productosExtra.map((productoExtra, index) => (
                      <div key={productoExtra.id} className="p-4 border-2 border-warning/30 bg-warning/5 rounded-lg relative">
                        <div className="absolute -top-3 left-3 px-3 py-1 bg-warning text-warning-foreground rounded-full text-xs font-bold">
                          PRODUCTO EXTRA
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarProductoExtra(productoExtra.id)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition"
                          title="Eliminar producto extra"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-3 mb-4 mt-2">
                          <span className="flex-shrink-0 w-8 h-8 bg-warning text-warning-foreground rounded-full flex items-center justify-center font-bold text-sm">
                            +{index + 1}
                          </span>
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Nombre del Producto <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="text"
                              value={respuestas[productoExtra.id]?.nombre_producto_extra || ''}
                              onChange={(e) => actualizarNombreProductoExtra(productoExtra.id, e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning bg-background text-foreground"
                              placeholder="Ej: Fertilizante Orgánico Premium 50kg"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Precio Unitario (COP) <span className="text-destructive">*</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={respuestas[productoExtra.id]?.precio_unitario || ''}
                              onChange={(e) => actualizarRespuesta(productoExtra.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning bg-background text-foreground"
                              placeholder="Ej: 50000"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Cantidad Disponible
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={respuestas[productoExtra.id]?.cantidad_disponible || ''}
                              onChange={(e) => actualizarRespuesta(productoExtra.id, 'cantidad_disponible', parseInt(e.target.value) || 1)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning bg-background text-foreground"
                              placeholder="Ej: 100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Tiempo de Entrega (días)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={respuestas[productoExtra.id]?.tiempo_entrega_dias || ''}
                              onChange={(e) => actualizarRespuesta(productoExtra.id, 'tiempo_entrega_dias', parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning bg-background text-foreground"
                              placeholder="Ej: 5"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Observaciones
                            </label>
                            <input
                              type="text"
                              value={respuestas[productoExtra.id]?.notas || ''}
                              onChange={(e) => actualizarRespuesta(productoExtra.id, 'notas', e.target.value)}
                              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-warning bg-background text-foreground"
                              placeholder="Ej: Producto en oferta especial"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notas Generales (Opcional)
                </label>
                <textarea
                  value={notasGenerales}
                  onChange={(e) => setNotasGenerales(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  rows={3}
                  placeholder="Ej: Pago a 30 días, descuento por volumen disponible..."
                />
              </div>

              <button
                onClick={handleEnviarFormulario}
                disabled={enviando}
                className="w-full px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Cotización
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>El Galpón - Agropecuaria y Veterinaria</p>
          <p>Alcalá, Valle del Cauca, Colombia</p>
        </div>
      </div>
    </div>
  );
};

export default CotizacionProveedorPublicPage;

