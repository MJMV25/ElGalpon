export const formatNumber = (num: number): string => {
  return Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatCurrency = (num: number): string => {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${formatNumber(num)}`;
  return `$${num}`;
};

export const formatCurrencyFull = (num: number | null | undefined): string => {
  return `$${formatNumber(Number(num || 0))}`;
};

export const getStockStatus = (stock: number, stockMin: number) => {
  if (stock <= stockMin * 0.3) return { status: 'critical' as const, label: 'Crítico' };
  if (stock <= stockMin) return { status: 'low' as const, label: 'Bajo' };
  return { status: 'normal' as const, label: 'Normal' };
};

export const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export const getCategoryEmoji = (cat: string, icono?: string | null): string => {
  const normalizedCat = (cat || '').toLowerCase();
  const iconMap: Record<string, string> = {
    'fa-bone': '🐕',
    'fa-pills': '💊',
    'fa-capsules': '💪',
    'fa-tractor': '🌾',
    'fa-paw': '🎀',
    'fa-file-import': '📦',
  };
  const emojis: Record<string, string> = {
    alimentos: '🐕',
    medicamentos: '💊',
    suplementos: '💪',
    insumos: '🌾',
    accesorios: '🎀',
  };

  if (icono && icono.trim()) {
    const mapped = iconMap[icono.trim()];
    if (mapped) return mapped;
  }
  const key = Object.keys(emojis).find(k => normalizedCat.includes(k)) || normalizedCat;
  return emojis[key] || '📦';
};
