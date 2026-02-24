<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Proveedor extends Model
{
    use HasFactory;

    protected $table = 'proveedores';

    protected $fillable = [
        'nombre_empresa',
        'nit',
        'linea_producto',
        'ciudad',
        'direccion',
        'email_administrativo',
        'telefono_administrativo',
        'nombre_asesor',
        'cargo_asesor',
        'telefono_contacto',
        'email_comercial',
        'notas',
        'calificacion',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'calificacion' => 'decimal:2',
            'activo' => 'boolean',
        ];
    }

    /**
     * Relación con productos
     */
    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class);
    }

    /**
     * Relación con movimientos de inventario
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class);
    }

    /**
     * Relación con cotizaciones
     */
    public function cotizacionProveedores(): HasMany
    {
        return $this->hasMany(CotizacionProveedor::class);
    }

    /**
     * Scope para proveedores activos
     */
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }
}

