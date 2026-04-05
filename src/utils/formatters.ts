export function formatCurrency(amount: number, symbol = '₺'): string {
  return `${symbol}${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatPercent(value: number): string {
  return `%${value.toFixed(1)}`;
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const r = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `SP-${y}${m}${d}-${r}`;
}

export const paymentStatusLabels: Record<string, string> = {
  beklemede: 'Beklemede',
  odendi: 'Ödendi',
  iptal: 'İptal',
};

export const orderStatusLabels: Record<string, string> = {
  yeni: 'Yeni',
  hazirlaniyor: 'Hazırlanıyor',
  kargoda: 'Kargoda',
  teslim_edildi: 'Teslim Edildi',
  iptal: 'İptal',
};

export const paymentStatusColors: Record<string, string> = {
  beklemede: 'bg-warning/10 text-warning',
  odendi: 'bg-success/10 text-success',
  iptal: 'bg-destructive/10 text-destructive',
};

export const orderStatusColors: Record<string, string> = {
  yeni: 'bg-info/10 text-info',
  hazirlaniyor: 'bg-warning/10 text-warning',
  kargoda: 'bg-primary/10 text-primary',
  teslim_edildi: 'bg-success/10 text-success',
  iptal: 'bg-destructive/10 text-destructive',
};
