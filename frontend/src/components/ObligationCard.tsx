import type { Obligation } from '@/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types';
import {
  daysUntil,
  formatDate,
  formatMoney,
  getUrgency,
} from '@/utils/dates';

interface Props {
  obligation: Obligation;
  exiting?: boolean;
  paySuccess?: boolean;
  onOpen: () => void;
}

export function ObligationCard({
  obligation: o,
  exiting,
  paySuccess,
  onOpen,
}: Props) {
  const days = daysUntil(o.next_payment_date);
  const urgency = o.status === 'active' ? getUrgency(days) : 'neutral';

  const urgencyClass =
    urgency === 'urgent'
      ? 'bg-urgent-soft text-urgent'
      : urgency === 'warn'
        ? 'bg-warn-soft text-warn'
        : 'bg-border/70 text-ink-muted';

  const urgencyLabel =
    o.status !== 'active'
      ? STATUS_LABELS[o.status]
      : days <= 3
        ? `Срочно · ${days < 0 ? 'просрочено' : days === 0 ? 'сегодня' : `${days} дн.`}`
        : days <= 7
          ? `Скоро · ${days} дн.`
          : `${days} дн.`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        'card-enter group w-full rounded-2xl border border-border bg-surface-elevated p-4 text-left shadow-sm transition',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        exiting ? 'card-exit pointer-events-none' : '',
        paySuccess ? 'pay-success ring-2 ring-sse-ok/40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          {CATEGORY_LABELS[o.category] ?? o.category}
        </span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${urgencyClass}`}>
          {urgencyLabel}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-ink group-hover:text-accent">
        {o.title}
      </h3>

      <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
        {formatMoney(o.amount, o.currency)}
      </p>

      <div className="mt-3 flex items-center justify-between text-sm text-ink-muted">
        <span>{formatDate(o.next_payment_date)}</span>
        <span
          className={
            o.status === 'cancelled'
              ? 'text-urgent'
              : o.status === 'expired'
                ? 'text-warn'
                : ''
          }
        >
          {STATUS_LABELS[o.status] ?? o.status}
        </span>
      </div>
    </button>
  );
}
