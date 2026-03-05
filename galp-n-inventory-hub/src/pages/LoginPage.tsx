import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { MapPin, CheckCircle2, ArrowRight, Mail, Lock, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  const { login, verifyLoginCode, resetLoginFlow, pendingEmail, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);

    if (result.success) {
      toast.success(result.message);
      setStep('otp');
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await verifyLoginCode(codigo);

    if (result.success) {
      toast.success('Identidad validada. Bienvenido.');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setCodigo('');
    setPassword('');
    resetLoginFlow();
  };

  const features = [
    'Control total de inventario',
    'Reportes en tiempo real',
    'Gestion de usuarios y permisos',
    'Alertas de stock automaticas',
  ];

  const badges = [
    { emoji: 'Mascotas', label: 'Mascotas' },
    { emoji: 'Ganaderia', label: 'Ganaderia' },
    { emoji: 'Agricultura', label: 'Agricultura' },
    { emoji: 'Veterinaria', label: 'Veterinaria' },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-primary/20" />
        <div className="absolute -top-16 -right-10 w-60 h-60 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-8 left-8 w-44 h-44 rounded-full bg-warning/15 blur-3xl" />
        <div className="relative z-10">
          <img
            src="/logo-galpon.png"
            alt="Logo El Galpon"
            className="w-28 h-28 object-contain mb-5 drop-shadow-sm"
          />
          <h1 className="text-3xl font-bold text-sidebar-primary-foreground mb-1">El Galpon</h1>
          <p className="text-sidebar-muted text-lg mb-8">Sistema de Gestion de Inventario</p>

          <div className="flex items-center gap-2 text-sidebar-foreground mb-6">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm">Calle 5 #4-33 - Alcala, Valle del Cauca, Colombia</span>
          </div>

          <div className="space-y-3 mb-8">
            {features.map(f => (
              <div key={f} className="flex items-center gap-3 text-sidebar-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <span key={b.label} className="px-3 py-1.5 rounded-full bg-sidebar-accent text-sidebar-foreground text-sm">
                {b.emoji}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-transparent">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 bg-card/95 border border-border rounded-2xl p-6 shadow-lg">
            <img
              src="/logo-galpon.png"
              alt="Logo El Galpon"
              className="lg:hidden w-20 h-20 object-contain mx-auto mb-3"
            />
            <h2 className="text-2xl font-bold text-foreground">
              {step === 'credentials' ? 'Iniciar Sesion' : 'Verificacion de Identidad'}
            </h2>
            <p className="text-primary mt-1">
              {step === 'credentials'
                ? 'Ingresa tu correo y contrasena'
                : `Ingresa el codigo enviado a ${pendingEmail || email}`}
            </p>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-5 bg-card/95 border border-border rounded-2xl p-6 shadow-sm">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                  <Mail className="w-4 h-4" /> Correo Electronico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                  <Lock className="w-4 h-4" /> Contrasena
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contrasena"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando credenciales...
                  </>
                ) : (
                  <>
                    Enviar Codigo <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5 bg-card/95 border border-border rounded-2xl p-6 shadow-sm">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                  <KeyRound className="w-4 h-4" /> Codigo de verificacion
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">El codigo expira en 10 minutos</p>
              </div>

              <button
                type="submit"
                disabled={isLoading || codigo.length !== 6}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando codigo...
                  </>
                ) : (
                  <>
                    Ingresar al Sistema <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg border border-input text-foreground font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </form>
          )}

          <div className="mt-6 p-4 rounded-xl bg-muted/80 border border-border text-center">
            <p className="text-sm text-muted-foreground">Sistema de acceso seguro con doble verificacion</p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo usuarios autorizados pueden acceder al sistema.
              <br />
              Contacta al administrador si necesitas una cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
