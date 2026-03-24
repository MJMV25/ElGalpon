<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .highlight { color: #10B981; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Bienvenido a El Galpon</h1>
        <p>Agropecuaria y Veterinaria</p>
    </div>
    <div class="content">
        <p>Hola <strong>{{ $nombreUsuario }}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente en el sistema de gestion de El Galpon.</p>

        <div class="info-box">
            <h3>Informacion de tu cuenta:</h3>
            <p><strong>Email:</strong> {{ $email }}</p>
            <p><strong>Contrasena temporal:</strong> {{ $passwordTemporal }}</p>
            <p><strong>Rol:</strong> <span class="highlight">{{ ucfirst($rol) }}</span></p>
            <p><strong>Enlace de primer acceso:</strong><br><a href="{{ $primerAccesoUrl }}">{{ $primerAccesoUrl }}</a></p>
            <p><strong>Vence:</strong> {{ $expiraEn }}</p>
        </div>

        <p>Para iniciar sesion por primera vez, usa el enlace seguro anterior. Luego ingresa tu email y contrasena temporal.</p>
        <p>Te recomendamos cambiar la contrasena cuando ingreses por primera vez.</p>
        <p>Si el enlace expiro, solicita al administrador que regenere el acceso.</p>

        <p>Bienvenido al equipo.</p>
    </div>
    <div class="footer">
        <p>El Galpon - Alcala, Valle del Cauca, Colombia</p>
        <p>Este es un correo automatico, por favor no respondas.</p>
    </div>
</body>
</html>
