<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoInventario extends Model
{
    use HasFactory;

    protected $table = 'movimientos_inventario';

    protected $fillable = [
        'producto_id',
        'user_id',
        'proveedor_id',
        'tipo',
        'cantidad',
        'stock_anterior',
        'stock_nuevo',
        'precio_compra',
        'lote',
        'motivo',
        'recibido_por',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'precio_compra' => 'decimal:2',
        ];
    }

    /**
     * Relación con producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Relación con usuario
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con proveedor
     */
    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    /**
     * Scope para entradas
     */
    public function scopeEntradas($query)
    {
        return $query->where('tipo', 'entrada');
    }

    /**
     * Scope para salidas
     */
    public function scopeSalidas($query)
    {
        return $query->where('tipo', 'salida');
    }

    /**
     * Scope para ajustes
     */
    public function scopeAjustes($query)
    {
        return $query->where('tipo', 'ajuste');
    }

    /**
     * Scope para movimientos del día
     */
    public function scopeHoy($query)
    {
        return $query->whereDate('created_at', today());
    }
}
