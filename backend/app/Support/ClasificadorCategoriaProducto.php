<?php

namespace App\Support;

use App\Models\Categoria;
use Illuminate\Support\Str;

class ClasificadorCategoriaProducto
{
    /**
     * @param array<string,Categoria> $categorias
     * @return array{0: Categoria, 1: string}
     */
    public static function resolver(string $nombre, array $categorias): array
    {
        $texto = Str::lower(Str::ascii($nombre));

        $scores = [
            'alimentos' => 0,
            'medicamentos' => 0,
            'suplementos' => 0,
            'insumos' => 0,
            'accesorios' => 0,
        ];

        self::sumarKeywords($texto, $scores['alimentos'], [
            'dog chow', 'pro plan', 'proplan', 'agility', 'pedigree', 'whiskas', 'cat chow',
            'gato', 'felino', 'perro', 'canino', 'cachorro', 'concentrado', 'alimento',
            'balanceado', 'ganado', 'equino', 'bovino', 'porcino', 'aves', 'pez', 'peces',
        ], 4);

        self::sumarKeywords($texto, $scores['medicamentos'], [
            'ivermectina', 'vacuna', 'antibiot', 'antiparas', 'antihongo', 'antifung',
            'adrenalina', 'dexamet', 'dipirona', 'penicil', 'amoxicil', 'gentamic',
            'yodo', 'inyectable', 'jeringa', 'aguja', 'cateter', 'suero', 'esteril',
            'ampolla', 'ampolleta', 'tableta', 'tab', 'capsula', 'caps',
            'jarabe', 'suspension', 'solucion', 'pomada', 'crema', 'unguento',
        ], 5);

        self::sumarKeywords($texto, $scores['suplementos'], [
            'vitamina', 'suplement', 'mineral', 'calcio', 'omega', 'aminoacido',
            'probiotico', 'nutraceutico', 'electrolito',
        ], 4);

        self::sumarKeywords($texto, $scores['insumos'], [
            'abono', 'fertiliz', 'semilla', 'herbicida', 'insecticida', 'fungicida',
            'alambre', 'pvc', 'adaptador', 'aislador', 'manguera', 'tornillo',
            'grapa', 'poste', 'guadana', 'fumig', 'galon', 'bulto', 'kilogr', 'kilo',
            'kg', 'mts', 'metro',
        ], 4);

        self::sumarKeywords($texto, $scores['accesorios'], [
            'collar', 'correa', 'cama', 'juguete', 'transportadora', 'comedero',
            'bebedero', 'cepillo', 'casa', 'bozal', 'arnes', 'ropa', 'biberon', 'acuario',
        ], 4);

        if (preg_match('/\b\d+\s*(mg|ml|cc|ui)\b/', $texto)) {
            $scores['medicamentos'] += 2;
        }
        if (preg_match('/\b(tab|caps|jarabe|suspension|solucion|pomada|crema|inyectable)\b/', $texto)) {
            $scores['medicamentos'] += 3;
        }

        $prioridad = ['medicamentos', 'insumos', 'alimentos', 'accesorios', 'suplementos'];
        $categoriaGanadora = 'insumos';
        $mejor = -1;

        foreach ($prioridad as $cat) {
            if ($scores[$cat] > $mejor) {
                $mejor = $scores[$cat];
                $categoriaGanadora = $cat;
            }
        }

        if ($mejor <= 0) {
            $categoriaGanadora = 'insumos';
        }

        $subcategoria = self::resolverSubcategoria($texto, $categoriaGanadora);
        return [$categorias[$categoriaGanadora], $subcategoria];
    }

    private static function sumarKeywords(string $texto, int &$score, array $keywords, int $peso): void
    {
        foreach ($keywords as $keyword) {
            if (Str::contains($texto, $keyword)) {
                $score += $peso;
            }
        }
    }

    private static function resolverSubcategoria(string $texto, string $categoria): string
    {
        if ($categoria === 'alimentos') {
            if (Str::contains($texto, ['gato', 'felino', 'whiskas'])) return 'Gatos';
            if (Str::contains($texto, ['perro', 'canino', 'cachorro', 'dog chow'])) return 'Perros';
            if (Str::contains($texto, ['aves', 'pollo', 'gallina'])) return 'Aves';
            if (Str::contains($texto, ['pez', 'peces', 'acuario'])) return 'Peces';
            if (Str::contains($texto, ['equino', 'caballo'])) return 'Equinos';
            if (Str::contains($texto, ['bovino', 'ganado', 'vaca'])) return 'Bovinos';
            if (Str::contains($texto, ['porcino', 'cerdo'])) return 'Porcinos';
            return 'Perros';
        }

        if ($categoria === 'medicamentos') {
            if (Str::contains($texto, ['vacuna'])) return 'Vacunas';
            if (Str::contains($texto, ['antiparas', 'ivermectina'])) return 'Antiparasitarios';
            if (Str::contains($texto, ['antibiot', 'amoxicil', 'penicil', 'gentamic'])) return 'Antibióticos';
            if (Str::contains($texto, ['antiinflam', 'dexamet'])) return 'Antiinflamatorios';
            if (Str::contains($texto, ['analges', 'dipirona'])) return 'Analgésicos';
            if (Str::contains($texto, ['pomada', 'crema', 'yodo', 'shampoo', 'derm'])) return 'Dermatológicos';
            return 'Antiparasitarios';
        }

        if ($categoria === 'suplementos') {
            if (Str::contains($texto, ['vitamina'])) return 'Vitaminas';
            if (Str::contains($texto, ['mineral', 'calcio'])) return 'Minerales';
            if (Str::contains($texto, ['probiot'])) return 'Probióticos';
            if (Str::contains($texto, ['omega', 'graso'])) return 'Ácidos Grasos';
            if (Str::contains($texto, ['aminoacido'])) return 'Aminoácidos';
            return 'Vitaminas';
        }

        if ($categoria === 'insumos') {
            if (Str::contains($texto, ['fertiliz', 'abono', 'urea', 'triple 15', 'dap'])) return 'Fertilizantes';
            if (Str::contains($texto, ['semilla'])) return 'Semillas';
            if (Str::contains($texto, ['herbicida'])) return 'Herbicidas';
            if (Str::contains($texto, ['insecticida', 'agita'])) return 'Insecticidas';
            if (Str::contains($texto, ['fungicida'])) return 'Fungicidas';
            return 'Herramientas';
        }

        return 'Collares';
    }
}

