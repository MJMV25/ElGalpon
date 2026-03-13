<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nombre',
        'email',
        'password',
        'rol',
        'activo',
        'estado_cuenta',
        'ultimo_acceso',
        'ip_ultimo_acceso',
        'creado_por',
        'primer_acceso_token',
        'primer_acceso_expira_en',
        'primer_acceso_completado_en',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'primer_acceso_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
            'ultimo_acceso' => 'datetime',
            'primer_acceso_expira_en' => 'datetime',
            'primer_acceso_completado_en' => 'datetime',
        ];
    }

    /**
     * Verificar si el usuario es administrador
     */
    public function esAdmin(): bool
    {
        return $this->rol === 'admin';
    }

    /**
     * Verificar si el usuario es empleado
     */
    public function esEmpleado(): bool
    {
        return $this->rol === 'empleado';
    }

    /**
     * Scope para usuarios activos
     */
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(self::class, 'creado_por');
    }
}
