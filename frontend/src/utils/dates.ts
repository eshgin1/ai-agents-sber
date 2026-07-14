import type { Obligation, Recurrence } from '@/types';

const MS_PER_DAY = 86_400_000;

export function daysUntil(dateStr: string, from = new Date()): number {
  const target = startOfDay(parseISO(dateStr));
  const today = startOfDay(from);
  return Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Accepts YYYY-MM-DD or ISO datetime */
export function parseISO(dateStr: string): Date {
  const dayPart = dateStr.slice(0, 10);
  const [y, m, day] = dayPart.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function formatDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
  };
  const symbol = symbols[currency] ?? currency;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currency === 'USD' || currency === 'EUR') {
    return `${symbol}${formatted}`;
  }
  return `${formatted} ${symbol}`;
}

export function formatDaysLeft(days: number): string {
  if (days < 0) return 'просрочено';
  if (days === 0) return 'сегодня';
  if (days === 1) return 'через 1 день';
  if (days >= 2 && days <= 4) return `через ${days} дня`;
  return `через ${days} дней`;
}

export type Urgency = 'urgent' | 'warn' | 'neutral';

export function getUrgency(days: number): Urgency {
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'warn';
  return 'neutral';
}

export function addRecurrence(dateStr: string, recurrence: Recurrence): string | null {
  if (!recurrence) return null;
  const d = parseISO(dateStr);
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  if (recurrence === 'quarterly') d.setMonth(d.getMonth() + 3);
  if (recurrence === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isInCurrentMonth(dateStr: string, ref = new Date()): boolean {
  const d = parseISO(dateStr);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export function computeMonthlyTotals(
  obligations: Obligation[],
): { currency: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const o of obligations) {
    if (o.status !== 'active') continue;
    if (!isInCurrentMonth(o.next_payment_date)) continue;
    map.set(o.currency, (map.get(o.currency) ?? 0) + o.amount);
  }
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function formatMonthlyTotals(
  totals: { currency: string; amount: number }[],
): string {
  if (totals.length === 0) return '0 ₽';
  return totals.map((t) => formatMoney(t.amount, t.currency)).join(' · ');
}

export function recurrenceLabel(recurrence: Recurrence): string {
  if (recurrence === 'monthly') return 'Ежемесячно';
  if (recurrence === 'quarterly') return 'Ежеквартально';
  if (recurrence === 'yearly') return 'Ежегодно';
  return 'Разовый';
}
