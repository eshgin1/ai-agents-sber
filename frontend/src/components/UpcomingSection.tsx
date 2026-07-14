import { useState } from 'react';
import type { RenewalAlert } from '@/types';
import { daysUntil, formatDaysLeft, formatMoney } from '@/utils/dates';

interface Props {
  alerts: RenewalAlert[];
  onCancel: (id: string) => void | Promise<void>;
  onOpen: (id: string) => void;
}

export function UpcomingSection({ alerts, onCancel, onOpen }: Props) {
  const [busyIds, setBusyIds] = useState<string[]>([]);

  if (alerts.length === 0) return null;

  const handleCancel = async (id: string) => {
    if (busyIds.includes(id)) return;
    setBusyIds((prev) => [...prev, id]);
    try {
      await onCancel(id);
    } finally {
      setBusyIds((prev) => prev.filter((x) => x !== id));
    }
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Скоро спишут</h2>
        <p className="text-sm text-ink-muted">Автопродление в ближайшие 7 дней</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((a) => {
          const days = daysUntil(a.next_payment_date);
          const busy = busyIds.includes(a.id);
          return (
            <article
              key={a.id}
              className="card-enter relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/90 to-accent p-4 text-white shadow-md"
            >
              <button
                type="button"
                onClick={() => onOpen(a.id)}
                className="w-full text-left"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Подписка
                </p>
                <h3 className="mt-1 text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatMoney(a.amount, a.currency)}
                </p>
                <p className="mt-1 text-sm text-white/80">{formatDaysLeft(days)}</p>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleCancel(a.id);
                }}
                className="mt-4 w-full rounded-xl bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
              >
                {busy ? 'Отмена…' : 'Отменить'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
