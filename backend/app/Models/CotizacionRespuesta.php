<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CotizacionRespuesta extends Model
{
    use HasFactory;

    protected $table = 'cotizacion_respuestas';

    protected $fillable = [
        'cotizacion_proveedor_id',
        'cotizacion_producto_id',
        'precio_unitario',
        'cantidad_disponible',
        'tiempo_entrega_dias',
        'notas',
        'es_producto_extra',
        'nombre_producto_extra',
    ];

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
            'es_producto_extra' => 'boolean',
        ];
    }

    /**
     * Relación con cotización-proveedor
     */
    public function cotizacionProveedor(): BelongsTo
    {
        return $this->belongsTo(CotizacionProveedor::class);
    }

    /**
     * Relación con cotización-producto
     */
    public function cotizacionProducto(): BelongsTo
    {
        return $this->belongsTo(CotizacionProducto::class);
    }
}

