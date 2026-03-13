<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta del sistema</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f8fafc; color:#0f172a; padding:16px;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:20px;">
        <h2 style="margin:0 0 8px;">{{ $titulo }}</h2>
        <p style="margin:0 0 4px;"><strong>Nivel:</strong> {{ strtoupper($nivel) }}</p>
        <p style="margin:0 0 16px;">{{ $mensaje }}</p>

        @if(!empty($meta))
            <h4 style="margin:0 0 8px;">Contexto</h4>
            <ul style="margin:0; padding-left:18px;">
                @foreach($meta as $key => $value)
                    <li><strong>{{ $key }}:</strong> {{ is_scalar($value) ? $value : json_encode($value) }}</li>
                @endforeach
            </ul>
        @endif

        <p style="margin-top:16px; color:#64748b; font-size:12px;">
            Generado automáticamente por El Galpón - {{ now()->format('Y-m-d H:i:s') }}
        </p>
    </div>
</body>
</html>

