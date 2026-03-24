<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .header { margin-bottom: 14px; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #d8d8d8; padding: 6px 7px; vertical-align: top; }
        th { background: #1f4e78; color: #fff; font-size: 10px; text-align: left; }
        tr:nth-child(even) td { background: #fafafa; }
        .summary { margin-top: 14px; width: 45%; }
        .summary td { border: 1px solid #d8d8d8; padding: 6px 7px; }
        .summary .key { background: #f3f4f6; font-weight: bold; width: 60%; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">{{ $report['business_name'] }}</div>
        <div class="subtitle">{{ $report['title'] }}</div>
        <div class="subtitle">Generado: {{ $report['generated_at']->format('Y-m-d H:i:s') }}</div>
        <div class="subtitle">Usuario: {{ $report['generated_by'] }}</div>
    </div>

    <table>
        <thead>
            <tr>
                @foreach($report['columns'] as $column)
                    <th>{{ $column['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rowsForPdf as $row)
                <tr>
                    @foreach($report['columns'] as $column)
                        <td>{{ $row[$column['key']] ?? '-' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($report['columns']) }}">Sin datos para mostrar.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="summary">
        @foreach($summaryForPdf as $item)
            <tr>
                <td class="key">{{ $item['label'] }}</td>
                <td>{{ $item['value'] }}</td>
            </tr>
        @endforeach
    </table>
</body>
</html>
